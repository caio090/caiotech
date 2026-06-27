# AI Credits — Sistema de Créditos da LOKAT OS

> Créditos internos da LOKAT OS. NÃO equivalem diretamente ao custo do fornecedor.

---

## Conceito

A LOKAT OS usa uma moeda interna (créditos) para controlar o uso de IA pelos clientes.

- Clientes compram ou recebem créditos via plano
- Cada geração consome créditos
- A LOKAT OS (conta central) paga o fornecedor com dinheiro real
- O preço do plano deve cobrir custo + margem

---

## Tabelas

### `ai_credit_wallet`
Saldo atual por cliente.

| Campo | Descrição |
|---|---|
| client_id | Cliente dono da carteira |
| plan_key | basic / pro / agency |
| monthly_quota | Créditos mensais do plano |
| extra_credits | Créditos comprados extra |
| used_credits | Total usado no período |
| remaining_credits | Calculado: quota + extra - used |
| reset_day | Dia do mês para renovar |

### `ai_credit_ledger`
Histórico de cada movimentação.

| movement_type | Quando |
|---|---|
| monthly_grant | Renovação mensal |
| generation_debit | A cada geração |
| extra_purchase | Compra de créditos extra |
| manual_adjustment | Ajuste manual pelo admin |
| refund | Estorno |
| failed_generation_refund | Devolução por falha na geração |

### `ai_generation_jobs`
Histórico de gerações.

Status: `draft` → `queued` → `running` → `completed` / `failed` / `cancelled`

---

## Planos

| Plano | Créditos/mês | Jobs simultâneos |
|---|---|---|
| Básico | 50 | 1 |
| Pro | 150 | 3 |
| Agência | 500 | 10 |

---

## Custos internos (em créditos LOKAT OS)

| Modo | Créditos |
|---|---|
| Apenas estratégia / prompt | 0 |
| Imagem simples 1x | 1 |
| Com referência visual | 2 |
| Com pessoa / produto / logo | 3 |
| Lote 4 variações | 4 |
| Multiplicador alta resolução | ×2 |

---

## Regras de segurança

1. Nunca permitir geração se `remaining_credits < custo`
2. Em falha real de geração → devolver créditos via `failed_generation_refund`
3. Frontend mostra créditos restantes e custo estimado ANTES de gerar
4. Custo do fornecedor (`estimated_provider_cost`) nunca aparece para o cliente
5. Chaves de API nunca chegam ao frontend

---

## Custo do fornecedor vs. preço ao cliente

- Custo real: pago pela conta central da LOKAT OS ao Google/OpenAI
- Crédito interno: moeda LOKAT OS
- A conversão crédito → custo real é gerenciada internamente
- Definir margem mínima antes de abrir para clientes reais

---

## Fluxo de geração

```
1. Usuário seleciona modo de geração
2. Frontend exibe estimativa de créditos
3. Usuário confirma
4. Server verifica remaining_credits
5. Cria ai_generation_job (status: queued)
6. Debita ledger (generation_debit)
7. Chama provider de IA
8. Atualiza job (completed/failed)
9. Se failed: insere refund no ledger
```

---

## Compra de créditos extras (V1.5)

- Créditos extras são adicionados via `extra_purchase` no ledger
- Não integrado com gateway de pagamento ainda
- Definir preço por crédito antes de ativar
