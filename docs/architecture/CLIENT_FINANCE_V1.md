# Client Finance V1

Status: planned
Data: 2026-07-15

## Objetivo

Definir a visao financeira por cliente, separando:

- faturamento operacional do cliente;
- cobrancas/plano LOKAT;
- conciliacao de pagamentos;
- repasses e pendencias.

## Principios

- Faturamento do cliente nao e receita da LOKAT.
- Receita da LOKAT depende de billing/contrato/cobranca.
- Dados de provider externo devem ser classificados como reais, incompletos, bloqueados ou ausentes.
- Nunca exibir dado financeiro fake em cliente real.

## Blocos V1

1. Plano e contrato
   - plano atual;
   - status;
   - ciclo;
   - responsavel financeiro.

2. Cobrancas
   - em aberto;
   - pagas;
   - vencidas;
   - canceladas.

3. Faturamento externo
   - OlaClick/Cardapio Digital;
   - periodo;
   - total;
   - pedidos;
   - ticket medio;
   - completude de forma de pagamento.

4. Conciliacao
   - status por periodo;
   - divergencias;
   - fonte do dado.

## Estados previstos

- `planned`: arquitetura definida.
- `blocked_provider_data`: provider nao retornou dado suficiente.
- `qa_pending`: tela ou API pronta para teste.
- `validated`: producao validada.

## Fora de escopo nesta etapa

- Emissao fiscal.
- Nota fiscal automatica.
- Provider fiscal ativo.
- Cobrança real sem sandbox homologado.
- Alteracao de schema sem auditoria.

## Proximo passo recomendado

Consolidar contrato de leitura do OlaClick e contrato de cobrancas antes de integrar Asaas ou provider fiscal.
