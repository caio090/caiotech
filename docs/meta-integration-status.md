# Meta / Instagram — Status da Integração

## O que está funcionando agora

| Funcionalidade | Status | Notas |
|---|---|---|
| OAuth 2.0 (autorização do usuário) | ✅ Ativo | Fluxo completo: connect → callback → token salvo |
| Salvar token em `meta_connections` | ✅ Ativo | SQL 35 deve estar rodado no Supabase |
| Verificar status da conexão | ✅ Ativo | `/api/meta/status` |
| Verificar conexão ativa | ✅ Ativo | `/api/meta/insights` |
| Listar Páginas e Instagram Business | ✅ Ativo | `/api/meta/accounts` (server-side, token nunca exposto) |
| Painel `/admin/conexoes` | ✅ Ativo | Mostra status, ativos encontrados e o que a conexão habilita |

## O que está pendente / em breve

| Funcionalidade | Motivo | Prazo |
|---|---|---|
| Leitura real de métricas (alcance, impressões) | Requer page_id salvo + escopo aprovado | Em breve |
| Publicação automática de posts | Requer Meta App Review + escopo `pages_manage_posts` | Não definido |
| Gestão de anúncios | Requer escopo `ads_management` e App Review | Não definido |
| Vinculação de ativos a clientes (`client_meta_assets`) | SQL 37 criado, rota pendente | Em breve |
| Business Manager listing | Requer escopo `business_management` aprovado | Em breve |

## Escopos solicitados no OAuth

```
pages_show_list
pages_read_engagement
instagram_basic
instagram_manage_insights
business_management
```

> **Atenção:** `instagram_manage_insights` e `business_management` exigem App Review para usuários fora do time de desenvolvimento. Adicione o usuário como **Testador** no Meta Developers para testar sem App Review.

## Arquitetura de segurança

- `META_APP_SECRET` nunca é exposto em logs, tela ou resposta de API
- `access_token` é salvo apenas no banco (Supabase) e nunca retornado ao front-end
- Todas as chamadas à Graph API são feitas server-side (route handlers)
- CSRF: `state` = `Buffer.from(user.id).toString("base64url")` no connect, validado no callback

## SQL necessário

| Arquivo | Descrição | Status |
|---|---|---|
| `docs/supabase/35-meta-connections.sql` | Tabela de conexões OAuth | Deve estar rodado |
| `docs/supabase/37-client-meta-assets.sql` | Ativos Meta por cliente | Pendente |
