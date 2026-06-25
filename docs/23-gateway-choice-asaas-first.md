# Gateway de Pagamento — Por que Asaas primeiro

## Decisão de produto

O gateway recomendado para MVP da LOKAT OS no Brasil é o **Asaas**.

Os outros (Mercado Pago, Pagar.me, Stripe) são alternativas futuras documentadas ao final deste arquivo.

---

## Por que Asaas

| Critério | Asaas |
|---|---|
| Pix | Sim, nativo |
| Boleto | Sim |
| Cartão de crédito | Sim |
| Link de pagamento | Sim |
| Cobrança recorrente | Sim |
| Sandbox (testes) | Sim |
| API REST documentada | Sim |
| Suporte a split/marketplace | Sim (futuro) |
| Foco no mercado brasileiro | Sim |
| Adequado para mensalidades SaaS | Sim |
| Adequado para cobranças de agência | Sim |

Asaas é uma fintech brasileira regulada pelo Banco Central. O dinheiro recebido fica na conta Asaas da organização e pode ser sacado para a conta bancária da empresa.

---

## A LOKAT OS não guarda dinheiro

O Supabase armazena apenas:
- Registro da cobrança (descrição, valor, vencimento)
- Status (pending, paid, overdue, canceled, refunded, manual_confirmed)
- Referência ao gateway (`gateway_charge_id`, `gateway_provider`)
- Link de pagamento gerado pelo gateway
- Histórico de mudanças de status
- Payload do webhook (opcional, em `metadata`)

O dinheiro real transita entre:
- O cliente final (quem paga)
- A conta Asaas da organização (agência, empresa ou Lokat)

Não há saldo interno, saque, depósito ou carteira digital na plataforma.

---

## Pix manual vs. Pix via gateway

### Pix manual
- A organização gera uma chave Pix no banco dela
- Compartilha manualmente com o cliente
- O cliente paga no app do banco
- A organização confirma o recebimento manualmente no sistema
- Registro em `finance_charges` com `gateway_provider = null`, `status = manual_confirmed`

### Pix via Asaas
- O sistema chama a API Asaas com os dados da cobrança
- O Asaas gera um QR code Pix automaticamente
- O cliente escaneia o QR code no app do banco
- O Asaas detecta o pagamento e dispara um webhook
- O webhook chega em `/api/webhooks/payments/asaas`
- O sistema atualiza `status = paid` automaticamente em `finance_charges`

---

## Cobrança manual vs. cobrança automática

### Cobrança manual
- Criada pelo admin no painel FinanceOS
- Sem vínculo com gateway (`gateway_provider = null`)
- Pagamento confirmado manualmente via botão "Confirmar pagamento"
- Útil para cobranças fora do sistema, transferências bancárias, boletos externos

### Cobrança automática (via Asaas)
- Criada via `POST /api/payments/asaas/create-charge`
- O sistema cria a cobrança no Asaas via API
- Asaas gera link de pagamento e/ou QR code Pix
- O cliente paga pelo link
- Webhook atualiza o status automaticamente
- O admin vê "Pago automaticamente" no painel

---

## Como o webhook atualiza o Supabase

```
Cliente paga pelo link ou Pix
        ↓
Asaas detecta o pagamento
        ↓
Asaas envia POST para /api/webhooks/payments/asaas
        ↓
Sistema valida ASAAS_WEBHOOK_SECRET
        ↓
Sistema busca a cobrança por gateway_charge_id
        ↓
Sistema atualiza status em finance_charges
        ↓
Sistema cria notificação para o admin
```

Eventos Asaas mapeados:
- `PAYMENT_RECEIVED` → status `paid`, `paid_at` = agora
- `PAYMENT_OVERDUE` → status `overdue`
- `PAYMENT_DELETED` → status `canceled`
- `PAYMENT_REFUNDED` → status `refunded`

---

## Quem precisa criar conta no Asaas

### Lokat (usando para cobrar seus clientes)
- A Lokat cria uma conta no Asaas
- Gera a API key no painel Asaas
- Adiciona `ASAAS_API_KEY` na Vercel como variável segura
- O dinheiro fica na conta Asaas da Lokat

### Agência usando a plataforma
- Fase 1: cobrança manual ou link externo (sem Asaas)
- Fase 2: a agência cria a própria conta Asaas e conecta via `payment_integrations`
- Fase 3: split/marketplace se fizer sentido comercialmente

### Empresário/autônomo
- Gateway desativado por padrão
- FinanceOS focado em custos e despesas, não em cobrar clientes
- Pode ativar cobranças manualmente se quiser emitir cobranças para terceiros

---

## Variáveis de ambiente

```
# Asaas (servidor apenas — nunca NEXT_PUBLIC_)
ASAAS_API_KEY=            # Chave da API Asaas da Lokat
ASAAS_ENVIRONMENT=        # sandbox | production
ASAAS_WEBHOOK_SECRET=     # Segredo para validar webhooks do Asaas
ASAAS_WALLET_ID=          # Opcional — ID da subconta/split futuro
```

Endpoints Asaas:
- Sandbox: `https://sandbox.asaas.com/api/v3`
- Produção: `https://api.asaas.com/api/v3`

---

## Quando usar cada gateway

### Asaas
- Recomendado para o MVP
- Cobranças de clientes no Brasil
- Pix, boleto, cartão, link
- Mensalidades recorrentes
- Agências cobrando seus próprios clientes

### Mercado Pago
- Indicado quando o cliente já usa a plataforma Mercado Pago
- Checkout Pro com experiência de e-commerce
- Pode ter taxas diferentes por perfil de negócio

### Pagar.me
- Indicado para marketplaces com split nativo
- Boa opção se houver estrutura de repasse automático entre partes
- API robusta para operações complexas

### Stripe / Stripe Connect
- Indicado para clientes internacionais ou cobranças em moeda estrangeira
- Stripe Connect para marketplaces com repasse a múltiplas contas
- Maior complexidade de setup para o Brasil

---

## Fases de implementação

| Fase | O que está incluído |
|---|---|
| 1 (agora) | FinanceOS manual, estrutura Supabase, rotas preparadas, documentação, botão "Gateway não configurado" |
| 2 | Conta Asaas da Lokat, criar cobrança real, link Pix/boleto, webhook, baixa automática |
| 3 | Cada organização conecta próprio Asaas via `payment_integrations` |
| 4 | Split/marketplace, repasse automático, estrutura fiscal |

---

## Restrições de segurança

- Nunca usar `NEXT_PUBLIC_ASAAS_API_KEY`
- Nunca expor a chave no frontend
- Toda chamada à API Asaas ocorre em rotas server-side (`/api/`)
- Se a env não existir, retornar `{ configured: false }` com mensagem clara
- Webhook valida `ASAAS_WEBHOOK_SECRET` antes de processar qualquer payload
- Não salvar API keys de terceiros no Supabase sem criptografia segura — para MVP, usar apenas variáveis de ambiente na Vercel
