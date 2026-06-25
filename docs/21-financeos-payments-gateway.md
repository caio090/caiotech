# FinanceOS — Pagamentos e Gateways

## Visão geral

O FinanceOS gerencia cobranças, recebimentos e inadimplência por cliente/organização. O dinheiro real transita nos gateways externos — o Supabase armazena apenas os registros e o status de cada cobrança.

Não há saldo interno, carteira digital, saques ou depósitos na plataforma.

## Tabelas

### `finance_plans`
Planos disponíveis na plataforma (Diagnóstico Grátis, Autonomia, Empresa, Agência). Vincula valor, ciclo de cobrança e módulos liberados.

### `finance_charges`
Cobranças individuais por cliente. Campos principais:

| Campo | Descrição |
|---|---|
| `organization_id` | ID do admin/agência dono da cobrança |
| `client_id` | FK para `clients` |
| `amount` | Valor em reais (float) |
| `due_date` | Data de vencimento |
| `status` | draft / pending / paid / overdue / canceled / refunded / manual_confirmed |
| `gateway_provider` | asaas / mercadopago / pagarme / stripe / null |
| `gateway_charge_id` | ID da cobrança no gateway externo |
| `payment_link` | Link de pagamento gerado pelo gateway |
| `pix_qr_code` | QR code PIX (base64 ou URL) |
| `paid_at` | Timestamp do pagamento |
| `confirmed_by` | UUID do usuário que confirmou manualmente |
| `webhook_event_id` | ID do evento de webhook recebido |
| `webhook_received_at` | Timestamp do webhook |
| `metadata` | Payload bruto do gateway (jsonb) |

### `finance_charge_history`
Log imutável de todas as mudanças de status em cada cobrança.

## Gateways suportados (preparação)

Nenhum gateway está integrado ativamente. A estrutura existe para integração futura.

| Gateway | Variável de ambiente |
|---|---|
| Asaas | `ASAAS_API_KEY` |
| Mercado Pago | `MERCADOPAGO_ACCESS_TOKEN` |
| Pagar.me | `PAGARME_API_KEY` |
| Stripe | `STRIPE_SECRET_KEY` |

Webhook compartilhado: `PAYMENT_WEBHOOK_SECRET`

## Rotas de API

### `POST /api/payments/create-charge`
Cria cobrança no Supabase. Se `gateway_provider` for informado mas a variável de ambiente não existir, retorna mensagem clara sem erro 500.

Body: `{ description, amount, due_date, client_id?, plan_id?, notes?, gateway_provider? }`

### `POST /api/payments/manual-confirm`
Confirma pagamento manualmente sem gateway. Requer role `admin` ou `financeiro`.

Body: `{ charge_id, payment_method?, notes? }`

### `POST /api/webhooks/payments`
Endpoint para receber eventos dos gateways. Headers:
- `x-gateway-provider`: identifica o gateway
- `x-webhook-signature`: validado contra `PAYMENT_WEBHOOK_SECRET`

Mapeamento de eventos:

| Gateway | Evento | Novo status |
|---|---|---|
| Asaas | `PAYMENT_RECEIVED` | paid |
| Asaas | `PAYMENT_OVERDUE` | overdue |
| Mercado Pago | `payment.updated` | paid |
| Stripe | `payment_intent.succeeded` | paid |

## Painel FinanceOS

Localizado em `/financeiro/pagamentos`. Cards de resumo:
- Total recebido
- Total pendente
- Total inadimplente
- MRR (soma de cobranças pagas no mês atual)
- Total geral de cobranças ativas

Ações por cobrança: confirmar pagamento, voltar para pendente, marcar vencida, cancelar, copiar link de pagamento.

## SQL necessário

Executar `docs/supabase/33-financeos-charges-and-payments.sql` no Supabase SQL Editor antes de usar o módulo em produção.

## Restrições de design

- Nenhuma integração real de gateway sem configurar as variáveis de ambiente
- Nenhum saldo interno — o sistema apenas registra status
- Nenhuma chave de gateway no frontend (`NEXT_PUBLIC_*`)
- Webhook valida segredo antes de processar qualquer payload
