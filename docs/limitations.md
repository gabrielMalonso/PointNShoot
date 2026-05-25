# Limitacoes

- Chrome/Chromium e o unico navegador suportado no MVP.
- `chrome://`, `chrome-extension://`, paginas internas e Chrome Web Store nao permitem injecao normal.
- `file://` pode exigir permissao manual no Chrome.
- Elementos fora do viewport nao sao capturados por inteiro.
- Iframes cross-origin sao limitados pela seguranca do navegador.
- Shadow DOM aberto pode ser inspecionado quando acessivel; Shadow DOM fechado aparece como host.
- Clipboard de imagem pode ser bloqueado pelo navegador ou ambiente. Nesse caso, o fallback abre preview e markdown.
- O MVP nao tenta editar codigo, localizar arquivos, chamar agentes ou sincronizar historico.
