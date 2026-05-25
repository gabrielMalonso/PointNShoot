# Arquitetura

PointNShoot e uma extensao Chrome Manifest V3 sem backend.

## Fluxo

1. O service worker recebe clique no icone ou `Alt+A`.
2. O worker injeta `content/boot.js` na aba ativa via `chrome.scripting.executeScript`.
3. O content script cria UI em Shadow DOM, permite hover, selecao e comentario.
4. No `Cmd+Enter`, a UI se oculta antes da captura.
5. O worker chama `chrome.tabs.captureVisibleTab`.
6. O worker cria ou reutiliza `offscreen/offscreen.html`.
7. O offscreen document compoe o PNG em canvas e tenta copiar `image/png` para o clipboard.
8. Se a copia falhar, o content script mostra fallback com preview, salvar PNG e copiar texto.

## Build

Vite gera o service worker e o offscreen script como ES modules. O content script e empacotado via esbuild como IIFE porque arquivos injetados por `chrome.scripting.executeScript` precisam ser autocontidos.

## Sem servidor

Nao ha MCP, polling, WebSocket, SSE, servidor local, cloud, login, telemetria ou historico sincronizado.
