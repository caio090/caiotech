// Contrato abstrato para providers de pagamento.
// Implementações concretas: ManualProvider, AsaasProvider (futuro).

export type PaymentMethod =
  | "card_recurring"
  | "pix_automatic"
  | "pix_one_time"
  | "boleto"
  | "manual_pix"
  | "manual_invoice"
  | "coupon_free"
  | "beta_free";

export type CheckoutStatus =
  | "creating"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "canceled";

export type WebhookEventType =
  | "payment_created"
  | "payment_pending"
  | "payment_confirmed"
  | "payment_received"
  | "payment_failed"
  | "payment_overdue"
  | "payment_refunded"
  | "payment_chargeback"
  | "subscription_created"
  | "subscription_updated"
  | "subscription_canceled"
  | "checkout_completed";

export interface CreateCustomerInput {
  account_id: string;
  name: string;
  email: string;
  cpf_cnpj?: string;
  phone?: string;
}

export interface CustomerResult {
  provider_customer_id: string;
  provider: string;
}

export interface CreateCheckoutInput {
  account_id: string;
  plan_slug: string;
  billing_cycle: "monthly" | "yearly";
  coupon_code?: string;
  return_url: string;
  customer_id?: string;
}

export interface CheckoutResult {
  checkout_id: string;
  checkout_url: string;
  status: CheckoutStatus;
  expires_at?: string;
}

export interface SubscriptionResult {
  provider_subscription_id: string;
  status: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_end?: string;
}

export interface PaymentResult {
  provider_payment_id: string;
  gross_amount: number;
  gateway_fee?: number;
  net_amount?: number;
  method?: PaymentMethod;
  status: string;
  paid_at?: string;
  receipt_url?: string;
  invoice_url?: string;
}

export interface WebhookEvent {
  type: WebhookEventType;
  provider: string;
  raw: unknown;
  idempotency_key: string;
  customer_id?: string;
  subscription_id?: string;
  payment_id?: string;
  timestamp: string;
}

// Contrato de provider de pagamento
export interface PaymentProvider {
  readonly name: string;
  readonly isConfigured: boolean;

  createCustomer(input: CreateCustomerInput): Promise<CustomerResult>;
  updateCustomer(customerId: string, input: Partial<CreateCustomerInput>): Promise<CustomerResult>;

  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult>;

  createSubscription(customerId: string, planSlug: string): Promise<SubscriptionResult>;
  getSubscription(subscriptionId: string): Promise<SubscriptionResult | null>;
  changeSubscriptionPlan(subscriptionId: string, newPlanSlug: string): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  pauseSubscription(subscriptionId: string): Promise<void>;
  resumeSubscription(subscriptionId: string): Promise<void>;

  createOneTimePayment(customerId: string, amount: number, method: PaymentMethod): Promise<PaymentResult>;
  getPayment(paymentId: string): Promise<PaymentResult | null>;
  refundPayment(paymentId: string): Promise<void>;
  listPayments(customerId: string, limit?: number): Promise<PaymentResult[]>;

  verifyWebhook(rawBody: string, headers: Record<string, string>): boolean;
  parseWebhookEvent(rawBody: string): WebhookEvent;
}

// Erro padrão de provider não configurado
export class ProviderNotConfiguredError extends Error {
  constructor(providerName: string) {
    super(`Gateway de pagamento "${providerName}" ainda não configurado.`);
    this.name = "ProviderNotConfiguredError";
  }
}
