# Roadmap — Dia comercial e caixa

Criado na Fase 11 do hotfix Workspaces 1.0.4. **Nada aqui foi implementado**
— nem schema, nem API, nem UI. Registra o desenho proposto para três áreas
de `project-status.ts`: `business_day_configuration`,
`cash_register_opening_closing`, `cash_register_reconciliation` e
`overnight_business_day`, todas `planned`.

## Problema que isto resolve

Um negócio que funciona até de madrugada (bar, lanchonete, delivery noturno)
tem um "dia comercial" que não coincide com o dia civil. Um pedido feito às
02h pertence, na prática, ao expediente que começou na tarde/noite anterior
— não a um novo dia que só formalmente começou à meia-noite. Sem um conceito
explícito de dia comercial, relatórios financeiros e fechamentos de caixa
ficam incorretos exatamente nas horas em que o negócio ainda está operando.

## business_day_configuration

Permite configurar um horário operacional que pode atravessar a meia-noite,
mantendo transações da madrugada no mesmo dia comercial iniciado
anteriormente.

Campos propostos (nenhum aplicado ao banco):

```
business_date       -- data do dia comercial (ex.: 2026-07-24), não a data civil da transação
opened_at            -- timestamp real de abertura
expected_closed_at   -- timestamp esperado de fechamento (pode ser no dia civil seguinte)
actual_closed_at     -- timestamp real de fechamento
timezone             -- fuso horário explícito (mesmo princípio já usado em
                        src/app/contentos/aprovacoes/_client-content.tsx para
                        evitar mismatch de hidratação — nunca confiar no fuso
                        implícito do servidor/navegador)
crosses_midnight     -- boolean: este dia comercial atravessa a meia-noite?
```

## cash_register_opening_closing

Abertura, movimentações, sangria, reforço, contagem, fechamento, diferença e
responsável.

```
opening_balance      -- saldo de abertura, contado e registrado
expected_balance      -- saldo esperado no fechamento (opening_balance + movimentações)
counted_balance       -- saldo realmente contado no fechamento
difference            -- counted_balance - expected_balance
status                -- ex.: "aberto" | "fechado" | "conferido" | "divergente"
responsible           -- quem abriu/fechou o caixa
payment_breakdown     -- valores por método de pagamento (dinheiro, pix, cartão, etc.)
```

## cash_register_reconciliation

A conciliação é o ato de comparar `expected_balance` contra `counted_balance`
e decidir o `status` final. Proposto como um passo explícito, não implícito
no fechamento — permite que uma divergência seja investigada antes de ser
aceita.

## overnight_business_day — exemplo obrigatório

O ticket exige este exemplo documental. **Dado fictício, não real** — não
representa nenhuma transação, saldo ou horário real da Duh Lanches, e nenhum
dado da Duh Lanches foi criado, lido ou alterado para produzi-lo.

```
Duh Lanches (exemplo fictício)
Dia comercial: 24/07
Abertura: 14h de 24/07
Fechamento: 04h de 25/07
Pedido às 02h de 25/07 pertence ao dia comercial 24/07.
```

Ou seja: mesmo que o pedido tenha um `created_at` civil de 25/07 02:00, o
campo `business_date` desse pedido deveria ser 24/07 — porque o caixa que o
processou nunca fechou entre 24/07 14h e 25/07 04h.

## Fora de escopo desta sprint

- Nenhuma tabela criada, nenhuma migration, nenhum SQL executado.
- Nenhuma UI construída.
- Nenhum dado real (Duh Lanches ou qualquer outro cliente) alterado.
- Este documento é a única entrega desta fase — as 4 áreas ficam `planned`
  em `project-status.ts`, nenhuma `validated` ou `qa_pending`.
