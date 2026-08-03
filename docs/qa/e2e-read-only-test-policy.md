# Política de testes somente leitura — Sprint E2E CI 3.0.2.2

## Regra geral

Todo teste "normal" (fora de `auth.setup.ts` e da entrada/saída do
Workspace Preview em `workspace-preview.spec.ts`) deve ser somente
leitura: navegar, ler, clicar em elementos que só mudam estado de UI
local (abrir sheet, trocar de aba/visão, selecionar filtro em memória) —
nunca `save`, `send`, `approve`, `invite`, `delete`, `archive`, `create`,
upload, pagamento, ou ativar integração.

## Como isso é garantido, não só pedido

`tests/e2e/helpers/mutation-guard.ts` reaproveita a mesma lógica pura do
guard de mutação real do proxy (`isMutableNamespace`/`MUTATING_METHODS`
de `src/lib/workspaces/mutation-guard-runtime.ts`) para interceptar toda
requisição de rede do teste e falhar se um método mutante bater num
namespace de API mutável fora da lista explicitamente permitida
(entrada/saída do Workspace Preview). Usado explicitamente nos testes que
navegam por fluxos com potencial de mutação (`rec-os-flow.spec.ts`,
`rec-os-roadmap.spec.ts`).

## Onde o rascunho do Meu Escritório se encaixa

`business-office.spec.ts` digita `QA TEMPORÁRIO - NÃO SALVAR` no campo de
metas/decisões e confirma que: nenhuma requisição de persistência
dispara, e o texto some ao recarregar a página — exatamente porque o
rascunho é só `useState` (nunca localStorage/sessionStorage/API), então
não há nada para o mutation guard sequer precisar bloquear ali.

## Onde o Workspace Preview é a exceção deliberada

`workspace-preview.spec.ts` testa a ENTRADA e a SAÍDA do preview (as
únicas mutações permitidas fora do login) e, adicionalmente, envia um
payload demonstrativo e propositalmente inválido para uma rota mutável
real esperando receber `403 WORKSPACE_PREVIEW_READ_ONLY` — nunca um
payload que poderia persistir algo caso o guard falhasse.

## O que fazer com dados que a conta E2E não tem

A conta E2E não tem cliente, agência, nem conteúdo comercial real.
Testes que dependem desse contexto (ex.: um briefing específico no REC
OS, um lead real no CRM) usam `test.skip(...)` com uma razão explícita em
vez de assumir ou fabricar o dado — nunca um teste que finge sucesso
sobre um estado que não existe.
