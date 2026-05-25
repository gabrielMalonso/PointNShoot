import { appendDiagnostic, errorDiagnostic, makeDiagnostic } from "../shared/diagnostics";
import { clipboardCapabilityDetails } from "../shared/clipboard-diagnostics";
import { toCaptureFailureReason } from "../shared/errors";
import { isRenderRequestMessage } from "../shared/messages";
import { buildMarkdownPrompt, renderAnnotatedPng } from "../shared/render-png";
import type { CaptureResult, DiagnosticLogEntry, RenderRequestMessage } from "../shared/types";

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isRenderRequestMessage(message)) return false;

  void handleRender(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      const request = message.payload.request;
      const diagnostics = [
        ...(message.payload.diagnostics ?? []),
        errorDiagnostic("offscreen", "render:unhandled-error", error, clipboardCapabilityDetails()),
      ];
      sendResponse({
        ok: false,
        reason: toCaptureFailureReason(error),
        fallback: {
          markdownPrompt: buildMarkdownPrompt(request),
          canSavePng: false,
          diagnostics,
        },
      } satisfies CaptureResult);
    });

  return true;
});

async function handleRender(message: RenderRequestMessage): Promise<CaptureResult> {
  const { request, screenshotDataUrl } = message.payload;
  let diagnostics: DiagnosticLogEntry[] = message.payload.diagnostics ?? [];
  const markdownPrompt = buildMarkdownPrompt(request);

  diagnostics = appendDiagnostic(
    diagnostics,
    makeDiagnostic("offscreen", "info", "render:start", "Offscreen render request received.", {
      requestId: request.id,
      screenshotDataUrlBytes: screenshotDataUrl.length,
      ...clipboardCapabilityDetails(),
    }),
  );

  const rendered = await renderAnnotatedPng({ request, screenshotDataUrl });
  diagnostics = appendDiagnostic(
    diagnostics,
    makeDiagnostic("offscreen", "info", "render:png", "Annotated PNG rendered; clipboard copy delegated to focused tab.", {
      requestId: request.id,
      imageBytes: rendered.imageBytes,
      width: rendered.width,
      height: rendered.height,
      blobType: rendered.blob.type,
    }),
  );

  return {
    ok: false,
    reason: "clipboard-blocked",
    fallback: {
      markdownPrompt,
      imageDataUrl: rendered.dataUrl,
      canSavePng: true,
      diagnostics,
    },
  };
}
