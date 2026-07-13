// Provider manual — para registros administrativos (PIX manual, boleto, fatura manual).
// Não faz chamadas a APIs externas. Apenas registra operações administrativas.

import type {
  PaymentProvider, CreateCustomerInput, CustomerResult,
  CreateCheckoutInput, CheckoutResult, SubscriptionResult,
  PaymentResult, PaymentMethod, WebhookEvent,
} from "./types";
import { ProviderNotConfiguredError } from "./types";

export class ManualProvider implements PaymentProvider {
  readonly name = "manual";
  readonly isConfigured = true; // sempre disponível

  async createCustomer(input: CreateCustomerInput): Promise<CustomerResult> {
    return {
      provider_customer_id: `manual_${input.account_id}`,
      provider: "manual",
    };
  }

  async updateCustomer(_id: string, input: Partial<CreateCustomerInput>): Promise<CustomerResult> {
    return {
      provider_customer_id: `manual_${input.account_id ?? "unknown"}`,
      provider: "manual",
    };
  }

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutResult> {
    // Provider manual não tem checkout hospedado — retorna URL de retorno com instrução
    return {
      checkout_id: `manual_checkout_${Date.now()}`,
      checkout_url: input.return_url,
      status: "pending",
    };
  }

  async createSubscription(_customerId: string, planSlug: string): Promise<SubscriptionResult> {
    return {
      provider_subscription_id: `manual_sub_${Date.now()}`,
      status: "active",
    };
  }

  async getSubscription(_subscriptionId: string): Promise<SubscriptionResult | null> {
    return null;
  }

  async changeSubscriptionPlan(_subscriptionId: string, newPlanSlug: string): Promise<SubscriptionResult> {
    return {
      provider_subscription_id: _subscriptionId,
      status: "active",
    };
  }

  async cancelSubscription(_subscriptionId: string): Promise<void> { /* noop */ }
  async pauseSubscription(_subscriptionId: string): Promise<void>   { /* noop */ }
  async resumeSubscription(_subscriptionId: string): Promise<void>  { /* noop */ }

  async createOneTimePayment(
    customerId: string,
    amount: number,
    method: PaymentMethod
  ): Promise<PaymentResult> {
    return {
      provider_payment_id: `manual_pay_${Date.now()}`,
      gross_amount: amount,
      net_amount: amount,
      method,
      status: "pending",
    };
  }

  async getPayment(_paymentId: string): Promise<PaymentResult | null> {
    return null;
  }

  async refundPayment(_paymentId: string): Promise<void> {
    // Reembolso manual — requer confirmação administrativa externa
  }

  async listPayments(_customerId: string, _limit?: number): Promise<PaymentResult[]> {
    return [];
  }

  verifyWebhook(_rawBody: string, _headers: Record<string, string>): boolean {
    return false; // provider manual não tem webhooks
  }

  parseWebhookEvent(_rawBody: string): WebhookEvent {
    throw new ProviderNotConfiguredError("manual");
  }
}
