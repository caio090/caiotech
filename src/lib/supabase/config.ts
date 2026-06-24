export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "[Supabase] Variáveis de ambiente não configuradas — aplicação rodando em modo demonstração.\n" +
    "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local"
  );
}
