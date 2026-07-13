// Registry de providers de pagamento.
// Seleciona o provider correto baseado na variável PAYMENT_PROVIDER ou na configuração.

import type { PaymentProvider } from "./types";
import { ManualProvider } from "./manual";
import { AsaasProvider } from "./asaas";

export type ProviderSlug = "manual" | "asaas" | "stripe_future";

const registry: Record<ProviderSlug, PaymentProvider | null> = {
  manual:         new ManualProvider(),
  asaas:          new AsaasProvider(),
  stripe_future:  null,
};

export function getPaymentProvider(slug: ProviderSlug = "manual"): PaymentProvider {
  const provider = registry[slug];
  if (!provider) {
    throw new Error(`Provider "${slug}" não está implementado nesta versão.`);
  }
  return provider;
}

// Retorna o provider ativo baseado nas variáveis de ambiente.
// Fallback: manual (sempre disponível).
export function getActiveProvider(): PaymentProvider {
  const asaas = registry.asaas;
  if (asaas?.isConfigured) return asaas;
  return registry.manual!;
}

export function getProviderStatus(): {
  active: ProviderSlug;
  configured: boolean;
  environment: string;
} {
  const asaas = registry.asaas;
  if (asaas?.isConfigured) {
    return {
      active: "asaas",
      configured: true,
      environment: process.env.ASAAS_ENVIRONMENT ?? "sandbox",
    };
  }
  return { active: "manual", configured: false, environment: "none" };
}

export type { PaymentProvider } from "./types";
export { ProviderNotConfiguredError } from "./types";
