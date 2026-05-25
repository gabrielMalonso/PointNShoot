import { appendDiagnostic, errorDiagnostic, makeDiagnostic } from "../shared/diagnostics";
import { buildDownloadFilename, downloadRenderedPng, getConfiguredDownloadFolder } from "./downloads";
import { toCaptureFailureReason } from "../shared/errors";
import { isCaptureRequestMessage, isRenderImageResult, MESSAGE_TYPES } from "../shared/messages";
import type { CaptureRequest, CaptureResult, DiagnosticLogEntry, RenderImageResult, RenderRequestMessage } from "../shared/types";
import { buildUiNote } from "../shared/ui-note";

const OFFSCREEN_PATH = "offscreen/offscreen.html";
let creatingOffscreen: Promise<void> | null = null;

chrome.action.onClicked.addListener((tab) => {
  void activateTab(tab);
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle-pointnshoot") return;
  void activateCurrentTab();
});

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isCaptureRequestMessage(message)) return false;

  void handleCapture(message.payload, sender)
    .then(sendResponse)
    .catch((error: unknown) => sendResponse(failureResult(message.payload, error, [])));

  return true;
});

async function activateCurrentTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) await activateTab(tab);
}

async function activateTab(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) return;

  if (isRestrictedUrl(tab.url)) {
    await markTabBlocked(tab.id, "Pagina restrita");
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/boot.js"],
    });
    await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.toggleOverlay });
    await clearTabBadge(tab.id);
  } catch (error) {
    console.warn("[PointNShoot] activation failed", error);
    await markTabBlocked(tab.id, "Nao foi possivel ativar");
  }
}

async function handleCapture(request: CaptureRequest, sender: chrome.runtime.MessageSender): Promise<CaptureResult> {
  let diagnostics: DiagnosticLogEntry[] = [];

  try {
    diagnostics = appendDiagnostic(
      diagnostics,
      makeDiagnostic("background", "info", "capture:start", "Capture request received.", {
        requestId: request.id,
        selector: request.element.shortSelector,
        tabId: sender.tab?.id ?? null,
        windowId: sender.tab?.windowId ?? null,
      }),
    );

    const screenshotDataUrl = await captureVisibleTab(sender.tab?.windowId);
    diagnostics = appendDiagnostic(
      diagnostics,
      makeDiagnostic("background", "info", "capture:visible-tab", "Visible tab screenshot captured.", {
        requestId: request.id,
        dataUrlBytes: screenshotDataUrl.length,
      }),
    );

    await closeOffscreenDocument();
    await ensureOffscreenDocument();
    diagnostics = appendDiagnostic(
      diagnostics,
      makeDiagnostic("background", "info", "offscreen:ready", "Offscreen document ready.", {
        requestId: request.id,
      }),
    );

    const renderMessage: RenderRequestMessage = {
      type: MESSAGE_TYPES.renderRequest,
      payload: { request, screenshotDataUrl, diagnostics },
    };

    const renderResult = (await withTimeout(
      chrome.runtime.sendMessage(renderMessage),
      8_000,
      "render-failed: offscreen render timed out",
    )) as RenderImageResult | undefined;

    if (!renderResult) throw new Error("render-failed: offscreen document returned no result");
    if (!isRenderImageResult(renderResult)) throw new Error("render-failed: offscreen document returned malformed result");

    if (!renderResult.ok) {
      return {
        ...renderResult,
        diagnostics: renderResult.fallback.diagnostics,
        fallback: {
          ...renderResult.fallback,
          diagnostics: renderResult.fallback.diagnostics ?? diagnostics,
        },
      };
    }

    diagnostics = renderResult.diagnostics ?? diagnostics;
    diagnostics = appendDiagnostic(
      diagnostics,
      makeDiagnostic("background", "info", "download:start", "Saving rendered PNG to Downloads.", {
        requestId: request.id,
        imageBytes: renderResult.imageBytes,
        dataUrlBytes: renderResult.imageDataUrl.length,
      }),
    );

    const requestedFilename = buildDownloadFilename(request, {
      folder: await getConfiguredDownloadFolder(),
    });
    const savedImage = await downloadRenderedPng({
      imageDataUrl: renderResult.imageDataUrl,
      requestedFilename,
      imageBytes: renderResult.imageBytes,
      width: renderResult.width,
      height: renderResult.height,
    });
    diagnostics = appendDiagnostic(
      diagnostics,
      makeDiagnostic("background", "info", "download:complete", "PNG saved and absolute filename confirmed.", {
        requestId: request.id,
        downloadId: savedImage.downloadId,
        requestedFilename: savedImage.requestedFilename,
        filename: savedImage.filename,
      }),
    );

    return {
      ok: true,
      markdownPrompt: buildUiNote(request, { imagePath: savedImage.filename }),
      savedImage,
      diagnostics,
    };
  } catch (error) {
    diagnostics = appendDiagnostic(diagnostics, errorDiagnostic("background", "capture:error", error, { requestId: request.id }));
    return failureResult(request, error, diagnostics);
  } finally {
    await closeOffscreenDocument();
  }
}

function captureVisibleTab(windowId: number | undefined): Promise<string> {
  return new Promise((resolve, reject) => {
    const callback = (dataUrl?: string) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(`capture-failed: ${error.message}`));
        return;
      }

      if (!dataUrl) {
        reject(new Error("capture-failed: empty screenshot"));
        return;
      }

      resolve(dataUrl);
    };

    if (typeof windowId === "number") {
      chrome.tabs.captureVisibleTab(windowId, { format: "png" }, callback);
      return;
    }

    chrome.tabs.captureVisibleTab({ format: "png" }, callback);
  });
}

async function ensureOffscreenDocument(): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);
  const runtimeWithContexts = chrome.runtime as typeof chrome.runtime & {
    getContexts?: (filter: { contextTypes?: string[]; documentUrls?: string[] }) => Promise<unknown[]>;
  };

  const contexts = await runtimeWithContexts.getContexts?.({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });

  if (contexts && contexts.length > 0) return;

  if (!creatingOffscreen) {
    creatingOffscreen = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_PATH,
        reasons: ["BLOBS" as chrome.offscreen.Reason],
        justification: "Compose PointNShoot PNG crops locally before saving them.",
      })
      .finally(() => {
        creatingOffscreen = null;
      });
  }

  await creatingOffscreen;
}

async function closeOffscreenDocument(): Promise<void> {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);
  const runtimeWithContexts = chrome.runtime as typeof chrome.runtime & {
    getContexts?: (filter: { contextTypes?: string[]; documentUrls?: string[] }) => Promise<unknown[]>;
  };

  const contexts = await runtimeWithContexts.getContexts?.({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });

  if (!contexts || contexts.length === 0) return;

  try {
    await chrome.offscreen.closeDocument();
  } catch (error) {
    console.warn("[PointNShoot] could not close offscreen document", error);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function failureResult(request: CaptureRequest, error: unknown, diagnostics: DiagnosticLogEntry[]): CaptureResult {
  const reason = toCaptureFailureReason(error);
  return {
    ok: false,
    reason,
    fallback: {
      markdownPrompt: buildUiNote(request),
      diagnostics,
    },
  };
}

function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) return true;
  return /^(chrome|chrome-extension|edge|about):/i.test(url) || /^https:\/\/chromewebstore\.google\.com\//i.test(url);
}

async function markTabBlocked(tabId: number, title: string): Promise<void> {
  await chrome.action.setBadgeText({ tabId, text: "!" });
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#ff2f9c" });
  await chrome.action.setTitle({ tabId, title: `PointNShoot: ${title}` });
}

async function clearTabBadge(tabId: number): Promise<void> {
  await chrome.action.setBadgeText({ tabId, text: "" });
  await chrome.action.setTitle({ tabId, title: "PointNShoot" });
}
