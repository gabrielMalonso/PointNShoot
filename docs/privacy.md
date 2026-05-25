# Privacidade

PointNShoot processa tudo localmente no navegador.

- Nenhum upload.
- Nenhuma telemetria.
- Nenhum servidor local.
- Nenhuma permissao ampla de host por padrao.
- A permissao `activeTab` limita o acesso a aba que o usuario ativou.
- A permissao `downloads` e usada para salvar o PNG localmente em `Downloads/PointNShoot-PNG/`.
- A permissao `storage` guarda apenas a subpasta configurada de Downloads, quando existir.
- O PNG salvo usa crop ao redor do elemento selecionado, nao a pagina inteira, e nao desenha comentario ou metadados.
- A nota copiada contem o caminho absoluto local do PNG salvo.
- Texto visivel e metadados sao truncados.
- Valores longos em parametros de URL tambem sao redigidos, como `membershipId=<redacted>`.
- O modo padrao e `redact-sensitive`.

## Redacao basica

O MVP redige:

- e-mails;
- telefones;
- CPF e CNPJ;
- tokens longos;
- sequencias longas de numeros;
- parametros sensiveis de URL, como `token`, `password`, `secret`, `session` e similares;
- parametros de URL com valores longos, especialmente chaves terminadas em `id`.

O usuario ainda deve revisar a nota e o screenshot antes de colar em qualquer agente ou ferramenta externa, especialmente porque o path absoluto pode revelar nome de usuario, estrutura de pastas ou volume local.
