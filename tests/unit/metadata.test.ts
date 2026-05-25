import { afterEach, describe, expect, it, vi } from "vitest";
import { buildElementContext } from "../../src/shared/metadata";

describe("buildElementContext", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("extracts selectors, accessible name, sibling stats and redacted text", () => {
    document.body.innerHTML = `
      <main>
        <button class="chip">Cancelar</button>
        <button
          class="chip primary"
          data-testid="profile-save"
          aria-label="Salvar alteracoes"
          style="position: relative; z-index: 3; display: inline-flex; visibility: visible; opacity: 0.72; transform: translateX(2px); pointer-events: auto; overflow: hidden; isolation: isolate;"
        >Salvar ana@example.com</button>
        <button class="chip">Excluir</button>
      </main>
    `;
    const button = document.querySelector(".primary") as HTMLElement;
    button.getBoundingClientRect = () =>
      ({
        x: 20,
        y: 30,
        width: 120,
        height: 40,
        top: 30,
        left: 20,
        right: 140,
        bottom: 70,
        toJSON: () => ({}),
      }) as DOMRect;
    const elementFromPoint = mockElementFromPoint(button);

    const context = buildElementContext(button, {
      url: "https://example.com/edit?token=secret&tab=profile",
      title: "Teste",
      viewport: {
        width: 1280,
        height: 720,
        devicePixelRatio: 2,
        scrollX: 0,
        scrollY: 0,
        visualViewportOffsetLeft: 0,
        visualViewportOffsetTop: 0,
        visualViewportScale: 1,
      },
    });

    expect(context.shortSelector).toBe('button[data-testid="profile-save"]');
    expect(context.cssPath).toBe('button[data-testid="profile-save"]');
    expect(context.role).toBe("button");
    expect(context.accessibleName).toBe("Salvar alteracoes");
    expect(context.visibleText).toContain("[email]");
    expect(context.url).toContain("token=<redacted>");
    expect(context.similarSiblingCount).toBe(1);
    expect(context.boundingRect).toEqual({ x: 20, y: 30, width: 120, height: 40 });
    expect(context.usefulStyles).toMatchObject({
      position: "relative",
      zIndex: "3",
      display: "inline-flex",
      visibility: "visible",
      opacity: "0.72",
      pointerEvents: "auto",
      overflow: "hidden",
      isolation: "isolate",
    });
    expect(context.usefulStyles.transform).toContain("translate");
    expect(elementFromPoint).toHaveBeenCalledWith(80, 50);
    expect(context.topElementAtPoint).toEqual({
      x: 80,
      y: 50,
      label: "button.chip.primary",
      shortSelector: 'button[data-testid="profile-save"]',
    });
  });

  it("records null topElementAtPoint when the element has no visible area", () => {
    document.body.innerHTML = `<button style="display: none">Salvar</button>`;
    const button = document.querySelector("button") as HTMLElement;
    button.getBoundingClientRect = () =>
      ({
        x: 2000,
        y: 2000,
        width: 120,
        height: 40,
        top: 2000,
        left: 2000,
        right: 2120,
        bottom: 2040,
        toJSON: () => ({}),
      }) as DOMRect;
    const elementFromPoint = mockElementFromPoint(button);

    const context = buildElementContext(button, {
      viewport: {
        width: 1280,
        height: 720,
        devicePixelRatio: 2,
        scrollX: 0,
        scrollY: 0,
        visualViewportOffsetLeft: 0,
        visualViewportOffsetTop: 0,
        visualViewportScale: 1,
      },
    });

    expect(context.topElementAtPoint).toBeNull();
    expect(elementFromPoint).not.toHaveBeenCalled();
  });
});

function mockElementFromPoint(element: Element): ReturnType<typeof vi.fn> {
  const fn = vi.fn(() => element);
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: fn,
  });
  return fn;
}
