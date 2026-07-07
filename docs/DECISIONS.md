# Decisions

Registro de decisoes do projeto Lokat OS.

## Decisoes registradas

- A memoria oficial do projeto deve ficar no repositorio.
- `AGENTS.md` e `docs/HANDOFF.md` sao as referencias principais para continuidade entre Codex e Claude Code.
- Alteracoes em codigo devem ser precedidas por leitura do contexto e plano aprovado quando solicitado.
- Durante a organizacao de memoria, nao alterar codigo, assets, banco de dados, servidor local, commits ou push.
- 2026-07-06: Foi definido modelo multi-tenant lógico para separar Lokat interna, plataforma, agências, clientes de agências e leads. Ver `docs/DATA_MODEL_MULTI_TENANT_ARCHITECTURE.md`.
- 2026-07-06: `launch_waitlist` é a fonte oficial de leads novos. `admin_signups_view` é somente leitura (fonte legada) até identificar tabela base via `pg_get_viewdef`.
- 2026-07-06: Hard delete de leads só com confirmação explícita no UI (confirm dialog). Nunca automático.
- 2026-07-06: Service role nunca retorna em chamadas do browser — apenas em Route Handlers server-side.
- 2026-07-06: Link "REC OS" no menu público aponta para `/#rec-os` (seção explicativa na home), não para `/rec` (o app Lokat.rec). São coisas diferentes: REC OS é a área dentro do Lokat OS; Lokat.rec é a plataforma de vídeo separada.
- 2026-07-06: LeadConversationModal é V1 local (sem dependência do Typebot real). Fonte salva como `source="site_conversation"`. Estratégia completa em `docs/TYPEBOT_LEAD_CAPTURE_STRATEGY.md`.
- 2026-07-06: Modal de conversa não coleta email — follow-up é por WhatsApp. Reduz fricção na primeira interação.
- 2026-07-06: `normalizeLeadPayload()` em `src/lib/leads/normalize-lead-payload.ts` é o helper centralizado de normalização — usar em novos canais (WhatsApp bot, CRM, etc.).
- 2026-07-06: Typebot é canal externo de captação, não CRM. Ele envia dados; a Lokat OS normaliza, classifica e salva.
- 2026-07-06: `LOKAT_TYPEBOT_WEBHOOK_SECRET` protege o endpoint Typebot. Sem a variável, aceita sem autenticação (dev). Com a variável, exige header `x-lokat-webhook-secret`.
- 2026-07-06: Fallback sem SQL 76: se `typebot_result_id` etc. não existem, endpoint faz segundo INSERT sem campos estendidos. Lead é salvo mesmo sem a migration.
- 2026-07-06: Landing reformulada com seções O Problema, Para quem, FAQ, prévia visual simulada (labelled "Simulação — interface em desenvolvimento"), jornada 7 etapas.
- 2026-07-07: Sidebar admin reorganizada para 11 itens: Dashboard, CRM, REC OS, Operacional, Clientes, Dados & Insights, Financeiro, Billing & Planos, Contas, Integrações, Configurações. Removidos do nav (páginas continuam existindo): Início, REC Vídeos, Projetos, Diagnósticos, Fontes de Dados, Equipe, WhatsApp.
- 2026-07-07: O nome público e oficial do módulo de criação de conteúdo é **REC OS**. O termo "ContentOS" não deve aparecer na interface. A rota técnica `/contentos` e os identificadores internos (componentes, funções, pastas) permanecem como estão por estabilidade — apenas os labels visíveis ao usuário usam "REC OS".
- 2026-07-07: `/admin/leads` é o hub de CRM. Waitlist (`/admin/super/waitlist`) é a entrada de leads novos; CRM é a operação (pipeline, temperatura, próxima ação). CRM não substitui a waitlist — são estágios diferentes do funil.
- 2026-07-07: `/admin/relatorios` renomeado para "Central de Dados & Insights". `/admin/fontes-dados` permanece como página separada acessível pelo hub de Dados.
- 2026-07-07: `/admin/financeiro` é a visão financeira da operação (MRR, CAC, LTV, Churn, ROI, ROAS, Custo IA, Margem). `/admin/super/billing` é o controle de planos/assinaturas/cupons. São distintos: Financeiro = saúde financeira do negócio; Billing = controle técnico de planos.
- 2026-07-07: Filtros da Central de Contas expandidos: Internas, Agências, Clientes diretos, Clientes de agência, Autônomos, Operacionais, Leads. Aviso exibido: filtros dependem da classificação no cadastro.
- 2026-07-07: Créditos de IA monitorados como "Custo IA" no Financeiro. Integração real com provider é sprint futura.
- 2026-07-07: Google Drive: integração futura — não implementar agora.
- 2026-07-07: Landing — gota vermelha (Lokat.rec) removida da transição hero→branco. Gradiente suavizado para 64px sem conteúdo.
