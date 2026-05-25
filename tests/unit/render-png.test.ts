import { describe, expect, it } from "vitest";
import { buildMarkdownPrompt, calculateCanvasLayout } from "../../src/shared/render-png";
import type { CaptureRequest } from "../../src/shared/types";

describe("render png helpers", () => {
  it("calculates stable canvas layout constraints", () => {
    expect(calculateCanvasLayout({ x: 0, y: 0, width: 280, height: 160 }, true)).toMatchObject({
      width: 1080,
      headerHeight: 52,
      commentHeight: 136,
      footerHeight: 240,
    });

    expect(calculateCanvasLayout({ x: 0, y: 0, width: 2000, height: 1000 }, false).width).toBe(1440);
  });

  it("builds a markdown fallback prompt", () => {
    const request: CaptureRequest = {
      id: "capture-1",
      comment: "mover CTA para cima",
      privacyMode: "redact-sensitive",
      createdAt: "2026-05-25T19:00:00.000Z",
      element: {
        tagName: "button",
        id: "buy",
        classes: ["primary"],
        shortSelector: "button#buy.primary",
        cssPath: "button#buy",
        nthOfTypePath: "html:nth-of-type(1) > body:nth-of-type(1) > button:nth-of-type(1)",
        role: "button",
        accessibleName: "Comprar",
        visibleText: "Comprar",
        visibleTextPreview: "Comprar",
        parentSummary: "body",
        siblingIndex: 0,
        similarSiblingCount: 1,
        boundingRect: { x: 100, y: 120, width: 160, height: 44 },
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
        url: "https://example.com/checkout?token=secret",
        pageTitle: "Checkout",
      },
    };

    const prompt = buildMarkdownPrompt(request);

    expect(prompt).toContain("Comentario: mover CTA para cima");
    expect(prompt).toContain("Selector: button#buy.primary");
    expect(prompt).toContain("token=%5Bredigido%5D");
  });
});
