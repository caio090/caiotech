import { getFeatureFlag } from "@/lib/feature-flags";
import { getDesignEditorProvider, type DesignEditorProvider } from "./design-editor";
import { getCustomerInboxProvider, type CustomerInboxProvider } from "./customer-inbox";
import { getSocialSchedulerProvider, type SocialSchedulerProvider } from "./social-scheduler";
import type { ProviderStatus } from "./shared/types";

export interface ProviderStatusEntry {
  category: string;
  providerId: string;
  providerName: string;
  status: ProviderStatus;
  blocker?: string;
  capabilities: { id: string; label: string; supported: boolean }[];
  lastCheck?: string;
}

export function resolveDesignEditorProvider(role: string): DesignEditorProvider {
  const flag = getFeatureFlag("editor_os", { role });
  if (!flag.enabled) return getDesignEditorProvider();
  return getDesignEditorProvider("mock");
}

export function resolveCustomerInboxProvider(): CustomerInboxProvider {
  return getCustomerInboxProvider();
}

export function resolveSocialSchedulerProvider(): SocialSchedulerProvider {
  return getSocialSchedulerProvider();
}

export async function getAllProvidersStatus(role: string): Promise<ProviderStatusEntry[]> {
  const designProvider = resolveDesignEditorProvider(role);
  const inboxProvider = resolveCustomerInboxProvider();
  const schedulerProvider = resolveSocialSchedulerProvider();

  const [designHealth, inboxHealth, schedulerHealth] = await Promise.all([
    designProvider.healthCheck(),
    inboxProvider.healthCheck(),
    schedulerProvider.healthCheck(),
  ]);

  return [
    {
      category: "design_editor",
      providerId: designProvider.id,
      providerName: designProvider.name,
      status: designProvider.status,
      blocker: designProvider.blocker,
      capabilities: designProvider.capabilities,
      lastCheck: designHealth.lastCheckedAt ?? new Date().toISOString(),
    },
    {
      category: "customer_inbox",
      providerId: inboxProvider.id,
      providerName: inboxProvider.name,
      status: inboxProvider.status,
      blocker: inboxProvider.blocker,
      capabilities: inboxProvider.capabilities,
      lastCheck: inboxHealth.lastCheckedAt ?? new Date().toISOString(),
    },
    {
      category: "social_scheduler",
      providerId: schedulerProvider.id,
      providerName: schedulerProvider.name,
      status: schedulerProvider.status,
      blocker: schedulerProvider.blocker,
      capabilities: schedulerProvider.capabilities,
      lastCheck: schedulerHealth.lastCheckedAt ?? new Date().toISOString(),
    },
  ];
}
