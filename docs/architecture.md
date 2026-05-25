# Arquitetura

PointNShoot e uma extensao Chrome Manifest V3 sem backend.

## Fluxo

1. O service worker recebe clique no icone ou `Alt+A`.
2. O worker injeta `content/boot.js` na aba ativa via `chrome.scripting.executeScript`.
3. O content script cria um overlay persistente em Shadow DOM; o botao `Pick` liga ou desliga hover, selecao e comentario.
4. No `Cmd+Enter`, a UI se oculta antes da captura.
5. O worker chama `chrome.tabs.captureVisibleTab`.
6. O worker cria ou reutiliza `offscreen/offscreen.html`.
7. O offscreen document compoe o PNG em canvas e devolve o `image/png` ao content script.
8. O content script tenta copiar o PNG a partir da aba focada; se a copia falhar, mostra fallback com preview, salvar PNG e copiar texto.

## Build

Vite gera o service worker e o offscreen script como ES modules. O content script e empacotado via esbuild como IIFE porque arquivos injetados por `chrome.scripting.executeScript` precisam ser autocontidos.

## Sem servidor

Nao ha MCP, polling, WebSocket, SSE, servidor local, cloud, login, telemetria ou historico sincronizado.
