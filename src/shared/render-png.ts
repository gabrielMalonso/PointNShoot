import { computeCropPlan } from "./crop";
import { redactSensitiveText, sanitizeUrl, truncateText } from "./privacy";
import type { CaptureRequest, Rect } from "./types";

export type RenderAnnotatedPngInput = {
  request: CaptureRequest;
  screenshotDataUrl: string;
  marginCssPx?: number;
};

export type AnnotatedPng = {
  blob: Blob;
  dataUrl: string;
  imageBytes: number;
  width: number;
  height: number;
};

export type CanvasLayout = {
  width: number;
  height: number;
  headerHeight: number;
  cropRect: Rect;
  commentHeight: number;
  footerHeight: number;
  renderScale: number;
};

const CANVAS_BG = "#edf4fa";
const PANEL_BG = "#f8fbff";
const INK = "#0e1b2a";
const MUTED = "#60758a";
const HAIRLINE = "#c9d8e6";
const FOOTER_BG = "#071827";
const FOOTER_RULE = "#12324a";
const FOOTER_LABEL = "#8cc8ec";
const FOOTER_VALUE = "#f4f9ff";
const COMMENT_LABEL = "#386985";
const SCREENSHOT_SEPARATOR = "#02070c";
const FOCUS_MASK = "rgba(7, 24, 39, 0.22)";
const FOCUS_PINK = "#ff2f9c";
const FOCUS_GLOW = "rgba(255, 47, 156, 0.42)";
const MIN_WIDTH = 1080;
const MAX_WIDTH = 1440;
const OUTPUT_PIXEL_RATIO = 2;
const RENDER_PROFILE = "ctx960 focus2x v0.1.9";
const DEFAULT_CONTEXT_WIDTH = 960;
const DEFAULT_CONTEXT_HEIGHT = 720;
const HEADER_HEIGHT = 52;
const COMMENT_HEIGHT = 136;
const FOOTER_HEIGHT = 240;

export function buildMarkdownPrompt(request: CaptureRequest): string {
  const element = request.element;
  const comment = request.privacyMode === "redact-sensitive" ? redactSensitiveText(request.comment) : request.comment;
  const url = request.privacyMode === "redact-sensitive" ? sanitizeUrl(element.url) : element.url;

  return [
    "# PointNShoot",
    "",
    `Comentario: ${truncateText(comment, 500)}`,
    `URL: ${url}`,
    `Selector: ${element.shortSelector}`,
    `CSS path: ${element.cssPath}`,
    `Texto: ${element.visibleTextPreview || "(sem texto visivel)"}`,
    `Rect: ${Math.round(element.boundingRect.x)},${Math.round(element.boundingRect.y)} ${Math.round(element.boundingRect.width)}x${Math.round(element.boundingRect.height)}`,
    `Viewport: ${element.viewport.width}x${element.viewport.height} DPR ${element.viewport.devicePixelRatio}`,
  ].join("\n");
}

export function calculateCanvasLayout(cropSource: Rect, hasComment: boolean): CanvasLayout {
  const headerHeight = HEADER_HEIGHT;
  const footerHeight = FOOTER_HEIGHT;
  const widthScale = cropSource.width > MAX_WIDTH ? MAX_WIDTH / cropSource.width : cropSource.width < MIN_WIDTH ? MIN_WIDTH / cropSource.width : 1;
  const renderScale = Number.isFinite(widthScale) ? widthScale : 1;
  const cropWidth = Math.max(1, Math.round(cropSource.width * renderScale));
  const cropHeight = Math.max(1, Math.round(cropSource.height * renderScale));
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, cropWidth));
  const commentHeight = hasComment ? COMMENT_HEIGHT : 0;

  return {
    width,
    height: headerHeight + cropHeight + commentHeight + footerHeight,
    headerHeight,
    cropRect: {
      x: Math.floor((width - cropWidth) / 2),
      y: headerHeight,
      width: cropWidth,
      height: cropHeight,
    },
    commentHeight,
    footerHeight,
    renderScale,
  };
}

export async function renderAnnotatedPng(input: RenderAnnotatedPngInput): Promise<AnnotatedPng> {
  const image = await loadImage(input.screenshotDataUrl);
  const request = input.request;
  const crop = computeCropPlan(
    request.element.boundingRect,
    request.element.viewport,
    { width: image.naturalWidth, height: image.naturalHeight },
    {
      marginCssPx: input.marginCssPx ?? 48,
      minCropCssWidth: DEFAULT_CONTEXT_WIDTH,
      minCropCssHeight: DEFAULT_CONTEXT_HEIGHT,
    },
  );
  const comment = request.privacyMode === "redact-sensitive" ? redactSensitiveText(request.comment) : request.comment;
  const layout = calculateCanvasLayout(crop.source, Boolean(comment.trim()));
  const canvas = document.createElement("canvas");
  canvas.width = layout.width * OUTPUT_PIXEL_RATIO;
  canvas.height = layout.height * OUTPUT_PIXEL_RATIO;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("render-failed: canvas context unavailable");

  ctx.scale(OUTPUT_PIXEL_RATIO, OUTPUT_PIXEL_RATIO);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, layout.width, layout.height);

  drawHeader(ctx, request.element.shortSelector, layout);
  drawScreenshotCrop(ctx, image, crop.source, layout);
  drawElementHighlight(ctx, crop.element, layout);
  drawScreenshotSeparators(ctx, layout);
  if (comment.trim()) drawComment(ctx, comment, layout);
  drawFooter(ctx, request, layout);

  const blob = await canvasToBlob(canvas);

  return {
    blob,
    dataUrl: canvas.toDataURL("image/png"),
    imageBytes: blob.size,
    width: canvas.width,
    height: canvas.height,
  };
}

function drawHeader(ctx: CanvasRenderingContext2D, label: string, layout: CanvasLayout): void {
  ctx.fillStyle = PANEL_BG;
  ctx.fillRect(0, 0, layout.width, layout.headerHeight);
  ctx.strokeStyle = HAIRLINE;
  ctx.beginPath();
  ctx.moveTo(0, layout.headerHeight - 0.5);
  ctx.lineTo(layout.width, layout.headerHeight - 0.5);
  ctx.stroke();

  ctx.font = "700 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  const profileWidth = ctx.measureText(RENDER_PROFILE).width;
  ctx.fillStyle = INK;
  ctx.font = "760 20px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  const availableLabelWidth = Math.max(80, layout.width - profileWidth - 72);
  ctx.fillText(truncateToWidth(ctx, label, availableLabelWidth), 24, 35);
  ctx.fillStyle = MUTED;
  ctx.font = "700 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText(RENDER_PROFILE, layout.width - profileWidth - 24, 34);
}

function drawScreenshotCrop(ctx: CanvasRenderingContext2D, image: HTMLImageElement, source: Rect, layout: CanvasLayout): void {
  ctx.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    layout.cropRect.x,
    layout.cropRect.y,
    layout.cropRect.width,
    layout.cropRect.height,
  );
}

function drawElementHighlight(ctx: CanvasRenderingContext2D, element: Rect, layout: CanvasLayout): void {
  const scale = layout.renderScale;
  const x = layout.cropRect.x + element.x * scale;
  const y = layout.cropRect.y + element.y * scale;
  const width = element.width * scale;
  const height = element.height * scale;
  const cropRight = layout.cropRect.x + layout.cropRect.width;
  const cropBottom = layout.cropRect.y + layout.cropRect.height;

  ctx.save();
  ctx.fillStyle = FOCUS_MASK;
  ctx.fillRect(layout.cropRect.x, layout.cropRect.y, layout.cropRect.width, Math.max(0, y - layout.cropRect.y));
  ctx.fillRect(layout.cropRect.x, y + height, layout.cropRect.width, Math.max(0, cropBottom - y - height));
  ctx.fillRect(layout.cropRect.x, y, Math.max(0, x - layout.cropRect.x), height);
  ctx.fillRect(x + width, y, Math.max(0, cropRight - x - width), height);

  ctx.strokeStyle = "rgba(248, 251, 255, 0.96)";
  ctx.lineWidth = Math.max(5, 5 * scale);
  ctx.strokeRect(x, y, width, height);

  ctx.strokeStyle = FOCUS_PINK;
  ctx.lineWidth = Math.max(3, 3 * scale);
  ctx.shadowColor = FOCUS_GLOW;
  ctx.shadowBlur = 12;
  ctx.strokeRect(x, y, width, height);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
  ctx.lineWidth = Math.max(1, 1 * scale);
  ctx.strokeRect(x + 2, y + 2, Math.max(0, width - 4), Math.max(0, height - 4));
  ctx.restore();
}

function drawScreenshotSeparators(ctx: CanvasRenderingContext2D, layout: CanvasLayout): void {
  const lineHeight = 2;
  const top = layout.cropRect.y;
  const bottom = layout.cropRect.y + layout.cropRect.height - lineHeight;

  ctx.save();
  ctx.fillStyle = SCREENSHOT_SEPARATOR;
  ctx.fillRect(0, top, layout.width, lineHeight);
  ctx.fillRect(0, bottom, layout.width, lineHeight);
  ctx.restore();
}

function drawComment(ctx: CanvasRenderingContext2D, comment: string, layout: CanvasLayout): void {
  const top = layout.cropRect.y + layout.cropRect.height;
  ctx.fillStyle = PANEL_BG;
  ctx.fillRect(0, top, layout.width, layout.commentHeight);
  ctx.strokeStyle = HAIRLINE;
  ctx.beginPath();
  ctx.moveTo(0, top + 0.5);
  ctx.lineTo(layout.width, top + 0.5);
  ctx.stroke();

  ctx.fillStyle = COMMENT_LABEL;
  ctx.font = "850 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText("Comentario", 24, top + 38);
  ctx.fillStyle = INK;
  ctx.font = "650 23px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
  drawWrappedText(ctx, truncateText(comment, 360), 24, top + 80, layout.width - 48, 30, 2);
}

function drawFooter(ctx: CanvasRenderingContext2D, request: CaptureRequest, layout: CanvasLayout): void {
  const top = layout.height - layout.footerHeight;
  const element = request.element;
  const url = request.privacyMode === "redact-sensitive" ? sanitizeUrl(element.url) : element.url;
  const rect = element.boundingRect;
  const selector = element.shortSelector;
  const rectText = `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)} · DPR ${element.viewport.devicePixelRatio}`;
  const visibleText = element.visibleTextPreview || "(sem texto visivel)";

  ctx.fillStyle = FOOTER_BG;
  ctx.fillRect(0, top, layout.width, layout.footerHeight);
  ctx.strokeStyle = FOOTER_RULE;
  ctx.beginPath();
  ctx.moveTo(0, top + 0.5);
  ctx.lineTo(layout.width, top + 0.5);
  ctx.stroke();

  const x = 24;
  const blockWidth = layout.width - x * 2;
  const columnGap = 36;
  const rectX = Math.floor(layout.width * 0.72);
  const textColumnWidth = rectX - x - columnGap;
  const rectColumnWidth = layout.width - rectX - x;

  let y = top + 28;
  y = drawMetadataBlock(ctx, "URL", url, x, y, blockWidth, 2) + 14;
  y = drawMetadataBlock(ctx, "Selector", selector, x, y, blockWidth, 1) + 14;
  drawMetadataBlock(ctx, "Texto", visibleText, x, y, textColumnWidth, 1);
  drawMetadataBlock(ctx, "Rect", rectText, rectX, y, rectColumnWidth, 1);
}

function drawMetadataBlock(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  maxLines: number,
): number {
  ctx.fillStyle = FOOTER_LABEL;
  ctx.font = "850 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.fillText(label, x, y);

  ctx.fillStyle = FOOTER_VALUE;
  ctx.font = "650 18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  return drawWrappedText(ctx, value, x, y + 27, maxWidth, 24, maxLines);
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);

  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length > 0) {
    visible[visible.length - 1] = `${visible[visible.length - 1]}...`;
  }

  visible.forEach((line, index) => {
    ctx.fillText(truncateToWidth(ctx, line, maxWidth), x, y + index * lineHeight);
  });

  return y + visible.length * lineHeight;
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, mid).trimEnd()}...`;
    if (ctx.measureText(candidate).width <= maxWidth) low = mid;
    else high = mid - 1;
  }

  return `${text.slice(0, low).trimEnd()}...`;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("render-failed: screenshot image could not load"));
    image.src = dataUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("render-failed: canvas did not produce a blob"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}
