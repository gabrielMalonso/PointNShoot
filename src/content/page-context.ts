import { buildElementContext } from "../shared/metadata";
import type { CaptureRequest } from "../shared/types";

export function createCaptureRequest(element: Element, comment: string, options: { debugMode?: boolean } = {}): CaptureRequest {
  const debugMode = options.debugMode ?? false;

  return {
    id: createId(),
    comment,
    element: buildElementContext(element, {
      debugMode,
      privacyMode: "redact-sensitive",
      url: window.location.href,
      title: document.title,
    }),
    privacyMode: "redact-sensitive",
    debugMode,
    createdAt: new Date().toISOString(),
  };
}

function createId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `pns-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
