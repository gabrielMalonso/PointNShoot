import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const contentScriptPath = fileURLToPath(new URL("../../dist/content/boot.js", import.meta.url));
const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

test.beforeEach(async ({ page }) => {
  test.skip(!existsSync(contentScriptPath), "Run pnpm build before pnpm e2e.");

  await page.addInitScript((imageDataUrl) => {
    const browserWindow = window as any;
    const listeners: unknown[] = [];
    browserWindow.__lastPnsRequest = null;
    browserWindow.__pnsRequests = [];
    browserWindow.__pnsResponses = [];
    browserWindow.__allowImageClipboard = false;
    browserWindow.__clipboardWrites = [];
    browserWindow.__clipboardText = "";
    browserWindow.ClipboardItem = class ClipboardItem {
      readonly items: Record<string, Blob>;

      constructor(items: Record<string, Blob>) {
        this.items = items;
      }
    };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        async write(items: unknown[]) {
          if (!browserWindow.__allowImageClipboard) {
            throw new DOMException("Document is not focused.", "NotAllowedError");
          }
          browserWindow.__clipboardWrites.push(items);
        },
        async writeText(text: string) {
          browserWindow.__clipboardText = text;
        },
      },
    });
    browserWindow.chrome = {
      runtime: {
        onMessage: {
          addListener(listener: unknown) {
            listeners.push(listener);
          },
          removeListener(listener: unknown) {
            const index = listeners.indexOf(listener);
            if (index !== -1) listeners.splice(index, 1);
          },
        },
        async sendMessage(message: unknown) {
          browserWindow.__lastPnsRequest = message;
          browserWindow.__pnsRequests.push(message);
          return browserWindow.__pnsResponses.shift() ?? {
            ok: false,
            reason: "clipboard-blocked",
            fallback: {
              markdownPrompt: "# PointNShoot\n\nComentario: teste e2e",
              imageDataUrl,
              canSavePng: true,
              diagnostics: [
                {
                  at: "2026-05-25T17:05:00.000Z",
                  scope: "offscreen",
                  level: "error",
                  step: "clipboard:write:error",
                  message: "NotAllowedError: Failed to write image/png",
                  details: { hasClipboardItem: true },
                },
              ],
            },
          };
        },
      },
    };
  }, tinyPng);
});

test("delegates PNG clipboard write to the focused tab after offscreen render", async ({ page }) => {
  await page.goto(new URL("../fixtures/simple-page.html", import.meta.url).toString());
  await page.addScriptTag({ path: contentScriptPath });
  await page.evaluate((imageDataUrl) => {
    (window as any).__allowImageClipboard = true;
    (window as any).__pnsResponses.push({
      ok: false,
      reason: "clipboard-blocked",
      fallback: {
        markdownPrompt: "# PointNShoot\n\nComentario: teste delegado",
        imageDataUrl,
        canSavePng: true,
        diagnostics: [
          {
            at: "2026-05-25T17:20:00.000Z",
            scope: "offscreen",
            level: "info",
            step: "render:png",
            message: "Annotated PNG rendered; clipboard copy delegated to focused tab.",
          },
        ],
      },
    });
    window.__POINTNSHOOT_START__?.();
  }, tinyPng);

  const card = page.locator('[data-shot-target="spacing-card"]');
  const box = await card.boundingBox();
  expect(box).toBeTruthy();

  await page.mouse.move(box!.x + 32, box!.y + 32);
  await page.mouse.click(box!.x + 32, box!.y + 32);
  await page.locator('textarea[aria-label="Comentario"]').fill("copiar via aba focada");
  await page.getByRole("button", { name: "Copiar PNG" }).click();

  await expect
    .poll(() => page.evaluate(() => (window as any).__pnsRequests.length), { timeout: 2_000 })
    .toBe(1);
  await expect(page.locator('section[aria-label="Fallback"]')).toBeHidden({ timeout: 2_000 });
  const request = await page.evaluate(() => (window as any).__lastPnsRequest);
  expect(request.type).toBe("POINTNSHOOT_CAPTURE_REQUEST");
});

test("selects an element, submits a comment and opens fallback", async ({ page }) => {
  await page.goto(new URL("../fixtures/simple-page.html", import.meta.url).toString());
  await page.addScriptTag({ path: contentScriptPath });
  await page.evaluate(() => window.__POINTNSHOOT_START__?.());

  const card = page.locator('[data-shot-target="spacing-card"]');
  const box = await card.boundingBox();
  expect(box).toBeTruthy();

  await page.mouse.move(box!.x + 32, box!.y + 32);
  await page.mouse.click(box!.x + 32, box!.y + 32);

  const textarea = page.locator('textarea[aria-label="Comentario"]');
  await expect(textarea).toBeVisible();
  await textarea.fill("Aumentar o respiro do cabecalho do card.");
  await page.keyboard.press(process.platform === "darwin" ? "Meta+Enter" : "Control+Enter");

  await expect(page.locator('section[aria-label="Fallback"]')).toBeVisible();
  await expect(page.locator(".fallback-image")).toBeVisible();
  await expect(page.getByText("Chrome bloqueou a copia automatica")).toBeVisible();
  await expect(page.getByText("Detalhes tecnicos")).toBeVisible();
  await expect(page.locator(".fallback-diagnostics")).toContainText("clipboard:write:error");
  await expect(page.locator(".fallback-diagnostics")).toContainText("userActivationIsActive");
  await expect(page.getByRole("button", { name: "Copiar PNG" })).toBeVisible();

  await page.evaluate(() => {
    (window as any).__allowImageClipboard = true;
  });
  await page.getByRole("button", { name: "Copiar PNG" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__clipboardWrites.length), { timeout: 2_000 })
    .toBe(1);
  await expect(page.locator('section[aria-label="Fallback"]')).toBeHidden({ timeout: 2_000 });

  const request = await page.evaluate(() => (window as any).__lastPnsRequest);
  expect(request.type).toBe("POINTNSHOOT_CAPTURE_REQUEST");
  expect(request.payload.comment).toContain("respiro");
  expect(request.payload.element.shortSelector).toBe("h1");
  expect(request.payload.element.cssPath).toContain("article.card.primary");
});

test("successful copy can run twice after reinjection", async ({ page }) => {
  await page.goto(new URL("../fixtures/simple-page.html", import.meta.url).toString());
  await page.addScriptTag({ path: contentScriptPath });
  await page.evaluate(() => {
    (window as any).__pnsResponses.push(
      { ok: true, copied: true, imageBytes: 1024 },
      { ok: true, copied: true, imageBytes: 2048 },
    );
    window.__POINTNSHOOT_START__?.();
  });

  const card = page.locator('[data-shot-target="spacing-card"]');
  const box = await card.boundingBox();
  expect(box).toBeTruthy();

  await page.mouse.move(box!.x + 32, box!.y + 32);
  await page.mouse.click(box!.x + 32, box!.y + 32);
  await page.locator('textarea[aria-label="Comentario"]').fill("primeira copia");
  await page.getByRole("button", { name: "Copiar PNG" }).click();
  await expect(page.locator('textarea[aria-label="Comentario"]')).toBeHidden({ timeout: 2_000 });

  await page.addScriptTag({ path: contentScriptPath });
  await page.evaluate(() => window.__POINTNSHOOT_START__?.());
  await page.mouse.move(box!.x + 42, box!.y + 42);
  await page.mouse.click(box!.x + 42, box!.y + 42);
  await expect(page.locator('textarea[aria-label="Comentario"]')).toBeVisible();
  await page.locator('textarea[aria-label="Comentario"]').fill("segunda copia");
  await page.getByRole("button", { name: "Copiar PNG" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__pnsRequests.length), { timeout: 2_000 })
    .toBe(2);

  const requests = await page.evaluate(() => (window as any).__pnsRequests);
  expect(requests).toHaveLength(2);
  expect(requests[0].payload.comment).toBe("primeira copia");
  expect(requests[1].payload.comment).toBe("segunda copia");
});

test("copy and cancel buttons receive clicks inside the overlay", async ({ page }) => {
  await page.goto(new URL("../fixtures/simple-page.html", import.meta.url).toString());
  await page.addScriptTag({ path: contentScriptPath });
  await page.evaluate(() => window.__POINTNSHOOT_START__?.());

  const card = page.locator('[data-shot-target="spacing-card"]');
  const box = await card.boundingBox();
  expect(box).toBeTruthy();

  await page.mouse.move(box!.x + 32, box!.y + 32);
  await page.mouse.click(box!.x + 32, box!.y + 32);
  await page.locator('textarea[aria-label="Comentario"]').fill("quero deixar maior.");
  await page.getByRole("button", { name: "Copiar PNG" }).click();

  await expect(page.locator('section[aria-label="Fallback"]')).toBeVisible();
  const request = await page.evaluate(() => (window as any).__lastPnsRequest);
  expect(request.type).toBe("POINTNSHOOT_CAPTURE_REQUEST");

  await page.evaluate(() => window.__POINTNSHOOT_START__?.());
  await page.mouse.move(box!.x + 32, box!.y + 32);
  await page.mouse.click(box!.x + 32, box!.y + 32);
  await page.getByRole("button", { name: "Cancelar" }).click();

  await expect(page.locator('textarea[aria-label="Comentario"]')).toBeHidden();
});

test("focus inside the comment box does not close an existing modal", async ({ page }) => {
  await page.goto(new URL("../fixtures/modal-page.html", import.meta.url).toString());
  await page.addScriptTag({ path: contentScriptPath });
  await page.evaluate(() => window.__POINTNSHOOT_START__?.());

  const target = page.locator('[data-shot-target="modal-button"]');
  const box = await target.boundingBox();
  expect(box).toBeTruthy();

  await page.mouse.move(box!.x + 8, box!.y + 8);
  await page.mouse.click(box!.x + 8, box!.y + 8);
  await page.locator('textarea[aria-label="Comentario"]').fill("Texto no modal ainda deve permanecer aberto.");

  await expect(page.locator('[data-testid="modal"]')).toBeVisible();
});
