import {
  hideBadge,
  hideFallback,
  hideHud,
  hidePanel,
  renderOverlayChrome,
  setCapturing,
  setPageInteractionBlocked,
  setPickActive,
  showBadge,
  showFallback,
  showHud,
  showPanel,
  showToast,
  type OverlayRefs,
} from "./annotation-overlay";
import { createCaptureRequest } from "./page-context";
import { createPointNShootShadowRoot, isPointNShootEvent, ROOT_ID, stopHostilePageHandlers } from "./shadow-root";
import { elementLabel, elementRect, findPickTarget, placeFixedBox } from "./selector-overlay";
import { clipboardCapabilityDetails } from "../shared/clipboard-diagnostics";
import { COPY } from "../shared/copy";
import { appendDiagnostic, errorDiagnostic, makeDiagnostic } from "../shared/diagnostics";
import { MESSAGE_TYPES } from "../shared/messages";
import type { CaptureFallback, CaptureResult, DiagnosticLogEntry } from "../shared/types";

type PointNShootState = "idle" | "picking" | "locked" | "capturing" | "fallback";
const CONTROLLER_VERSION = "0.1.3";

declare global {
  interface Window {
    __pointnshootController?: PointNShootController;
    __pointnshootControllerVersion?: string;
    __pointnshootRuntimeListener?: (message: unknown) => void;
    __POINTNSHOOT_START__?: () => void;
    __POINTNSHOOT_TOGGLE_OVERLAY__?: () => void;
  }
}

class PointNShootController {
  private readonly refs: OverlayRefs;
  private state: PointNShootState = "idle";
  private overlayVisible = false;
  private hoveredElement: Element | null = null;
  private selectedElement: Element | null = null;
  private fallbackImageDataUrl: string | null = null;
  private fallbackImageBlob: Blob | null = null;
  private listenersAttached = false;

  constructor() {
    const { host, shadow } = createPointNShootShadowRoot();
    this.refs = renderOverlayChrome(shadow);
    stopHostilePageHandlers(this.refs.eventShield);
    stopHostilePageHandlers(this.refs.hud);
    stopHostilePageHandlers(this.refs.panel);
    stopHostilePageHandlers(this.refs.fallback);

    this.refs.eventShield.addEventListener("pointermove", this.handleShieldPointerMove);
    this.refs.eventShield.addEventListener("pointerdown", this.handleShieldPointerDown);
    this.refs.eventShield.addEventListener("pointerup", this.handleShieldBlockedEvent);
    this.refs.eventShield.addEventListener("mousedown", this.handleShieldBlockedEvent);
    this.refs.eventShield.addEventListener("mouseup", this.handleShieldBlockedEvent);
    this.refs.eventShield.addEventListener("click", this.handleShieldBlockedEvent);
    this.refs.eventShield.addEventListener("dblclick", this.handleShieldBlockedEvent);
    this.refs.eventShield.addEventListener("contextmenu", this.handleShieldBlockedEvent);
    this.refs.hudPickButton.addEventListener("click", () => this.togglePick());
    this.refs.hudCloseButton.addEventListener("click", () => this.hideOverlay());
    this.refs.primaryButton.addEventListener("click", () => void this.submit());
    this.refs.secondaryButton.addEventListener("click", () => this.cancel());
    this.refs.textarea.addEventListener("keydown", (event) => this.handleTextareaKeyDown(event));
    host.style.display = "none";
  }

  start(): void {
    this.startPicking();
  }

  toggleOverlay(): void {
    if (this.overlayVisible) {
      this.hideOverlay();
      return;
    }

    this.showOverlay();
  }

  showOverlay(): void {
    this.overlayVisible = true;
    this.refs.host.style.display = "block";
    this.refs.host.style.visibility = "visible";
    showHud(this.refs);
    setPickActive(this.refs, this.state !== "idle");
    setPageInteractionBlocked(this.refs, this.state !== "idle");
    this.attachListeners();
  }

  hideOverlay(): void {
    this.stopPicking({ keepOverlay: false });
  }

  cancel(): void {
    this.stopPicking({ keepOverlay: true });
  }

  destroy(): void {
    this.hideOverlay();
    this.refs.host.remove();
  }

  private startPicking(): void {
    if (this.state === "capturing") return;

    this.showOverlay();
    this.attachListeners();
    this.state = "picking";
    this.hoveredElement = null;
    this.selectedElement = null;
    this.fallbackImageBlob = null;
    this.refs.host.style.display = "block";
    this.refs.host.style.visibility = "visible";
    setPickActive(this.refs, true);
    setPageInteractionBlocked(this.refs, true);
    hidePanel(this.refs);
    hideFallback(this.refs);
    hideBadge(this.refs);
    placeFixedBox(this.refs.hoverBox, { x: 0, y: 0, width: 0, height: 0 }, false);
    placeFixedBox(this.refs.lockedBox, { x: 0, y: 0, width: 0, height: 0 }, false);
    showToast(this.refs, COPY.selectHint, 1600);
  }

  private togglePick(): void {
    if (this.state === "capturing") return;

    if (this.state === "idle") {
      this.startPicking();
      return;
    }

    this.cancel();
  }

  private stopPicking({ keepOverlay }: { keepOverlay: boolean }): void {
    this.state = "idle";
    this.hoveredElement = null;
    this.selectedElement = null;
    this.fallbackImageDataUrl = null;
    this.fallbackImageBlob = null;
    this.refs.textarea.value = "";
    this.refs.host.style.visibility = "visible";
    setCapturing(this.refs, false);
    setPickActive(this.refs, false);
    setPageInteractionBlocked(this.refs, false);
    hidePanel(this.refs);
    hideFallback(this.refs);
    hideBadge(this.refs);
    placeFixedBox(this.refs.hoverBox, { x: 0, y: 0, width: 0, height: 0 }, false);
    placeFixedBox(this.refs.lockedBox, { x: 0, y: 0, width: 0, height: 0 }, false);

    if (keepOverlay) {
      this.overlayVisible = true;
      this.refs.host.style.display = "block";
      showHud(this.refs);
      this.attachListeners();
      return;
    }

    this.overlayVisible = false;
    hideHud(this.refs);
    this.refs.host.style.display = "none";
    this.detachListeners();
  }

  private attachListeners(): void {
    if (this.listenersAttached) return;
    window.addEventListener("pointermove", this.handlePagePointerMove, true);
    window.addEventListener("pointerdown", this.handlePagePointerDown, true);
    window.addEventListener("pointerup", this.handlePageBlockedEvent, true);
    window.addEventListener("mousedown", this.handlePageBlockedEvent, true);
    window.addEventListener("mouseup", this.handlePageBlockedEvent, true);
    window.addEventListener("click", this.handlePageBlockedEvent, true);
    window.addEventListener("dblclick", this.handlePageBlockedEvent, true);
    window.addEventListener("contextmenu", this.handlePageBlockedEvent, true);
    document.addEventListener("pointermove", this.handlePointerMove, true);
    document.addEventListener("click", this.handleClick, true);
    document.addEventListener("keydown", this.handleKeyDown, true);
    window.addEventListener("scroll", this.reposition, true);
    window.addEventListener("resize", this.reposition, true);
    this.listenersAttached = true;
  }

  private detachListeners(): void {
    if (!this.listenersAttached) return;
    window.removeEventListener("pointermove", this.handlePagePointerMove, true);
    window.removeEventListener("pointerdown", this.handlePagePointerDown, true);
    window.removeEventListener("pointerup", this.handlePageBlockedEvent, true);
    window.removeEventListener("mousedown", this.handlePageBlockedEvent, true);
    window.removeEventListener("mouseup", this.handlePageBlockedEvent, true);
    window.removeEventListener("click", this.handlePageBlockedEvent, true);
    window.removeEventListener("dblclick", this.handlePageBlockedEvent, true);
    window.removeEventListener("contextmenu", this.handlePageBlockedEvent, true);
    document.removeEventListener("pointermove", this.handlePointerMove, true);
    document.removeEventListener("click", this.handleClick, true);
    document.removeEventListener("keydown", this.handleKeyDown, true);
    window.removeEventListener("scroll", this.reposition, true);
    window.removeEventListener("resize", this.reposition, true);
    this.listenersAttached = false;
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (this.state !== "picking" || isPointNShootEvent(event, this.refs.host)) return;

    const target = this.findPickTargetAt(event.clientX, event.clientY);
    if (!target || target === this.hoveredElement) return;

    this.hoveredElement = target;
    const rect = elementRect(target);
    placeFixedBox(this.refs.hoverBox, rect, true);
    showBadge(this.refs, elementLabel(target), rect);
  };

  private readonly handleShieldPointerMove = (event: PointerEvent): void => {
    if (this.state !== "picking") return;
    this.updateHoveredTarget(event.clientX, event.clientY);
    this.blockPageEvent(event);
  };

  private readonly handleShieldPointerDown = (event: PointerEvent): void => {
    this.handlePickPointerDown(event);
  };

  private readonly handleShieldBlockedEvent = (event: Event): void => {
    if (this.state === "idle") return;
    this.blockPageEvent(event);
  };

  private readonly handlePagePointerMove = (event: PointerEvent): void => {
    if (this.state === "idle" || this.isOverlayControlEvent(event)) return;
    if (this.state === "picking") this.updateHoveredTarget(event.clientX, event.clientY);
    this.blockPageEvent(event);
  };

  private readonly handlePagePointerDown = (event: PointerEvent): void => {
    if (this.state === "idle" || this.isOverlayControlEvent(event)) return;
    this.handlePickPointerDown(event);
  };

  private readonly handlePageBlockedEvent = (event: Event): void => {
    if (this.state === "idle" || this.isOverlayControlEvent(event)) return;
    this.blockPageEvent(event);
  };

  private readonly handleClick = (event: MouseEvent): void => {
    if (this.state !== "picking" || isPointNShootEvent(event, this.refs.host)) return;

    const target = this.hoveredElement ?? this.findPickTargetAt(event.clientX, event.clientY);
    if (!target) return;

    this.blockPageEvent(event);
    this.lockElement(target);
  };

  private handlePickPointerDown(event: PointerEvent): void {
    this.blockPageEvent(event);
    if (this.state !== "picking" || event.button !== 0) return;

    const target = this.hoveredElement ?? this.findPickTargetAt(event.clientX, event.clientY);
    if (target) this.lockElement(target);
  }

  private updateHoveredTarget(clientX: number, clientY: number): void {
    const target = this.findPickTargetAt(clientX, clientY);
    if (!target || target === this.hoveredElement) return;

    this.hoveredElement = target;
    const rect = elementRect(target);
    placeFixedBox(this.refs.hoverBox, rect, true);
    showBadge(this.refs, elementLabel(target), rect);
  }

  private findPickTargetAt(clientX: number, clientY: number): Element | null {
    const previousPointerEvents = this.refs.eventShield.style.pointerEvents;
    this.refs.eventShield.style.pointerEvents = "none";
    try {
      return findPickTarget(clientX, clientY, this.refs.host);
    } finally {
      this.refs.eventShield.style.pointerEvents = previousPointerEvents;
    }
  }

  private blockPageEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  private isOverlayControlEvent(event: Event): boolean {
    const path = event.composedPath();
    return path.includes(this.refs.host) && !path.includes(this.refs.eventShield);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.state !== "idle") {
      event.preventDefault();
      event.stopPropagation();
      this.cancel();
      return;
    }

    if (event.key === "Escape" && this.overlayVisible) {
      event.preventDefault();
      event.stopPropagation();
      this.hideOverlay();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && this.state === "locked") {
      event.preventDefault();
      void this.submit();
    }
  };

  private handleTextareaKeyDown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void this.submit();
      return;
    }

    if (event.key === "Backspace" && this.refs.textarea.value.length === 0) {
      event.preventDefault();
      this.reselect();
    }
  }

  private lockElement(element: Element): void {
    this.state = "locked";
    setPickActive(this.refs, true);
    setPageInteractionBlocked(this.refs, true);
    this.selectedElement = element;
    this.hoveredElement = null;
    this.refs.textarea.value = "";
    placeFixedBox(this.refs.hoverBox, { x: 0, y: 0, width: 0, height: 0 }, false);
    this.reposition();
    showPanel(this.refs, elementRect(element));
    this.refs.textarea.focus();
  }

  private reselect(): void {
    this.state = "picking";
    setPickActive(this.refs, true);
    setPageInteractionBlocked(this.refs, true);
    this.selectedElement = null;
    this.refs.textarea.value = "";
    hidePanel(this.refs);
    placeFixedBox(this.refs.lockedBox, { x: 0, y: 0, width: 0, height: 0 }, false);
    showToast(this.refs, COPY.selectHint, 1200);
  }

  private readonly reposition = (): void => {
    const element = this.selectedElement ?? this.hoveredElement;
    if (!element || this.state === "capturing") return;

    const rect = elementRect(element);
    showBadge(this.refs, elementLabel(element), rect);

    if (this.selectedElement) {
      placeFixedBox(this.refs.lockedBox, rect, true);
      showPanel(this.refs, rect);
    } else {
      placeFixedBox(this.refs.hoverBox, rect, true);
    }
  };

  private async submit(): Promise<void> {
    if (!this.selectedElement || this.state !== "locked") return;

    const comment = this.refs.textarea.value.trim();
    if (!comment) {
      showToast(this.refs, COPY.emptyComment, 1800);
      this.refs.textarea.focus();
      return;
    }

    const request = createCaptureRequest(this.selectedElement, comment);
    this.state = "capturing";
    setCapturing(this.refs, true);
    this.refs.host.style.visibility = "hidden";
    await nextPaint();

    try {
      const response = (await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.captureRequest,
        payload: request,
      })) as CaptureResult | undefined;

      this.refs.host.style.visibility = "visible";
      setCapturing(this.refs, false);

      if (!response) throw new Error("capture-failed: empty response");
      await this.handleCaptureResult(response);
    } catch (error) {
      this.refs.host.style.visibility = "visible";
      setCapturing(this.refs, false);
      const diagnostics: DiagnosticLogEntry[] = [
        {
          at: new Date().toISOString(),
          scope: "content",
          level: "error",
          step: "runtime:send-message:error",
          message: error instanceof Error ? error.message : String(error),
          details: error instanceof Error ? { name: error.name, stack: error.stack ?? null } : undefined,
        },
      ];
      const fallback: CaptureFallback = {
        markdownPrompt: `# PointNShoot\n\nComentario: ${comment}`,
        canSavePng: false,
        diagnostics,
      };
      console.error("[PointNShoot] capture failed", error);
      await this.handleCaptureResult({ ok: false, reason: "capture-failed", fallback });
    }
  }

  private async handleCaptureResult(result: CaptureResult): Promise<void> {
    if (result.ok) {
      showToast(this.refs, COPY.copied, 1800);
      this.cancel();
      return;
    }

    if (result.fallback.imageDataUrl && (await this.tryCopyPngFromFocusedPage(result.fallback, "auto"))) {
      showToast(this.refs, COPY.copied, 1800);
      this.cancel();
      return;
    }

    this.showCaptureFallback(result.fallback);
  }

  private showCaptureFallback(fallback: CaptureFallback): void {
    this.state = "fallback";
    setPickActive(this.refs, true);
    setPageInteractionBlocked(this.refs, true);
    this.fallbackImageDataUrl = fallback.imageDataUrl ?? null;
    hidePanel(this.refs);
    showToast(this.refs, COPY.captureFailed, 1800);
    showFallback(this.refs, fallback, {
      onSavePng: () => this.saveFallbackPng(),
      onCopyPng: () => void this.copyFallbackPng(fallback),
      onCopyText: () => void this.copyFallbackText(fallback.markdownPrompt),
      onClose: () => this.cancel(),
    });
  }

  private saveFallbackPng(): void {
    if (!this.fallbackImageDataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = this.fallbackImageDataUrl;
    anchor.download = "pointnshoot.png";
    anchor.click();
  }

  private async copyFallbackText(markdownPrompt: string): Promise<void> {
    const fallbackTextarea = this.refs.fallback.querySelector<HTMLTextAreaElement>(".fallback-text");
    await navigator.clipboard.writeText(fallbackTextarea?.value ?? markdownPrompt);
    showToast(this.refs, COPY.copiedText, 1200);
  }

  private async copyFallbackPng(fallback: CaptureFallback): Promise<void> {
    if (await this.tryCopyPngFromFocusedPage(fallback, "fallback-click")) {
      showToast(this.refs, COPY.copied, 1800);
      this.cancel();
      return;
    }

    showToast(this.refs, COPY.captureFailed, 1800);
    this.showCaptureFallback(fallback);
  }

  private async tryCopyPngFromFocusedPage(fallback: CaptureFallback, source: "auto" | "fallback-click"): Promise<boolean> {
    let diagnostics = fallback.diagnostics ?? [];
    this.prepareClipboardFocus(source);

    diagnostics = appendDiagnostic(
      diagnostics,
      makeDiagnostic("content", "info", "clipboard:write:start", "Attempting focused-tab navigator.clipboard.write(image/png).", {
        source,
        ...clipboardCapabilityDetails(),
      }),
    );

    try {
      const blob = await this.getFallbackImageBlob(fallback);
      await copyPngBlobToClipboard(blob);
      diagnostics = appendDiagnostic(
        diagnostics,
        makeDiagnostic("content", "info", "clipboard:write:ok", "PNG copied from focused tab.", {
          source,
          imageBytes: blob.size,
          blobType: blob.type,
          ...clipboardCapabilityDetails(),
        }),
      );
      fallback.diagnostics = diagnostics;
      return true;
    } catch (error) {
      diagnostics = appendDiagnostic(
        diagnostics,
        errorDiagnostic("content", "clipboard:write:error", error, {
          source,
          ...clipboardCapabilityDetails(),
        }),
      );
      fallback.diagnostics = diagnostics;
      return false;
    }
  }

  private prepareClipboardFocus(source: "auto" | "fallback-click"): void {
    try {
      window.focus();
    } catch {
      // Best effort only; Chrome may ignore focus() from a content script.
    }

    const target =
      source === "fallback-click"
        ? this.refs.fallback.querySelector<HTMLButtonElement>(".copy-png")
        : this.refs.primaryButton;
    target?.focus({ preventScroll: true });
  }

  private async getFallbackImageBlob(fallback: CaptureFallback): Promise<Blob> {
    if (this.fallbackImageBlob) return this.fallbackImageBlob;

    const blob = await dataUrlToBlob(fallback.imageDataUrl);
    this.fallbackImageBlob = blob;
    return blob;
  }
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

async function dataUrlToBlob(dataUrl: string | undefined): Promise<Blob> {
  if (!dataUrl) throw new Error("clipboard-blocked: missing rendered PNG data URL");
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  if (blob.type !== "image/png") {
    return new Blob([blob], { type: "image/png" });
  }
  return blob;
}

async function copyPngBlobToClipboard(blob: Blob): Promise<void> {
  if (typeof ClipboardItem === "undefined") {
    throw new Error("clipboard-blocked: ClipboardItem unavailable in focused tab");
  }

  if (!navigator.clipboard?.write) {
    throw new Error("clipboard-blocked: navigator.clipboard.write unavailable in focused tab");
  }

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);
}

const reusableController =
  window.__pointnshootControllerVersion === CONTROLLER_VERSION
    ? window.__pointnshootController
    : undefined;

if (!reusableController) {
  try {
    window.__pointnshootController?.destroy();
  } catch {
    document.getElementById(ROOT_ID)?.remove();
  }
}

const controller = reusableController ?? new PointNShootController();
window.__pointnshootController = controller;
window.__pointnshootControllerVersion = CONTROLLER_VERSION;
window.__POINTNSHOOT_START__ = () => controller.start();
window.__POINTNSHOOT_TOGGLE_OVERLAY__ = () => controller.toggleOverlay();

if (window.__pointnshootRuntimeListener) {
  chrome.runtime.onMessage.removeListener(window.__pointnshootRuntimeListener);
}

window.__pointnshootRuntimeListener = (message: unknown) => {
  if (message && typeof message === "object" && "type" in message) {
    const type = (message as { type: string }).type;
    if (type === MESSAGE_TYPES.toggleOverlay) controller.toggleOverlay();
    if (type === MESSAGE_TYPES.startPicking) controller.start();
    if (type === MESSAGE_TYPES.cancel) controller.hideOverlay();
  }
};

chrome.runtime.onMessage.addListener(window.__pointnshootRuntimeListener);
