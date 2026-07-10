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
- 2026-07-09: CRM (/admin/leads) é o hub comercial da plataforma. Waitlist (/admin/super/waitlist) é o ponto de entrada dos leads. Leads classificados por origem (source), intenção (interest), etapa (status) e perfil (account_type).
- 2026-07-09: Mapeamento de origens de lead: site_modal→Agendamento, pre-acesso/pre_acesso→Beta, diagnostico→Diagnóstico, typebot→Typebot, whatsapp→WhatsApp, landing/website→Site, manual→Manual. Sem source = "Não informado".
- 2026-07-09: Diagnóstico (/diagnostico) é GAP conhecido — não salva lead na launch_waitlist. Navegação vai para /diagnostico/resultado sem POST. Integração futura necessária.
- 2026-07-09: Integrações futuras planejadas: Meta Ads (leads de campanhas), OláClick (dados comerciais de cardápio), Google Drive (relatórios de conteúdo). Nenhuma implementada — apenas documentadas.
- 2026-07-09: CRM shortcut adicionado ao topbar admin (ícone Target → /admin/leads), visível para todos os perfis admin.
- 2026-07-09: CRM removido da sidebar admin (era item #2). Sidebar admin agora tem 10 itens. CRM acessível exclusivamente via topbar.
- 2026-07-09: Topbar CRM exibe badge vermelho com contagem de leads com status "new" (max exibido: "9+"). Fetch em /api/admin/waitlist no mount.
- 2026-07-09: Meta Insights — período "Mês atual" corrigido para respeitar limite de 30 dias da Graph API. until = hoje, since = max(1º do mês, hoje-29d). Label UI atualizado para "Mês atual (30d)".
- 2026-07-09: Campo account_type e role em Central de Leads agora passam por ACCOUNT_LABEL e ROLE_LABEL respectivamente. "novo_cadastro" → "Cadastro legado" / "Legado" — não aparece mais cru.
- 2026-07-09: Hero da landing tem apenas 2 CTAs principais: "Entrar no beta" (primário) e "Agendar demonstração" (secundário). Diagnóstico gratuito permanece como link discreto abaixo dos CTAs e em seção dedicada mais abaixo. WhatsApp permanece em seção dedicada e footer. Ticker roxo removido do topo da landing.
- 2026-07-09: Login usa tema escuro (#0a0a0c / #13131a) alinhado com identidade LOKAT OS. Inputs usam classe .lk-login-input com override de autofill Chrome (box-shadow inset escuro, -webkit-text-fill-color claro). Não afeta inputs de outros formulários do sistema.
- 2026-07-09: Status do projeto V1 centralizado em `src/lib/project-status.ts` — único ponto de verdade para V1_PROGRESS, V2_PROGRESS, PROJECT_DEADLINE_V1, MILESTONES_V1 e MILESTONES_V2. Atualizar este arquivo ao final de cada sprint.
- 2026-07-09: Topbar admin (super_admin) exibe "V1 XX% / Nd restantes" no link de Status. Valores lidos de `src/lib/project-status.ts` — atualizar V1_PROGRESS neste arquivo para refletir a sprint concluída.
- 2026-07-09: Página /admin/status exibe progress bars V1/V2 e checklists de milestones no topo, seguidos das seções de módulos e integrações existentes. Fonte: `src/lib/project-status.ts`.
- 2026-07-09: Meta Insights avançado (audience_gender_age, audience_city, audience_country, online_followers) — cada grupo tem try/catch isolado. Falha em um grupo não afeta as métricas principais nem os outros grupos avançados. Retornados em `advanced` no JSON da rota. Contas precisam de ≥100 seguidores e escopo instagram_manage_insights para obter dados demográficos.
- 2026-07-09: A página /admin/status deve usar linguagem de produto e gestão. Não expor detalhes de implementação, SQL, fallbacks técnicos, nomes de tabela, funções internas ou configurações de infraestrutura. Documentação técnica fica nos docs de referência, não na UI.
