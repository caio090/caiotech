import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { clearOnboarding } from "@/lib/onboarding-store";

const LOKAT_KEYS = [
  "lokat_onboarding",
  "lokat_client_id",
  "lokat_active_client_id",
  "lokat_active_client_name",
];

export async function performSignOut() {
  try {
    if (isSupabaseConfigured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
  } catch {}

  clearOnboarding();
  LOKAT_KEYS.forEach((k) => localStorage.removeItem(k));
  sessionStorage.clear();
}
