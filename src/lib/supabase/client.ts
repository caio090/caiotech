"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

export { isSupabaseConfigured };

export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error("[Supabase] Não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
