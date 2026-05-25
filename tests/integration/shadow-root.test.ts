import { describe, expect, it } from "vitest";
import { renderOverlayChrome } from "../../src/content/annotation-overlay";
import { createPointNShootShadowRoot, ROOT_ID } from "../../src/content/shadow-root";

describe("PointNShoot shadow root", () => {
  it("creates an isolated host and renders the overlay chrome", () => {
    const { host, shadow } = createPointNShootShadowRoot(document);
    const refs = renderOverlayChrome(shadow);

    expect(host.id).toBe(ROOT_ID);
    expect(host.shadowRoot).toBe(shadow);
    expect(refs.textarea.getAttribute("aria-label")).toBe("Comentario");
    expect(refs.primaryButton.textContent).toBe("Copiar PNG");
  });
});
