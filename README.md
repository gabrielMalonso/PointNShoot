# PointNShoot

Extensao Chrome local para selecionar visualmente um elemento, escrever um comentario, salvar um PNG cropado e copiar uma UI Note para agentes de codigo.

## Usar localmente

```bash
pnpm install
pnpm build
```

Depois, abra `chrome://extensions`, ative o modo de desenvolvedor e carregue a pasta `dist` como extensao unpacked.

## Fluxo

1. Abra uma pagina web.
2. Clique no icone da extensao ou use `Alt+A` para abrir o overlay.
3. Clique em `Pick` para ligar a selecao.
4. Passe o mouse sobre um elemento.
5. Clique para travar a selecao.
6. Escreva o comentario.
7. Clique em `Copiar` ou pressione `Cmd+Enter`.
8. Cole a nota Markdown no agente de codigo.

O PNG e salvo em `Downloads/PointNShoot-PNG/`. A nota copiada separa `## Prompt` do usuario de `## Informacoes`, que contem o path absoluto do arquivo salvo e um bloco tecnico curto: URL redigida, elemento selecionado, elemento no ponto, texto, ponto, rect e pistas de layout. Se o clipboard de texto for bloqueado depois do download, PointNShoot abre um fallback com a nota completa selecionada para copia manual.

A subpasta de Downloads pode ser configurada via `chrome.storage.local` na chave `pointNShootDownloadFolder`; se ela nao existir, o fallback e `PointNShoot-PNG`.

## Validacao

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
pnpm smoke
```

## Escopo

PointNShoot nao tem backend, MCP, servidor local, automacao de codigo, login, cloud, telemetria, Native Messaging ou historico sincronizado. Os artefatos principais sao o PNG local salvo e a nota Markdown copiada.

## Documentacao

- [Arquitetura](docs/architecture.md)
- [Privacidade](docs/privacy.md)
- [Limitacoes](docs/limitations.md)

## Attribution

O padrao de interacao foi desenhado com Impeccable Live como referencia para picker, highlight, anotacao e contexto visual. Ver [NOTICE.md](NOTICE.md).
