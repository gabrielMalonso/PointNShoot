import { buildElementContext } from "../shared/metadata";
import type { CaptureRequest } from "../shared/types";

export function createCaptureRequest(element: Element, comment: string): CaptureRequest {
  return {
    id: createId(),
    comment,
    element: buildElementContext(element, {
      privacyMode: "redact-sensitive",
      url: window.location.href,
      title: document.title,
    }),
    privacyMode: "redact-sensitive",
    createdAt: new Date().toISOString(),
  };
}

function createId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `pns-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
