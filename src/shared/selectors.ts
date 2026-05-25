export function escapeCssIdentifier(value: string): string {
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(value);

  return value.replace(/(^-?\d)|[^a-zA-Z0-9_-]/g, (match, leadingDigit: string | undefined) => {
    if (leadingDigit) return `\\3${leadingDigit} `;
    const code = match.codePointAt(0)?.toString(16) ?? "0";
    return `\\${code} `;
  });
}

export function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\a ");
}

const STABLE_SELECTOR_ATTRIBUTES = ["data-testid", "data-test-id", "data-cy", "data-qa", "data-component"] as const;

export function getElementClasses(element: Element, limit = 4): string[] {
  return Array.from(element.classList)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !item.startsWith("pointnshoot-"))
    .slice(0, limit);
}

export function getStableSelector(element: Element): string | null {
  const tag = element.tagName.toLowerCase();

  for (const attribute of STABLE_SELECTOR_ATTRIBUTES) {
    const value = element.getAttribute(attribute)?.trim();
    if (value) return `${tag}[${attribute}="${escapeCssString(value)}"]`;
  }

  return null;
}

export function getNearestStableAncestorSelector(element: Element): string | null {
  let current = element.parentElement;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const stableSelector = getStableSelector(current);
    if (stableSelector) return stableSelector;
    current = current.parentElement;
  }

  return null;
}

export function getShortSelector(element: Element): string {
  const stableSelector = getStableSelector(element);
  if (stableSelector) return stableSelector;

  const ancestorSelector = getNearestStableAncestorSelector(element);
  if (ancestorSelector) return ancestorSelector;

  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${escapeCssIdentifier(element.id)}` : "";
  const classes = getElementClasses(element, 3)
    .map((item) => `.${escapeCssIdentifier(item)}`)
    .join("");

  return `${tag}${id}${classes}`;
}

export function getNthOfType(element: Element): number {
  let index = 1;
  let sibling = element.previousElementSibling;

  while (sibling) {
    if (sibling.tagName === element.tagName) index += 1;
    sibling = sibling.previousElementSibling;
  }

  return index;
}

export function getCssPath(element: Element): string {
  const segments: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    const tag = current.tagName.toLowerCase();
    const stableSelector = getStableSelector(current);
    if (stableSelector) {
      segments.unshift(stableSelector);
      break;
    }

    if (current.id) {
      segments.unshift(`${tag}#${escapeCssIdentifier(current.id)}`);
      break;
    }

    const classes = getElementClasses(current, 2)
      .map((item) => `.${escapeCssIdentifier(item)}`)
      .join("");
    const nth = getNthOfType(current);
    segments.unshift(`${tag}${classes}:nth-of-type(${nth})`);
    current = current.parentElement;
  }

  return segments.join(" > ");
}

export function getNthOfTypePath(element: Element): string {
  const segments: string[] = [];
  let current: Element | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    segments.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${getNthOfType(current)})`);
    current = current.parentElement;
  }

  return segments.join(" > ");
}

export function describeParent(element: Element): string | null {
  const parent = element.parentElement;
  if (!parent) return null;
  return getShortSelector(parent);
}
