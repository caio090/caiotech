# Client 360 V1

Status: planned
Data: 2026-07-15

## Objetivo

Definir a pagina unica de contexto do cliente no LOKAT OS.

O Client 360 deve responder rapidamente:

- quem e o cliente;
- quais integracoes estao conectadas;
- o que esta em producao;
- quais resultados existem;
- quais pendencias bloqueiam evolucao.

## Blocos V1

1. Identidade do cliente
   - nome, segmento, responsavel, status, e-mail e telefone quando disponiveis.

2. Integracoes
   - Meta/Instagram;
   - Cardapio Digital/OlaClick;
   - WhatsApp quando existir;
   - status isolado por `client_id`.

3. REC OS
   - conteudos em producao;
   - aprovacoes;
   - calendario;
   - insights.

4. Financeiro
   - status de plano/cobranca;
   - faturamento conectado;
   - pendencias de conciliacao.

5. Historico
   - eventos relevantes;
   - diagnosticos;
   - convites e onboarding.

## Regras

- Nunca herdar integracao de outro cliente.
- Toda leitura precisa ser filtrada por `client_id`.
- Se a fonte externa estiver ausente, mostrar estado vazio honesto.
- Nao misturar dados demo com cliente real.

## Fora de escopo nesta etapa

- Nova tabela.
- Unificacao de todos os historicos em event store.
- Edicao massiva de cliente.
- Exibicao de secrets/tokens.

## Proximo passo recomendado

Construir primeiro como composicao de leituras existentes antes de propor schema novo.
