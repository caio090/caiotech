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

## Atualização da Sprint REC OS 3.0.1.1 — envio movido para depois do Visual Final

O compromisso acima foi resolvido nesta sprint. "Destino &
Especificações" agora só **escolhe** o destino (`destinationChoice` —
Calendário/Produção/Aprovação), sem chamar nenhuma API. O envio real
(`handleEnviar()`, que despacha para as mesmas funções já existentes
`handleDestCalendario`/`handleDestProducao`/`handleDestAprovacao` — as
rotas `send-to-production`/`send-to-approval` não foram tocadas) só fica
disponível no rodapé do Visual Final, e só quando:

1. um destino já foi escolhido; e
2. `contentRequiresFinalAsset(brief.format)` é falso (formatos
   somente-texto/mensagem/e-mail) OU já existe um ativo visual
   (`hasVisualAsset`).

Sem essas duas condições, o rodapé mostra a mensagem explicando o que
falta — nunca um botão de envio que finge estar pronto. Fluxo final:
Revisão interna → Destino e especificações → Visual Final → Enviar.
