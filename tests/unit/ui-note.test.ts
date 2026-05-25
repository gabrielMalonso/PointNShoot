import { describe, expect, it } from "vitest";
import { buildUiNote } from "../../src/shared/ui-note";
import type { CaptureRequest } from "../../src/shared/types";

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
    cssPath: "main.checkout > button#buy",
    nthOfTypePath: "html:nth-of-type(1) > body:nth-of-type(1) > button:nth-of-type(1)",
    role: "button",
    accessibleName: "Comprar",
    visibleText: "Comprar agora",
    visibleTextPreview: "Comprar agora",
    parentSummary: "main.checkout",
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
    url: "https://example.com/checkout?token=secret&tab=plan&membershipId=kh7827jayjbfe3nhm8zc97yctd84n3yt",
    pageTitle: "Checkout",
    usefulStyles: {
      position: "relative",
      zIndex: "10",
      display: "inline-flex",
      visibility: "visible",
      opacity: "0.8",
      transform: "translateY(4px)",
      pointerEvents: "auto",
      overflow: "hidden",
      isolation: "isolate",
    },
    topElementAtPoint: {
      x: 180,
      y: 142,
      label: "button#buy.primary",
      shortSelector: "button#buy.primary",
    },
  },
};

describe("buildUiNote", () => {
  it("includes the saved image path and technical metadata", () => {
    const note = buildUiNote(request, {
      imagePath: "/Users/test/Downloads/PointNShoot-PNG/2026-05-25-1900-button-buy-capture1.png",
    });

    expect(note).toContain("# UI Note");
    expect(note).toContain("## Prompt\n\nmover CTA para cima");
    expect(note).toContain("## Informacoes\n\nImagem:");
    expect(note).not.toContain("Comentario:");
    expect(note).toContain("`/Users/test/Downloads/PointNShoot-PNG/2026-05-25-1900-button-buy-capture1.png`");
    expect(note).toContain("token=<redacted>");
    expect(note).toContain("membershipId=<redacted>");
    expect(note).toContain("`button#buy.primary`");
    expect(note).not.toContain("CSS path:");
    expect(note).not.toContain("main.checkout > button#buy");
    expect(note).toContain("Elemento no ponto:\n`button#buy.primary [button#buy.primary]`");
    expect(note).toContain("`Comprar agora`");
    expect(note).toContain("Ponto:\n`x=180 y=142`");
    expect(note).toContain("`x=100 y=120 w=160 h=44 dpr=2`");
    expect(note).toContain("Pistas:\n`position=relative; z-index=10; transform=translateY(4px)`");
    expect(note).not.toContain("opacity=0.8");
  });

  it("does not invent an image path when none was confirmed", () => {
    const note = buildUiNote(request);

    expect(note).toContain("## Informacoes\n\nImagem:\n`(imagem nao salva)`");
    expect(note).not.toContain("PointNShoot-PNG/");
  });
});
