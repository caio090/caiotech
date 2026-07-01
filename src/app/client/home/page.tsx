import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, hasSupabaseServiceRoleKey } from "@/lib/supabase/server";
import { resolveCurrentClient } from "@/lib/client/resolve-client";
import { ClientHomeContent } from "./_client-content";
import type { ServerPageData, DbOnboardingProfile, DbProfile, DbClient } from "@/lib/supabase/types";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getClientSafeSuggestions } from "@/lib/ai-suggestions";

export default async function ClientHomePage() {
  let serverData: ServerPageData | null = null;
  let suggestions: Awaited<ReturnType<typeof getClientSafeSuggestions>> = [];

  if (isSupabaseConfigured) {
    try {
      const resolved = await resolveCurrentClient();

      console.log("[client/home] resolve source:", resolved?.source, "clientId:", resolved?.clientId);

      if (resolved?.userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clientData = resolved.client as any;
        let onboarding: DbOnboardingProfile | null = null;

        if (clientData?.id) {
          // Usa admin client para onboarding_profiles (RLS pode bloquear role 'client')
          const dbQuery = hasSupabaseServiceRoleKey()
            ? createSupabaseAdminClient()
            : null;

          if (dbQuery) {
            const { data: onb } = await dbQuery
              .from("onboarding_profiles")
              .select("*")
              .eq("client_id", clientData.id)
              .maybeSingle();
            onboarding = (onb as DbOnboardingProfile) ?? null;
          }
        }

        serverData = {
          profile:    resolved.profile as DbProfile | null,
          client:     resolved.client as DbClient | null,
          onboarding,
        };

        if (clientData?.id && hasSupabaseServiceRoleKey()) {
          try {
            const adminDb = createSupabaseAdminClient();
            suggestions = await getClientSafeSuggestions(adminDb as Parameters<typeof getClientSafeSuggestions>[0], clientData.id);
          } catch { /* suggestions não críticas */ }
        }

        console.log("[client/home] serverData:", {
          source:    resolved.source,
          client:    clientData?.company_name ?? null,
          hasOnb:    !!onboarding,
        });
      }
    } catch (e) {
      console.error("[client/home] error:", e);
    }
  }

  return (
    <>
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}
      <ClientHomeContent serverData={serverData} />
    </>
  );
}
