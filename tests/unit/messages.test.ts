import { describe, expect, it } from "vitest";
import { isCaptureRequestMessage, isRenderRequestMessage, isRuntimeMessage } from "../../src/shared/messages";
import type { CaptureRequest } from "../../src/shared/types";

const request: CaptureRequest = {
  id: "capture-1",
  comment: "ajustar espacamento",
  privacyMode: "redact-sensitive",
  createdAt: "2026-05-25T19:00:00.000Z",
  element: {
    tagName: "div",
    id: null,
    classes: ["card"],
    shortSelector: "div.card",
    cssPath: "html:nth-of-type(1) > body:nth-of-type(1) > div.card:nth-of-type(1)",
    nthOfTypePath: "html:nth-of-type(1) > body:nth-of-type(1) > div:nth-of-type(1)",
    role: null,
    accessibleName: null,
    visibleText: "Resumo",
    visibleTextPreview: "Resumo",
    parentSummary: "body",
    siblingIndex: 0,
    similarSiblingCount: 1,
    boundingRect: { x: 10, y: 20, width: 100, height: 80 },
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
    url: "https://example.com",
    pageTitle: "Example",
  },
};

describe("message guards", () => {
  it("recognizes capture and render messages", () => {
    expect(isRuntimeMessage({ type: "POINTNSHOOT_START_PICKING" })).toBe(true);
    expect(isCaptureRequestMessage({ type: "POINTNSHOOT_CAPTURE_REQUEST", payload: request })).toBe(true);
    expect(isRenderRequestMessage({ type: "POINTNSHOOT_RENDER_REQUEST", payload: { request, screenshotDataUrl: "data:image/png;base64,abc" } })).toBe(true);
  });

  it("rejects malformed messages", () => {
    expect(isRuntimeMessage({ type: "OTHER" })).toBe(false);
    expect(isCaptureRequestMessage({ type: "POINTNSHOOT_CAPTURE_REQUEST", payload: { id: "x" } })).toBe(false);
    expect(isRenderRequestMessage({ type: "POINTNSHOOT_RENDER_REQUEST", payload: { request } })).toBe(false);
  });
});
