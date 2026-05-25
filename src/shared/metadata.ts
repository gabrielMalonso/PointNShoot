import { redactAndTruncate, sanitizeUrl, truncateText } from "./privacy";
import { describeParent, getCssPath, getElementClasses, getNthOfTypePath, getShortSelector } from "./selectors";
import type { ElementContext, PrivacyMode, Rect, ViewportInfo } from "./types";

export type BuildElementContextOptions = {
  privacyMode?: PrivacyMode;
  url?: string;
  title?: string;
  viewport?: ViewportInfo;
};

export function buildElementContext(element: Element, options: BuildElementContextOptions = {}): ElementContext {
  const privacyMode = options.privacyMode ?? "redact-sensitive";
  const rect = domRectToRect(element.getBoundingClientRect());
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
    viewport: options.viewport ?? getViewportInfo(),
    url: processedUrl,
    pageTitle: options.title ?? globalThis.document?.title ?? "",
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
