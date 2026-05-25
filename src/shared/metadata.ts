import { redactAndTruncate, sanitizeUrl, truncateText } from "./privacy";
import { describeParent, getCssPath, getElementClasses, getNthOfTypePath, getShortSelector } from "./selectors";
import type { ElementContext, PrivacyMode, Rect, TopElementAtPoint, UsefulStyles, ViewportInfo } from "./types";

export type BuildElementContextOptions = {
  privacyMode?: PrivacyMode;
  url?: string;
  title?: string;
  viewport?: ViewportInfo;
};

export function buildElementContext(element: Element, options: BuildElementContextOptions = {}): ElementContext {
  const privacyMode = options.privacyMode ?? "redact-sensitive";
  const rect = domRectToRect(element.getBoundingClientRect());
  const viewport = options.viewport ?? getViewportInfo();
  const visibleText = getVisibleText(element);
  const processedText = privacyMode === "redact-sensitive" ? redactAndTruncate(visibleText, 500) : truncateText(visibleText, 500);
  const url = options.url ?? globalThis.location?.href ?? "";
  const processedUrl = privacyMode === "redact-sensitive" ? sanitizeUrl(url) : url;
  const siblingStats = getSiblingStats(element);

  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || null,
    classes: getElementClasses(element, 8),
    shortSelector: getShortSelector(element),
    cssPath: getCssPath(element),
    nthOfTypePath: getNthOfTypePath(element),
    role: getRole(element),
    accessibleName: getAccessibleName(element),
    visibleText: processedText,
    visibleTextPreview: truncateText(processedText, 140),
    parentSummary: describeParent(element),
    siblingIndex: siblingStats.index,
    similarSiblingCount: siblingStats.count,
    boundingRect: rect,
    viewport,
    url: processedUrl,
    pageTitle: options.title ?? globalThis.document?.title ?? "",
    usefulStyles: getUsefulStyles(element),
    topElementAtPoint: getTopElementAtPoint(rect, viewport, element.ownerDocument ?? globalThis.document),
  };
}

export function getViewportInfo(): ViewportInfo {
  const visualViewport = globalThis.visualViewport;

  return {
    width: globalThis.innerWidth ?? 0,
    height: globalThis.innerHeight ?? 0,
    devicePixelRatio: globalThis.devicePixelRatio ?? 1,
    scrollX: globalThis.scrollX ?? 0,
    scrollY: globalThis.scrollY ?? 0,
    visualViewportOffsetLeft: visualViewport?.offsetLeft ?? 0,
    visualViewportOffsetTop: visualViewport?.offsetTop ?? 0,
    visualViewportScale: visualViewport?.scale ?? 1,
  };
}

export function domRectToRect(rect: DOMRect | DOMRectReadOnly): Rect {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

function getVisibleText(element: Element): string {
  const htmlElement = element as HTMLElement;
  return htmlElement.innerText ?? element.textContent ?? "";
}

function getUsefulStyles(element: Element): UsefulStyles {
  const fallback: UsefulStyles = {
    position: "",
    zIndex: "",
    display: "",
    visibility: "",
    opacity: "",
    transform: "",
    pointerEvents: "",
    overflow: "",
    isolation: "",
  };

  try {
    const style = element.ownerDocument?.defaultView?.getComputedStyle(element);
    if (!style) return fallback;

    return {
      position: style.position,
      zIndex: style.zIndex,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      transform: style.transform,
      pointerEvents: style.pointerEvents,
      overflow: style.overflow,
      isolation: style.isolation,
    };
  } catch {
    return fallback;
  }
}

function getTopElementAtPoint(rect: Rect, viewport: ViewportInfo, ownerDocument: Document | undefined): TopElementAtPoint | null {
  const visibleRect = intersectRects(rect, {
    x: 0,
    y: 0,
    width: viewport.width,
    height: viewport.height,
  });

  if (visibleRect.width <= 0 || visibleRect.height <= 0) return null;

  const x = clamp(visibleRect.x + visibleRect.width / 2, 0, Math.max(0, viewport.width - 1));
  const y = clamp(visibleRect.y + visibleRect.height / 2, 0, Math.max(0, viewport.height - 1));

  try {
    const topElement = ownerDocument?.elementFromPoint?.(x, y);
    if (!topElement) return null;

    return {
      x,
      y,
      label: getElementLabel(topElement),
      shortSelector: getShortSelector(topElement),
    };
  } catch {
    return null;
  }
}

function getRole(element: Element): string | null {
  const explicit = element.getAttribute("role");
  if (explicit) return explicit;

  const tag = element.tagName.toLowerCase();
  if (tag === "button") return "button";
  if (tag === "a" && element.hasAttribute("href")) return "link";
  if (tag === "input") {
    const type = element.getAttribute("type") ?? "text";
    if (type === "checkbox") return "checkbox";
    if (type === "radio") return "radio";
    return "textbox";
  }
  if (tag === "textarea") return "textbox";
  if (tag === "select") return "combobox";

  return null;
}

function getAccessibleName(element: Element): string | null {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return truncateText(ariaLabel, 140);

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy && element.ownerDocument) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => element.ownerDocument.getElementById(id)?.textContent ?? "")
      .join(" ");
    if (text.trim()) return truncateText(text, 140);
  }

  const alt = element.getAttribute("alt");
  if (alt) return truncateText(alt, 140);

  const title = element.getAttribute("title");
  if (title) return truncateText(title, 140);

  const role = getRole(element);
  if (role === "button" || role === "link") {
    const text = getVisibleText(element);
    if (text.trim()) return truncateText(text, 140);
  }

  return null;
}

function getSiblingStats(element: Element): { index: number; count: number } {
  const parent = element.parentElement;
  if (!parent) return { index: 0, count: 1 };

  const key = getSimilarityKey(element);
  const siblings = Array.from(parent.children).filter((child) => getSimilarityKey(child) === key);
  return {
    index: Math.max(0, siblings.indexOf(element)),
    count: Math.max(1, siblings.length),
  };
}

function getSimilarityKey(element: Element): string {
  return `${element.tagName.toLowerCase()}|${getElementClasses(element, 3).sort().join(".")}`;
}

function getElementLabel(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const classes = getElementClasses(element, 2)
    .map((item) => `.${item}`)
    .join("");
  return `${tag}${id}${classes}`;
}

function intersectRects(a: Rect, b: Rect): Rect {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  return {
    x: x1,
    y: y1,
    width: Math.max(0, x2 - x1),
    height: Math.max(0, y2 - y1),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
