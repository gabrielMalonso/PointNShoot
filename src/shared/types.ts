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

export type UsefulStyles = {
  position: string;
  zIndex: string;
  display: string;
  visibility: string;
  opacity: string;
  transform: string;
  pointerEvents: string;
  overflow: string;
  isolation: string;
};

export type TopElementAtPoint = {
  x: number;
  y: number;
  label: string;
  shortSelector: string;
};

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
  usefulStyles: UsefulStyles;
  topElementAtPoint: TopElementAtPoint | null;
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
  | "download-failed"
  | "clipboard-blocked"
  | "restricted-page"
  | "offscreen-unavailable"
  | "unknown";

export type CaptureFallback = {
  markdownPrompt: string;
  diagnostics?: DiagnosticLogEntry[];
};

export type SavedImage = {
  downloadId: number;
  filename: string;
  requestedFilename: string;
  imageBytes: number;
  width: number;
  height: number;
};

export type CaptureSuccess = {
  ok: true;
  markdownPrompt: string;
  savedImage: SavedImage;
  diagnostics?: DiagnosticLogEntry[];
};

export type CaptureFailure = {
  ok: false;
  reason: CaptureFailureReason;
  fallback: CaptureFallback;
  diagnostics?: DiagnosticLogEntry[];
};

export type CaptureResult = CaptureSuccess | CaptureFailure;

export type RenderImageResult =
  | {
      ok: true;
      imageDataUrl: string;
      imageBytes: number;
      width: number;
      height: number;
      diagnostics?: DiagnosticLogEntry[];
    }
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
