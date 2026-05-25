export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ViewportInfo = {
  width: number;
  height: number;
  devicePixelRatio: number;
  scrollX: number;
  scrollY: number;
  visualViewportOffsetLeft: number;
  visualViewportOffsetTop: number;
  visualViewportScale: number;
};

export type PrivacyMode = "normal" | "redact-sensitive";

export type ElementContext = {
  tagName: string;
  id: string | null;
  classes: string[];
  shortSelector: string;
  cssPath: string;
  nthOfTypePath: string;
  role: string | null;
  accessibleName: string | null;
  visibleText: string;
  visibleTextPreview: string;
  parentSummary: string | null;
  siblingIndex: number;
  similarSiblingCount: number;
  boundingRect: Rect;
  viewport: ViewportInfo;
  url: string;
  pageTitle: string;
};

export type CaptureRequest = {
  id: string;
  comment: string;
  element: ElementContext;
  privacyMode: PrivacyMode;
  createdAt: string;
};

export type CaptureFailureReason =
  | "capture-failed"
  | "render-failed"
  | "clipboard-blocked"
  | "restricted-page"
  | "offscreen-unavailable"
  | "unknown";

export type CaptureFallback = {
  markdownPrompt: string;
  imageDataUrl?: string;
  canSavePng: boolean;
  diagnostics?: DiagnosticLogEntry[];
};

export type CaptureResult =
  | { ok: true; copied: true; imageBytes: number }
  | { ok: false; reason: CaptureFailureReason; fallback: CaptureFallback };

export type DiagnosticLogEntry = {
  at: string;
  scope: "content" | "background" | "offscreen";
  level: "info" | "warn" | "error";
  step: string;
  message: string;
  details?: Record<string, string | number | boolean | null>;
};

export type PointNShootMessage =
  | { type: "POINTNSHOOT_TOGGLE_OVERLAY" }
  | { type: "POINTNSHOOT_START_PICKING" }
  | { type: "POINTNSHOOT_CANCEL" }
  | { type: "POINTNSHOOT_CAPTURE_REQUEST"; payload: CaptureRequest }
  | { type: "POINTNSHOOT_CAPTURE_DONE"; payload: CaptureResult }
  | { type: "POINTNSHOOT_CAPTURE_FAILED"; payload: CaptureResult };

export type RenderRequestMessage = {
  type: "POINTNSHOOT_RENDER_REQUEST";
  payload: {
    request: CaptureRequest;
    screenshotDataUrl: string;
    diagnostics?: DiagnosticLogEntry[];
  };
};

export type RuntimeMessage = PointNShootMessage | RenderRequestMessage;
