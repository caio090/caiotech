// Provider Asaas — candidato ao primeiro gateway da V1 brasileira.
// Suporta: cobrança recorrente, cartão, Pix, Pix Automático, boleto, sandbox.
//
// Não faz chamadas reais sem chave configurada.
// Quando ASAAS_API_KEY não estiver definida, todos os métodos lançam ProviderNotConfiguredError.
//
// Variáveis de ambiente necessárias (apenas servidor):
//   ASAAS_API_KEY          — chave da API (sandbox ou produção)
//   ASAAS_WEBHOOK_TOKEN    — token de verificação do webhook
//   ASAAS_ENVIRONMENT      — "sandbox" | "production"
//   ASAAS_BASE_URL         — sobrescreve URL base (opcional, para proxy/testes)
//   ASAAS_USER_AGENT       — identificação da plataforma (padrão: "LOKAT-OS")

import type {
  PaymentProvider, CreateCustomerInput, CustomerResult,
  CreateCheckoutInput, CheckoutResult, SubscriptionResult,
  PaymentResult, PaymentMethod, WebhookEvent, WebhookEventType,
} from "./types";
import { ProviderNotConfiguredError } from "./types";

const SANDBOX_BASE    = "https://api-sandbox.asaas.com/v3";
const PRODUCTION_BASE = "https://api.asaas.com/v3";

const DEFAULT_USER_AGENT = "LOKAT-OS";

function getBaseUrl(): string {
  if (process.env.ASAAS_BASE_URL) return process.env.ASAAS_BASE_URL;
  const env = process.env.ASAAS_ENVIRONMENT ?? "sandbox";
  return env === "production" ? PRODUCTION_BASE : SANDBOX_BASE;
}

function getUserAgent(): string {
  return process.env.ASAAS_USER_AGENT ?? DEFAULT_USER_AGENT;
}

function getApiKey(): string | undefined {
  return process.env.ASAAS_API_KEY;
}

function getWebhookToken(): string | undefined {
  return process.env.ASAAS_WEBHOOK_TOKEN;
}

// Mapeamento de status Asaas → status interno
const ASAAS_STATUS_MAP: Record<string, string> = {
  PENDING:    "pending",
  RECEIVED:   "paid",
  CONFIRMED:  "paid",
  OVERDUE:    "past_due",
  REFUNDED:   "refunded",
  CHARGEBACK: "chargeback",
  DELETED:    "canceled",
};

// Mapeamento de eventos Asaas → WebhookEventType
const ASAAS_EVENT_MAP: Record<string, WebhookEventType> = {
  PAYMENT_CREATED:             "payment_created",
  PAYMENT_AWAITING_RISK_ANALYSIS: "payment_pending",
  PAYMENT_APPROVED_BY_RISK_ANALYSIS: "payment_confirmed",
  PAYMENT_CONFIRMED:           "payment_confirmed",
  PAYMENT_RECEIVED:            "payment_received",
  PAYMENT_OVERDUE:             "payment_overdue",
  PAYMENT_DELETED:             "payment_failed",
  PAYMENT_RESTORED:            "payment_created",
  PAYMENT_REFUNDED:            "payment_refunded",
  PAYMENT_CHARGEBACK_REQUESTED: "payment_chargeback",
  SUBSCRIPTION_CREATED:        "subscription_created",
  SUBSCRIPTION_UPDATED:        "subscription_updated",
  SUBSCRIPTION_DELETED:        "subscription_canceled",
};

export class AsaasProvider implements PaymentProvider {
  readonly name = "asaas";

  get isConfigured(): boolean {
    return !!getApiKey();
  }

  private requireKey(): string {
    const key = getApiKey();
    if (!key) throw new ProviderNotConfiguredError("asaas");
    return key;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const key = this.requireKey();
    const res = await fetch(`${getBaseUrl()}${path}`, {
      ...options,
      headers: {
        "access_token": key,
        "Content-Type": "application/json",
        "User-Agent": getUserAgent(),
        ...(options.headers as Record<string, string> ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Asaas API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async createCustomer(input: CreateCustomerInput): Promise<CustomerResult> {
    const data = await this.request<{ id: string }>("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        cpfCnpj: input.cpf_cnpj,
        phone: input.phone,
        externalReference: input.account_id,
      }),
    });
    return { provider_customer_id: data.id, provider: "asaas" };
  }

  async updateCustomer(customerId: string, input: Partial<CreateCustomerInput>): Promise<CustomerResult> {
    await this.request(`/customers/${customerId}`, {
      method: "PUT",
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        cpfCnpj: input.cpf_cnpj,
      }),
    });
    return { provider_customer_id: customerId, provider: "asaas" };
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult> {
    // Asaas não tem endpoint unificado de checkout session — para assinaturas,
    // cria-se diretamente uma assinatura com a data de início.
    // Para checkout hospedado futuro, retornamos URL de cobrança da assinatura.
    throw new Error("Use createSubscription para criar assinatura Asaas diretamente.");
  }

  async createSubscription(customerId: string, planSlug: string): Promise<SubscriptionResult> {
    // Na V1, o admin cria a assinatura manualmente após confirmar pagamento.
    // Este método prepara a estrutura para quando o fluxo automático for ativado.
    throw new ProviderNotConfiguredError("asaas — createSubscription requer configuração de plano no painel Asaas");
  }

  async getSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
    try {
      const data = await this.request<{
        id: string; status: string;
        nextDueDate?: string; endDate?: string; trialEndDate?: string;
      }>(`/subscriptions/${subscriptionId}`);
      return {
        provider_subscription_id: data.id,
        status: data.status?.toLowerCase() ?? "unknown",
        current_period_end: data.nextDueDate,
        trial_end: data.trialEndDate,
      };
    } catch {
      return null;
    }
  }

  async changeSubscriptionPlan(subscriptionId: string, _newPlanSlug: string): Promise<SubscriptionResult> {
    // Requer mapeamento de plan_slug → valor no Asaas
    throw new ProviderNotConfiguredError("asaas — changeSubscriptionPlan requer mapeamento de planos");
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.request(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
  }

  async pauseSubscription(_subscriptionId: string): Promise<void> {
    // Asaas não tem pause nativo — implementar via data de fim ou status manual
    throw new Error("Asaas não suporta pause nativo. Use cancelSubscription e reagende.");
  }

  async resumeSubscription(_subscriptionId: string): Promise<void> {
    throw new Error("Asaas não suporta resume nativo.");
  }

  async createOneTimePayment(customerId: string, amount: number, method: PaymentMethod): Promise<PaymentResult> {
    const billingType = method === "pix_one_time" ? "PIX" : method === "boleto" ? "BOLETO" : "CREDIT_CARD";
    const data = await this.request<{ id: string; status: string; invoiceUrl?: string; bankSlipUrl?: string }>("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType,
        value: amount,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      }),
    });
    return {
      provider_payment_id: data.id,
      gross_amount: amount,
      method,
      status: ASAAS_STATUS_MAP[data.status] ?? "pending",
      invoice_url: data.invoiceUrl ?? data.bankSlipUrl,
    };
  }

  async getPayment(paymentId: string): Promise<PaymentResult | null> {
    try {
      const data = await this.request<{
        id: string; value: number; netValue?: number;
        status: string; paymentDate?: string; invoiceUrl?: string;
      }>(`/payments/${paymentId}`);
      return {
        provider_payment_id: data.id,
        gross_amount: data.value,
        net_amount: data.netValue,
        status: ASAAS_STATUS_MAP[data.status] ?? "pending",
        paid_at: data.paymentDate,
        invoice_url: data.invoiceUrl,
      };
    } catch {
      return null;
    }
  }

  async refundPayment(paymentId: string): Promise<void> {
    await this.request(`/payments/${paymentId}/refund`, { method: "POST" });
  }

  async listPayments(customerId: string, limit = 20): Promise<PaymentResult[]> {
    const data = await this.request<{ data: Array<{ id: string; value: number; netValue?: number; status: string; paymentDate?: string }> }>(
      `/payments?customer=${customerId}&limit=${limit}`
    );
    return (data.data ?? []).map((p) => ({
      provider_payment_id: p.id,
      gross_amount: p.value,
      net_amount: p.netValue,
      status: ASAAS_STATUS_MAP[p.status] ?? "pending",
      paid_at: p.paymentDate,
    }));
  }

  verifyWebhook(rawBody: string, headers: Record<string, string>): boolean {
    const token = getWebhookToken();
    if (!token) return false;
    const asaasToken = headers["asaas-access-token"] ?? headers["x-asaas-token"] ?? "";
    return asaasToken === token;
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const payload = JSON.parse(rawBody) as {
      event?: string;
      payment?: { id?: string; subscription?: string; customer?: string };
      subscription?: { id?: string; customer?: string };
    };
    const eventType = ASAAS_EVENT_MAP[payload.event ?? ""] ?? "payment_pending";
    return {
      type: eventType,
      provider: "asaas",
      raw: payload,
      idempotency_key: `asaas_${payload.event}_${payload.payment?.id ?? payload.subscription?.id ?? Date.now()}`,
      customer_id: payload.payment?.customer ?? payload.subscription?.customer,
      subscription_id: payload.payment?.subscription ?? payload.subscription?.id,
      payment_id: payload.payment?.id,
      timestamp: new Date().toISOString(),
    };
  }
}
