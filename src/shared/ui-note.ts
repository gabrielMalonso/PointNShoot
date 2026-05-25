import { redactSensitiveText, sanitizeUrl, truncateText } from "./privacy";
import type { CaptureRequest, ElementContext } from "./types";

export type BuildUiNoteOptions = {
  imagePath?: string;
};

export function buildUiNote(request: CaptureRequest, options: BuildUiNoteOptions = {}): string {
  const element = request.element;
  const comment = request.privacyMode === "redact-sensitive" ? redactSensitiveText(request.comment) : request.comment;
  const url = request.privacyMode === "redact-sensitive" ? sanitizeUrl(element.url) : element.url;

  return [
    "# UI Note",
    "",
    "## Prompt",
    "",
    textBlock(comment, 500),
    "",
    "## Informacoes",
    "",
    "Imagem:",
    code(options.imagePath ?? "(imagem nao salva)"),
    "",
    "URL:",
    code(url),
    "",
    "Elemento selecionado:",
    code(element.shortSelector),
    "",
    "Elemento no ponto:",
    code(formatTopElementAtPoint(element)),
    "",
    "Texto:",
    code(element.visibleTextPreview || element.visibleText || "(sem texto visivel)"),
    "",
    "Ponto:",
    code(formatPoint(element)),
    "",
    "Rect:",
    code(formatRect(element)),
    "",
    "Pistas:",
    code(formatHints(element)),
  ].join("\n");
}

export function buildMinimalUiNote(comment: string): string {
  return [
    "# UI Note",
    "",
    "## Prompt",
    "",
    textBlock(comment, 500),
    "",
    "## Informacoes",
    "",
    "Imagem:",
    code("(imagem nao salva)"),
  ].join("\n");
}

function formatRect(element: ElementContext): string {
  const rect = element.boundingRect;
  return [
    `x=${round(rect.x)}`,
    `y=${round(rect.y)}`,
    `w=${round(rect.width)}`,
    `h=${round(rect.height)}`,
    `dpr=${element.viewport.devicePixelRatio}`,
  ].join(" ");
}

function formatHints(element: ElementContext): string {
  const styles = element.usefulStyles;
  return `position=${styles.position || "(vazio)"}; z-index=${styles.zIndex || "(vazio)"}; transform=${styles.transform || "(vazio)"}`;
}

function formatTopElementAtPoint(element: ElementContext): string {
  const top = element.topElementAtPoint;
  if (!top) return "(sem area visivel)";
  return `${top.label} [${top.shortSelector}]`;
}

function formatPoint(element: ElementContext): string {
  const top = element.topElementAtPoint;
  if (!top) return "x=(sem area visivel) y=(sem area visivel)";
  return `x=${round(top.x)} y=${round(top.y)}`;
}

function textBlock(value: string, maxLength: number): string {
  return truncateText(value, maxLength) || "(vazio)";
}

function code(value: string): string {
  return `\`${sanitizeInlineCode(value)}\``;
}

function sanitizeInlineCode(value: string): string {
  return value.replaceAll("`", "'").replace(/\s+/g, " ").trim();
}

function round(value: number): number {
  return Math.round(value);
}
