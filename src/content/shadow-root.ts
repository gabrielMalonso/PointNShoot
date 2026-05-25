export const ROOT_ID = "pointnshoot-root";

export type PointNShootShadow = {
  host: HTMLDivElement;
  shadow: ShadowRoot;
};

export function createPointNShootShadowRoot(doc: Document = document): PointNShootShadow {
  const existing = doc.getElementById(ROOT_ID) as HTMLDivElement | null;
  const host = existing ?? doc.createElement("div");

  if (!existing) {
    host.id = ROOT_ID;
    host.dataset.pointnshootRoot = "true";
    doc.documentElement.appendChild(host);
  }

  Object.assign(host.style, {
    position: "fixed",
    inset: "0",
    width: "0",
    height: "0",
    pointerEvents: "none",
    zIndex: "2147483646",
  });

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  return { host, shadow };
}

export function isPointNShootEvent(event: Event, host: HTMLElement): boolean {
  return event.composedPath().includes(host);
}

export function stopHostilePageHandlers(element: HTMLElement): void {
  const stop = (event: Event) => event.stopPropagation();
  element.addEventListener("pointerdown", stop);
  element.addEventListener("mousedown", stop);
  element.addEventListener("mouseup", stop);
  element.addEventListener("pointerup", stop);
  element.addEventListener("click", stop);
  element.addEventListener("focusin", stop);
}
