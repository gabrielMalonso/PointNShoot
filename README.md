# PointNShoot

Extensao Chrome local para selecionar visualmente um elemento, escrever um comentario e copiar um PNG anotado para colar em agentes de codigo.

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
7. Pressione `Cmd+Enter`.
8. Cole o PNG no agente de codigo.

Se a copia do PNG for bloqueada, PointNShoot abre um fallback com preview, botao de salvar PNG e texto markdown copiavel.

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

PointNShoot nao tem backend, MCP, servidor local, automacao de codigo, login, cloud, telemetria ou historico sincronizado. O artefato principal e o PNG anotado no clipboard.

## Documentacao

- [Arquitetura](docs/architecture.md)
- [Privacidade](docs/privacy.md)
- [Limitacoes](docs/limitations.md)

## Attribution

O padrao de interacao foi desenhado com Impeccable Live como referencia para picker, highlight, anotacao e contexto visual. Ver [NOTICE.md](NOTICE.md).
