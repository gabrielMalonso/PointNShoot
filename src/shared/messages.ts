import type { CaptureRequest, PointNShootMessage, RenderRequestMessage, RuntimeMessage } from "./types";

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

function isCaptureRequest(value: unknown): value is CaptureRequest {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.comment === "string" &&
    (value.privacyMode === "normal" || value.privacyMode === "redact-sensitive") &&
    typeof value.createdAt === "string" &&
    isRecord(value.element)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
