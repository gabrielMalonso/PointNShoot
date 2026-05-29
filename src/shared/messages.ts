import type { CaptureResult, CaptureRequest, PointNShootMessage, RenderImageResult, RenderRequestMessage, RuntimeMessage } from "./types";

export const MESSAGE_TYPES = {
  toggleOverlay: "POINTNSHOOT_TOGGLE_OVERLAY",
  startPicking: "POINTNSHOOT_START_PICKING",
  cancel: "POINTNSHOOT_CANCEL",
  captureRequest: "POINTNSHOOT_CAPTURE_REQUEST",
  captureDone: "POINTNSHOOT_CAPTURE_DONE",
  captureFailed: "POINTNSHOOT_CAPTURE_FAILED",
  renderRequest: "POINTNSHOOT_RENDER_REQUEST",
} as const;

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return isRecord(value) && typeof value.type === "string" && value.type.startsWith("POINTNSHOOT_");
}

export function isCaptureRequestMessage(value: unknown): value is Extract<PointNShootMessage, { type: "POINTNSHOOT_CAPTURE_REQUEST" }> {
  return isRecord(value) && value.type === MESSAGE_TYPES.captureRequest && isCaptureRequest(value.payload);
}

export function isRenderRequestMessage(value: unknown): value is RenderRequestMessage {
  if (!isRecord(value) || value.type !== MESSAGE_TYPES.renderRequest || !isRecord(value.payload)) return false;
  return typeof value.payload.screenshotDataUrl === "string" && isCaptureRequest(value.payload.request);
}

export function isCaptureResult(value: unknown): value is CaptureResult {
  if (!isRecord(value) || typeof value.ok !== "boolean") return false;

  if (value.ok === true) {
    return (
      typeof value.markdownPrompt === "string" &&
      isSavedImage(value.savedImage) &&
      isT3ComposerDeliveryResult(value.delivery)
    );
  }

  return isCaptureFailureReason(value.reason) && isCaptureFallback(value.fallback);
}

export function isRenderImageResult(value: unknown): value is RenderImageResult {
  if (!isRecord(value) || typeof value.ok !== "boolean") return false;

  if (value.ok === true) {
    return (
      typeof value.imageDataUrl === "string" &&
      typeof value.imageBytes === "number" &&
      typeof value.width === "number" &&
      typeof value.height === "number"
    );
  }

  return isCaptureFailureReason(value.reason) && isCaptureFallback(value.fallback);
}

function isCaptureRequest(value: unknown): value is CaptureRequest {
  if (!isRecord(value)) return false;

  const hasRequiredFields =
    typeof value.id === "string" &&
    typeof value.comment === "string" &&
    (value.privacyMode === "normal" || value.privacyMode === "redact-sensitive") &&
    (value.debugMode === undefined || typeof value.debugMode === "boolean") &&
    typeof value.createdAt === "string" &&
    isRecord(value.element);

  if (!hasRequiredFields) return false;

  if (value.debugMode === undefined) {
    value.debugMode = false;
  }

  return true;
}

function isCaptureFallback(value: unknown): boolean {
  return isRecord(value) && typeof value.markdownPrompt === "string";
}

function isSavedImage(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.downloadId === "number" &&
    typeof value.filename === "string" &&
    typeof value.requestedFilename === "string" &&
    typeof value.imageBytes === "number" &&
    typeof value.width === "number" &&
    typeof value.height === "number"
  );
}

function isT3ComposerDeliveryResult(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value) || typeof value.ok !== "boolean") return false;
  if (value.ok === true) {
    return (
      (typeof value.tabId === "number" || value.tabId === null) &&
      (typeof value.url === "string" || value.url === null)
    );
  }
  return typeof value.reason === "string" && (value.message === undefined || typeof value.message === "string");
}

function isCaptureFailureReason(value: unknown): boolean {
  return (
    value === "capture-failed" ||
    value === "render-failed" ||
    value === "download-failed" ||
    value === "clipboard-blocked" ||
    value === "restricted-page" ||
    value === "offscreen-unavailable" ||
    value === "unknown"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
