# Limitacoes

- Chrome/Chromium e o unico navegador suportado no MVP.
- `chrome://`, `chrome-extension://`, paginas internas e Chrome Web Store nao permitem injecao normal.
- `file://` pode exigir permissao manual no Chrome.
- Elementos fora do viewport nao sao capturados por inteiro.
- Iframes cross-origin sao limitados pela seguranca do navegador.
- Shadow DOM aberto pode ser inspecionado quando acessivel; Shadow DOM fechado aparece como host.
- Downloads podem ficar pendentes ou ser bloqueados por politica/prompt do Chrome; nesses casos a captura falha sem inventar path local.
- A pasta configuravel e uma subpasta relativa a Downloads; o Chrome nao permite escolher um path absoluto arbitrario sem helper nativo.
- O path absoluto so entra na nota quando `chrome.downloads.search` confirma `DownloadItem.filename`.
- Clipboard de texto pode ser bloqueado pelo navegador ou ambiente mesmo depois do PNG salvo. Nesse caso, o fallback mostra a nota completa em textarea selecionada.
- Nao ha botoes separados de copiar PNG, salvar PNG ou copiar texto no fallback principal.
- O MVP nao tenta editar codigo, localizar arquivos, chamar agentes ou sincronizar historico.
