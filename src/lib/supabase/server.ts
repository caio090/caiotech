import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

export { isSupabaseConfigured };

export async function createServerSupabaseClient() {
  if (!isSupabaseConfigured) {
    throw new Error("[Supabase] Não configurado — rodando em modo demonstração.");
  }

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Components não podem setar cookies — ignorado (middleware gerencia)
        }
      },
    },
  });
}
