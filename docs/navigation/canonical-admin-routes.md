# Rotas canônicas do admin — Sprint Navegação e Experiência 3.0.1.2

| Área | Rota canônica | Aliases (redirect) |
|---|---|---|
| Calendário Global | `/admin/calendario` | `/admin/contentos/calendario` (preserva query) |
| REC OS | `/admin/contentos` | — |
| CRM | `/admin/leads` | `/admin/crm` (novo, preserva query) |
| Arquitetura da Plataforma | `/admin/status/arquitetura` | `/admin/ecossistema` (preserva compatibilidade) |
| Meu Escritório | `/admin/escritorio` | — (novo, nenhuma rota equivalente existia) |

Todos os aliases usam `redirect()` server-side preservando os parâmetros
de busca recebidos — nenhum aponta para si mesmo (sem loop) e nenhum
introduz uma segunda implementação da mesma tela.
