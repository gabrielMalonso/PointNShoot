import { COPY, SHORTCUTS } from "../shared/copy";
import { formatDiagnostics, formatFallbackText } from "../shared/diagnostics";
import type { CaptureFallback, Rect } from "../shared/types";

export type OverlayRefs = {
  host: HTMLElement;
  eventShield: HTMLDivElement;
  hud: HTMLElement;
  hudPickButton: HTMLButtonElement;
  bridgeStatus: HTMLSpanElement;
  hudCloseButton: HTMLButtonElement;
  hoverBox: HTMLDivElement;
  lockedBox: HTMLDivElement;
  badge: HTMLDivElement;
  panel: HTMLDivElement;
  textarea: HTMLTextAreaElement;
  debugButton: HTMLButtonElement;
  primaryButton: HTMLButtonElement;
  secondaryButton: HTMLButtonElement;
  toast: HTMLDivElement;
  fallback: HTMLDivElement;
};

export type FallbackHandlers = {
  onClose: () => void;
};

export type BridgeStatusPresentation = {
  state: "checking" | "connected" | "warning" | "error";
  label: string;
  title?: string;
};

export function renderOverlayChrome(shadow: ShadowRoot): OverlayRefs {
  shadow.innerHTML = `
    <style>${overlayCss()}</style>
    <div class="event-shield" part="event-shield" data-testid="pointnshoot-event-shield"></div>
    <nav class="hud" part="hud" aria-label="${COPY.hudTitle}" data-testid="pointnshoot-hud">
      <span class="hud-mark" aria-hidden="true">/</span>
      <button class="hud-pick" type="button" aria-pressed="false" data-testid="pointnshoot-pick">
        <span class="hud-pick-dot" aria-hidden="true"></span>
        ${COPY.pick}
      </button>
      <span class="hud-title">${COPY.hudTitle}</span>
      <span class="bridge-status is-checking" title="${COPY.bridgeChecking}" data-testid="pointnshoot-bridge-status">${COPY.bridgeChecking}</span>
      <button class="hud-close" type="button" aria-label="${COPY.closeOverlay}" data-testid="pointnshoot-close">×</button>
    </nav>
    <div class="box hover" part="hover"></div>
    <div class="box locked" part="locked"></div>
    <div class="badge" part="badge"></div>
    <section class="panel" part="panel" aria-label="PointNShoot">
      <label class="label" for="pointnshoot-comment">${COPY.commentLabel}</label>
      <textarea id="pointnshoot-comment" aria-label="${COPY.commentLabel}" placeholder="${COPY.commentPlaceholder}" spellcheck="true"></textarea>
      <div class="actions">
        <button class="debug-toggle" type="button" aria-pressed="false" title="${COPY.debugMode}" data-testid="pointnshoot-debug">${COPY.debug}</button>
        <span class="actions-fill" aria-hidden="true"></span>
        <button class="secondary" type="button">${COPY.cancel}</button>
        <button class="primary" type="button">${COPY.capture}</button>
      </div>
      <div class="keys">${SHORTCUTS.submit} · ${SHORTCUTS.cancel}</div>
    </section>
    <section class="fallback" part="fallback" aria-label="${COPY.fallbackTitle}"></section>
    <div class="toast" part="toast" role="status" aria-live="polite"></div>
  `;

  const host = shadow.host as HTMLElement;
  return {
    host,
    eventShield: mustFind<HTMLDivElement>(shadow, ".event-shield"),
    hud: mustFind<HTMLElement>(shadow, ".hud"),
    hudPickButton: mustFind<HTMLButtonElement>(shadow, ".hud-pick"),
    bridgeStatus: mustFind<HTMLSpanElement>(shadow, ".bridge-status"),
    hudCloseButton: mustFind<HTMLButtonElement>(shadow, ".hud-close"),
    hoverBox: mustFind<HTMLDivElement>(shadow, ".hover"),
    lockedBox: mustFind<HTMLDivElement>(shadow, ".locked"),
    badge: mustFind<HTMLDivElement>(shadow, ".badge"),
    panel: mustFind<HTMLDivElement>(shadow, ".panel"),
    textarea: mustFind<HTMLTextAreaElement>(shadow, "textarea"),
    debugButton: mustFind<HTMLButtonElement>(shadow, ".debug-toggle"),
    primaryButton: mustFind<HTMLButtonElement>(shadow, ".primary"),
    secondaryButton: mustFind<HTMLButtonElement>(shadow, ".secondary"),
    toast: mustFind<HTMLDivElement>(shadow, ".toast"),
    fallback: mustFind<HTMLDivElement>(shadow, ".fallback"),
  };
}

export function showHud(refs: OverlayRefs): void {
  refs.hud.style.display = "flex";
  refs.hud.style.opacity = "1";
  refs.hud.style.pointerEvents = "auto";
}

export function hideHud(refs: OverlayRefs): void {
  refs.hud.style.opacity = "0";
  refs.hud.style.pointerEvents = "none";
  refs.hud.style.display = "none";
}

export function setPickActive(refs: OverlayRefs, active: boolean): void {
  refs.hudPickButton.setAttribute("aria-pressed", String(active));
  refs.hudPickButton.classList.toggle("is-active", active);
}

export function setDebugMode(refs: OverlayRefs, active: boolean): void {
  refs.debugButton.setAttribute("aria-pressed", String(active));
  refs.debugButton.classList.toggle("is-active", active);
}

export function setBridgeStatus(refs: OverlayRefs, status: BridgeStatusPresentation): void {
  refs.bridgeStatus.textContent = status.label;
  refs.bridgeStatus.title = status.title ?? status.label;
  refs.bridgeStatus.classList.toggle("is-checking", status.state === "checking");
  refs.bridgeStatus.classList.toggle("is-connected", status.state === "connected");
  refs.bridgeStatus.classList.toggle("is-warning", status.state === "warning");
  refs.bridgeStatus.classList.toggle("is-error", status.state === "error");
}

export function setPageInteractionBlocked(refs: OverlayRefs, blocked: boolean): void {
  refs.eventShield.style.display = blocked ? "block" : "none";
  refs.eventShield.style.pointerEvents = blocked ? "auto" : "none";
}

export function showPanel(refs: OverlayRefs, rect: Rect): void {
  const panelWidth = Math.min(340, Math.max(280, window.innerWidth - 24));
  const rightSpace = window.innerWidth - (rect.x + rect.width);
  const left = rightSpace > panelWidth + 18 ? rect.x + rect.width + 12 : Math.min(window.innerWidth - panelWidth - 12, Math.max(12, rect.x));
  const below = rect.y + rect.height + 12;
  const above = rect.y - 178;
  const top = below + 170 < window.innerHeight ? below : Math.max(12, above);

  Object.assign(refs.panel.style, {
    display: "block",
    opacity: "1",
    pointerEvents: "auto",
    width: `${panelWidth}px`,
    transform: `translate(${Math.round(left)}px, ${Math.round(top)}px)`,
  });
}

export function hidePanel(refs: OverlayRefs): void {
  refs.panel.style.opacity = "0";
  refs.panel.style.pointerEvents = "none";
  refs.panel.style.display = "none";
}

export function showBadge(refs: OverlayRefs, label: string, rect: Rect): void {
  refs.badge.textContent = label;
  const top = rect.y > 28 ? rect.y - 28 : rect.y + rect.height + 8;
  const left = Math.min(window.innerWidth - 24, Math.max(8, rect.x));
  Object.assign(refs.badge.style, {
    display: "block",
    opacity: "1",
    transform: `translate(${Math.round(left)}px, ${Math.round(top)}px)`,
  });
}

export function hideBadge(refs: OverlayRefs): void {
  refs.badge.style.opacity = "0";
  refs.badge.style.display = "none";
}

export function showToast(refs: OverlayRefs, message: string, timeoutMs = 2200): void {
  refs.toast.textContent = message;
  refs.toast.style.display = "block";
  refs.toast.style.opacity = "1";
  window.setTimeout(() => {
    refs.toast.style.opacity = "0";
  }, timeoutMs);
}

export function setCapturing(refs: OverlayRefs, capturing: boolean): void {
  refs.primaryButton.disabled = capturing;
  refs.secondaryButton.disabled = capturing;
  refs.debugButton.disabled = capturing;
  refs.textarea.disabled = capturing;
  refs.primaryButton.textContent = capturing ? COPY.copying : COPY.capture;
}

export function showFallback(refs: OverlayRefs, fallback: CaptureFallback, handlers: FallbackHandlers): void {
  const fallbackText = formatFallbackText(fallback.markdownPrompt, fallback.diagnostics);
  const diagnostics = formatDiagnostics(fallback.diagnostics);
  const clipboardBlocked = diagnostics.includes("clipboard:writeText:error");
  const diagnosticsBlock = diagnostics
    ? `<details class="fallback-diagnostics" open>
        <summary>Detalhes técnicos</summary>
        <pre>${escapeHtml(diagnostics)}</pre>
      </details>`
    : "";

  refs.fallback.innerHTML = `
    <div class="fallback-head">
      <strong>${COPY.fallbackTitle}</strong>
      <button class="fallback-close" type="button" aria-label="Fechar">×</button>
    </div>
    ${clipboardBlocked ? `<p class="fallback-note">${COPY.fallbackManual}</p>` : ""}
    <textarea class="fallback-text" aria-label="Prompt markdown">${escapeHtml(fallbackText)}</textarea>
    ${diagnosticsBlock}
  `;

  refs.fallback.style.display = "block";
  refs.fallback.style.opacity = "1";
  refs.fallback.style.pointerEvents = "auto";
  refs.fallback.querySelector<HTMLButtonElement>(".fallback-close")?.addEventListener("click", handlers.onClose);
  const textarea = refs.fallback.querySelector<HTMLTextAreaElement>(".fallback-text");
  textarea?.focus({ preventScroll: true });
  textarea?.select();
}

export function hideFallback(refs: OverlayRefs): void {
  refs.fallback.style.opacity = "0";
  refs.fallback.style.pointerEvents = "none";
  refs.fallback.style.display = "none";
  refs.fallback.innerHTML = "";
}

function mustFind<T extends Element>(root: ShadowRoot, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`PointNShoot UI missing ${selector}`);
  return element;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function overlayCss(): string {
  return `
    :host {
      --pns-bg: #f8fbff;
      --pns-ink: #0e1b2a;
      --pns-muted: #60758a;
      --pns-line: #c9d8e6;
      --pns-accent: #ff2f9c;
      --pns-accent-soft: rgba(255, 47, 156, 0.14);
      --pns-shell: #071827;
      --pns-shell-line: #18354d;
      --pns-shell-muted: #8cc8ec;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    }

    * { box-sizing: border-box; }

    .event-shield {
      position: fixed;
      inset: 0;
      display: none;
      pointer-events: none;
      background: transparent;
      z-index: 0;
    }

    .hud {
      position: fixed;
      left: 50%;
      bottom: 16px;
      display: none;
      align-items: center;
      gap: 6px;
      height: 38px;
      max-width: calc(100vw - 24px);
      transform: translateX(-50%);
      border: 1px solid rgba(140, 200, 236, 0.22);
      border-radius: 10px;
      background: var(--pns-shell);
      color: #f4f9ff;
      padding: 4px;
      pointer-events: auto;
      z-index: 4;
      box-shadow: 0 18px 46px rgba(7, 24, 39, 0.32), 0 2px 10px rgba(7, 24, 39, 0.22);
      transition: opacity 140ms ease;
    }

    .hud-mark {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      color: #f4f9ff;
      font: 760 20px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .hud-pick {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: 30px;
      border-color: rgba(140, 200, 236, 0.18);
      border-radius: 8px;
      background: rgba(248, 251, 255, 0.06);
      color: #d8e9f7;
      padding: 0 11px;
    }

    .hud-pick:hover {
      border-color: rgba(140, 200, 236, 0.34);
      background: rgba(248, 251, 255, 0.1);
    }

    .hud-pick.is-active {
      border-color: rgba(255, 47, 156, 0.38);
      background: rgba(255, 47, 156, 0.28);
      color: #fff8fc;
    }

    .hud-pick-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--pns-shell-muted);
      box-shadow: 0 0 0 2px rgba(140, 200, 236, 0.15);
    }

    .hud-pick.is-active .hud-pick-dot {
      background: var(--pns-accent);
      box-shadow: 0 0 0 2px rgba(255, 47, 156, 0.2), 0 0 12px rgba(255, 47, 156, 0.42);
    }

    .hud-title {
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: rgba(244, 249, 255, 0.72);
      padding: 0 4px;
      font: 650 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .bridge-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: clamp(112px, 36vw, 300px);
      min-width: 104px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: rgba(244, 249, 255, 0.72);
      border-left: 1px solid rgba(140, 200, 236, 0.16);
      padding: 0 8px;
      font-size: 11px;
      font-weight: 650;
    }

    .bridge-status::before {
      content: "";
      flex: 0 0 auto;
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: rgba(244, 249, 255, 0.46);
    }

    .bridge-status.is-connected {
      color: #bff5dc;
    }

    .bridge-status.is-connected::before {
      background: #4fe28f;
      box-shadow: 0 0 9px rgba(79, 226, 143, 0.48);
    }

    .bridge-status.is-warning {
      color: #ffe6a8;
    }

    .bridge-status.is-warning::before {
      background: #f7bf3c;
    }

    .bridge-status.is-error {
      color: #ffc0c7;
    }

    .bridge-status.is-error::before {
      background: #ff6577;
    }

    .hud-close {
      width: 30px;
      height: 30px;
      border-color: rgba(140, 200, 236, 0.12);
      border-radius: 8px;
      background: transparent;
      color: rgba(244, 249, 255, 0.68);
      padding: 0;
      font-size: 18px;
      line-height: 1;
    }

    .hud-close:hover {
      background: rgba(248, 251, 255, 0.08);
      color: #f4f9ff;
    }

    .box {
      position: fixed;
      top: 0;
      left: 0;
      display: none;
      pointer-events: none;
      z-index: 2;
      border-radius: 4px;
      transition: transform 150ms cubic-bezier(0.22, 1, 0.36, 1), opacity 120ms ease;
    }

    .hover {
      border: 2px solid var(--pns-accent);
      box-shadow: 0 0 0 1px rgba(36, 21, 30, 0.2), 0 0 0 6px var(--pns-accent-soft);
    }

    .locked {
      border: 2px solid var(--pns-accent);
      box-shadow: inset 0 0 0 1px rgba(255, 250, 245, 0.9), 0 0 0 9999px rgba(36, 21, 30, 0.08);
    }

    .badge {
      position: fixed;
      top: 0;
      left: 0;
      display: none;
      max-width: min(520px, calc(100vw - 16px));
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      pointer-events: none;
      z-index: 3;
      background: var(--pns-ink);
      color: #fffaf5;
      border: 1px solid rgba(255, 250, 245, 0.2);
      border-radius: 6px;
      padding: 4px 8px;
      font: 600 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      box-shadow: 0 10px 28px rgba(36, 21, 30, 0.22);
    }

    .panel,
    .fallback {
      position: fixed;
      top: 0;
      left: 0;
      display: none;
      background: var(--pns-bg);
      color: var(--pns-ink);
      border: 1px solid var(--pns-line);
      border-radius: 8px;
      box-shadow: 0 18px 50px rgba(36, 21, 30, 0.22), 0 3px 12px rgba(36, 21, 30, 0.12);
      z-index: 5;
    }

    .panel {
      padding: 12px;
      transition: opacity 120ms ease;
    }

    .label {
      display: block;
      margin-bottom: 7px;
      color: var(--pns-muted);
      font-size: 12px;
      font-weight: 650;
    }

    textarea {
      width: 100%;
      min-height: 84px;
      max-height: 160px;
      resize: vertical;
      border: 1px solid var(--pns-line);
      border-radius: 7px;
      background: #f7f4f1;
      color: var(--pns-ink);
      padding: 9px 10px;
      font: 500 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      outline: none;
    }

    textarea:focus {
      border-color: var(--pns-accent);
      box-shadow: 0 0 0 3px var(--pns-accent-soft);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-top: 10px;
    }

    .actions-fill {
      flex: 1 1 auto;
      min-width: 8px;
    }

    .panel button,
    .fallback button {
      height: 30px;
      border-radius: 7px;
      border: 1px solid var(--pns-line);
      padding: 0 10px;
      font: 650 12px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      cursor: pointer;
    }

    .panel button:disabled,
    .fallback button:disabled {
      cursor: not-allowed;
      opacity: 0.58;
    }

    .primary {
      background: var(--pns-ink);
      border-color: var(--pns-ink);
      color: #fffaf5;
    }

    .secondary {
      background: transparent;
      color: var(--pns-ink);
    }

    .debug-toggle {
      background: rgba(14, 27, 42, 0.04);
      color: var(--pns-muted);
      min-width: 62px;
    }

    .debug-toggle:hover {
      border-color: rgba(255, 47, 156, 0.34);
      color: var(--pns-ink);
    }

    .debug-toggle.is-active {
      border-color: rgba(255, 47, 156, 0.52);
      background: var(--pns-accent-soft);
      color: var(--pns-ink);
    }

    .keys {
      margin-top: 8px;
      color: var(--pns-muted);
      font: 500 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    .toast {
      position: fixed;
      right: 14px;
      bottom: 14px;
      display: none;
      max-width: min(360px, calc(100vw - 28px));
      pointer-events: none;
      background: var(--pns-ink);
      color: #fffaf5;
      border-radius: 8px;
      padding: 9px 11px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 14px 36px rgba(36, 21, 30, 0.24);
      transition: opacity 160ms ease;
    }

    .fallback {
      right: 14px;
      bottom: 14px;
      left: auto;
      top: auto;
      width: min(520px, calc(100vw - 28px));
      max-height: min(760px, calc(100vh - 28px));
      padding: 12px;
      overflow: auto;
    }

    .fallback .primary {
      min-width: 96px;
    }

    .fallback-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 13px;
    }

    .fallback-note {
      margin: 0 0 10px;
      border-radius: 7px;
      background: var(--pns-accent-soft);
      color: var(--pns-ink);
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 650;
      line-height: 1.35;
    }

    .fallback-close {
      width: 28px;
      padding: 0;
      background: transparent;
    }

    .fallback-image {
      display: block;
      width: 100%;
      max-height: 320px;
      object-fit: contain;
      background: #f7f4f1;
      border: 1px solid var(--pns-line);
      border-radius: 6px;
    }

    .fallback-empty {
      display: grid;
      place-items: center;
      height: 120px;
      border: 1px solid var(--pns-line);
      border-radius: 6px;
      color: var(--pns-muted);
      background: #f7f4f1;
      font-size: 13px;
    }

    .fallback-text {
      min-height: 140px;
      margin-top: 10px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }

    .fallback-diagnostics {
      margin-top: 10px;
      border: 1px solid var(--pns-line);
      border-radius: 7px;
      background: #f7f4f1;
      color: var(--pns-ink);
      overflow: hidden;
    }

    .fallback-diagnostics summary {
      cursor: pointer;
      padding: 8px 10px;
      color: var(--pns-muted);
      font-size: 12px;
      font-weight: 650;
    }

    .fallback-diagnostics pre {
      max-height: 180px;
      overflow: auto;
      margin: 0;
      padding: 0 10px 10px;
      white-space: pre-wrap;
      word-break: break-word;
      color: var(--pns-ink);
      font: 11px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
  `;
}
