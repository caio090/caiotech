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
- 2026-07-06: Landing reformulada com seções O Problema, Para quem, FAQ, prévia visual simulada (labelled "Simulação — interface em desenvolvimento"), jornada 7 etapas.
