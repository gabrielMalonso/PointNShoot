# Privacidade

PointNShoot processa tudo localmente no navegador.

- Nenhum upload.
- Nenhuma telemetria.
- Nenhum servidor local.
- Nenhuma permissao ampla de host por padrao.
- A permissao `activeTab` limita o acesso a aba que o usuario ativou.
- O PNG final usa crop ao redor do elemento selecionado, nao a pagina inteira.
- Texto visivel e metadados sao truncados.
- O modo padrao e `redact-sensitive`.

## Redacao basica

O MVP redige:

- e-mails;
- telefones;
- CPF e CNPJ;
- tokens longos;
- sequencias longas de numeros;
- parametros sensiveis de URL, como `token`, `password`, `secret`, `session` e similares.

O usuario ainda deve revisar o screenshot antes de colar em qualquer agente ou ferramenta externa.
