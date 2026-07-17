# Codex Current Context

## 1. Projeto

- Nome: LOKAT OS
- Repositorio: `caio090/caiotech`
- Branch principal: `main`
- Pasta local: `C:\Users\Trabalho\Desktop\COde\lokat-os`

## 2. Producao

- Dominio oficial: `https://www.lokat.com.br`
- Deploy oficial: GitHub `main` -> Vercel projeto `caiotech`
- Nao usar `vercel --prod` como padrao.

## 3. Sprint atual

- Sprint: 3.0.3 — Visibilidade dos Destinos, Contexto Completo e Correção do Status dos SQLs
- Executor: Claude Code
- Data: 2026-07-16
- Commit HEAD pré-sprint: `b7be920` (Sprint 3.0.2)
- Estado: implementado, commits pushados, deploy em andamento (dpl_EPMCQcFovLUWdmVL6Dq8hHv6JUZL)

## 4. O que foi feito na Sprint 3.0.1 (reprovada por RLS)

- APIs POST/GET/PATCH /drafts e POST send-to-production / send-to-approval criadas.
- _guided-create-flow.tsx reescrito com persistência real, autosave, URL update, visual bridge.
- EditorOS: return_to sanitizado, botão Voltar ao conteúdo, CanvasEditor com banner de import.
- Aprovações: activeClientId/activeClientName no server component, demo mode suprimido para admin.
- SubNav: initialClientId passado server-side em todas as páginas REC OS.
- REPROVADA: POST /drafts falhou com RLS em content_items.

## 4c. O que foi feito na Sprint 3.0.3 (P1 + P2)

- producao/page.tsx: requireAdminContentOSContext + adminDb; filtro expandido para "producao"/"em_producao"; STATUS_LABEL/COLOR para producao e alteracao_solicitada; seção operational_tasks; searchParams content_id e task.
- aprovacoes/page.tsx: requireAdminContentOSContext + adminDb para approvals; fallback sem join; searchParam content_id.
- _guided-create-flow.tsx: DestinationResult com contentId/existed (token removido); links incluem content_id+task/approval; microcopy differencia existed=true/false; IDs completos com Copy.
- _client-content.tsx: removido const _NOW = Date.now() em escopo de módulo (React #418); substituído por Date.now() inline.
- SQL 90: marcado como failed em todos os docs.
- project-status.ts: production_destination_visibility e approval_destination_visibility adicionados.
- TypeScript: zero erros. Build: limpo. 5 commits. Push: feito.

## 4b. O que foi feito na Sprint 3.0.2 (hotfix)

- Criado src/lib/admin-contentos-api.ts: requireAdminContentOSContext() e validateAdminClient().
- Todas as 5 rotas API corrigidas: authClient para auth/role, adminDb para DB.
- criar/page.tsx: adminDb para content_items com guard hasSupabaseServiceRoleKey().
- Frontend: mensagens de erro mapeadas por status HTTP.
- SubNav: Suspense boundary adicionado para isolar useSearchParams (React #418).
- TypeScript: zero erros. Build: limpo.
- Nenhum SQL executado. Nenhuma RLS alterada. V1=81, V2=12 imutáveis.

## 5. Próximos passos

- QA Sprint 3.0.3: testar destino Produção (tarefa aparece na página), destino Aprovação (aparece em Aprovações), IDs copiáveis, links corretos.
- Verificar READY no projeto lokat-os (dpl_EPMCQcFovLUWdmVL6Dq8hHv6JUZL).
- Flash "Nenhum cliente selecionado": P2 investigar — _layout-client.tsx usa localStorage/fetch async; fix requer cookie ou header server-side.

## 4. Deployment atual

- Deployment inicial esperado: `dpl_HTRqmmLYfvqUzXwaWJvLtCceccqE`
- Status esperado: `READY`

## 5. V1_PROGRESS

- `V1_PROGRESS = 81`
- Manter inalterado nesta sprint.

## 6. V2_PROGRESS

- `V2_PROGRESS = 12`
- Manter inalterado nesta sprint.

## 7. Ultima sprint concluida

- Sprint V2.2.1 aprovada com ressalvas.
- REC OS tem navegacao reduzida a cinco areas.
- EditorOS existe como motor de canvas local em avaliacao.
- Faturamento OlaClick carregou dados reais, sem duplicacao observada.

## 8. Ultimo QA

- QA em producao via Chrome.
- Aprovado com ressalvas:
  - P1: Exportar PNG do EditorOS nao iniciou download.
  - P2: texto visivel legado `ContenOS Implementado`.
  - P2: links antigos iniciando com `/contentos/` na Visao Geral.

## 9. Funcionalidades validadas

- REC OS com cinco areas: Visao Geral, Campanhas, Criar, Calendario, Resultados.
- Redirects legados preservando `client`.
- Duh Lanches com Cardapio Digital/OlaClick conectado.
- Faturamento real OlaClick carregado.
- Client_id preservado nas rotas admin REC OS.

## 10. Funcionalidades com ressalva

- EditorOS: canvas, texto, forma, imagem e rascunho local existem; exportacao PNG precisa ser corrigida e validada.
- OlaClick formas de pagamento: provider nao enviou campo de pagamento; estado correto e `blocked_provider_data`.
- REC OS Visao Geral: ainda havia links antigos para `/contentos/`.

## 11. Bloqueadores

- SQLs 82, 84 e 86-89 estao em estado parcial/desconhecido.
- SQL 85 nao foi executado.
- Typebot patch local nao deve ser restaurado nesta sprint.
- Meta QA completo pendente.
- Asaas sandbox pendente.
- Chatwoot e Postiz dependem de infraestrutura externa.

## 12. SQLs

- SQL 82: `attempted_failed_partial_unknown`
- SQL 84: `attempted_failed_partial_unknown`
- SQL 85: `not_executed`
- SQL 86: `attempted_failed_partial_unknown`
- SQL 87: `attempted_failed_partial_unknown`
- SQL 88: `attempted_failed_partial_unknown`
- SQL 89: `attempted_failed_partial_unknown`
- SQL 90: `failed` — tentado/executado e falhou. Nao re-executar.

## 13. Integracoes

- Meta: OAuth global existente; ativos devem ser vinculados por cliente.
- OlaClick: conexao da Duh Lanches ativa; formas de pagamento bloqueadas por ausencia de dados do provider.
- WhatsApp: em preparacao.
- Asaas: sandbox nao homologado.
- Chatwoot: nao instalado.
- Postiz: nao instalado.

## 14. Areas congeladas

- Nao alterar Typebot.
- Nao alterar Meta.
- Nao conectar providers.
- Nao executar DDL/DML no Supabase.
- Nao executar novamente SQL 82 a 89.
- Nao emitir nota fiscal.
- Nao alterar percentuais V1/V2.

## 15. Proxima sprint

- Sprint 3.0: checkpoint permanente, auditoria SQL parcial, fechamento V2.2.1 e novo fluxo Criar da REC OS.

## 16. Proxima acao exata

1. Auditar catalogo PostgreSQL somente com `SELECT`.
2. Corrigir exportacao PNG do EditorOS.
3. Corrigir nomenclatura visivel e links legados.
4. Unificar `/admin/contentos/criar` em fluxo guiado de cinco etapas.
5. Documentar calendario global, Cliente 360 e financeiro do cliente.

## Regra para execucoes futuras

Antes de alterar codigo, todo agente deve ler:

- `docs/CODEX_CURRENT_CONTEXT.md`
- `docs/IMPLEMENTATION_LEDGER.md`
- `docs/UNTOUCHED_BACKLOG.md`
- `AGENTS.md`
- `docs/HANDOFF.md`
- `docs/DECISIONS.md`
