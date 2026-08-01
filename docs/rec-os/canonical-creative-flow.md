# Fluxo criativo canônico — Sprint REC OS 3.0.1

`src/lib/rec-os-workflow/types.ts` — reorganiza o que já existe
(`content_items.status`, real e persistido), não cria um segundo sistema.

## Quatro macroetapas

`REC_OS_WORKFLOW_STAGES` (`RecOsWorkflowDefinition[]`): Radar → Criar →
Produzir → Finalizar. Agendar/Publicar/Entregar acontece **depois** de
Finalizar, nunca dentro dela.

## Status canônicos preservados

`REC_OS_CANONICAL_STATUSES`: `ideia, briefing, roteiro, producao, edicao,
revisao_interna, enviado_aprovacao, alteracao_solicitada, aprovado,
pronto_para_agendar, agendado, publicado, reprovado` — os mesmos valores
já em `src/lib/supabase/types.ts::dbStatusToUi` e
`src/lib/rec-os-hub.ts`. Nenhum valor persistido foi renomeado.

Aliases legados preservados: `em_producao` → `producao`, `ajuste` →
`alteracao_solicitada` (`REC_OS_STATUS_ALIASES`).

`resolveMacroStage(status)` mapeia qualquer status real (incluindo
aliases) para sua macroetapa visual — usado para agrupar visualmente, não
para migrar dado.

## Reorganização real na UI (`_guided-create-flow.tsx`)

Ordem anterior: Brief → Conteúdo → **Visual Final** → Revisão → Destino
(Visual Final aparecia em 3º de 5 — antes da revisão e do destino).

Ordem nova: Ideia & Briefing → Aplicação & Formato → Revisão & Aprovação →
Destino & Especificações → **Visual Final** (último bloco criativo).

A navegação continua livre — os botões de step permitem pular para
qualquer etapa a qualquer momento; a reordenação muda a numeração e o
fluxo padrão de "Avançar", não impõe um wizard bloqueante.

## Compromisso registrado (honestidade sobre o que NÃO mudou)

A ação real de envio (Calendário/Produção/Aprovação) continua acontecendo
no passo "Destino & Especificações", que agora vem **antes** de "Visual
Final" na ordem de exibição — decoupar "definir destino" de "executar
envio" exigiria redesenhar as rotas `send-to-production`/
`send-to-approval` já consumidas por `producao/page.tsx` e
`aprovacoes/page.tsx`, fora do escopo seguro desta sprint. Como a
navegação é livre (não um wizard bloqueante), nada impede voltar ao
Visual Final depois de definir o destino antes do envio real acontecer
alhures.
