import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbContentItem } from "@/lib/supabase/types";
import { ContentosPublicacoesContent } from "./_client-content";

export default async function ContentosPublicacoesPage() {
  let serverContents: DbContentItem[] | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clientData } = await supabase
          .from("clients").select("id").eq("owner_id", user.id).maybeSingle();

        if (clientData) {
          const { data } = await supabase
            .from("content_items")
            .select("*")
            .eq("client_id", clientData.id)
            .in("status", ["aprovado", "agendado", "publicado"])
            .order("scheduled_date", { ascending: true });
          serverContents = data ?? [];
        } else {
          const { data } = await supabase
            .from("content_items")
            .select("*")
            .in("status", ["aprovado", "agendado", "publicado"])
            .order("scheduled_date", { ascending: true })
            .limit(100);
          serverContents = data ?? [];
        }
      }
    } catch (e) {
      console.error("[contentos/publicacoes] Supabase fetch error:", e);
    }
  }

  return <ContentosPublicacoesContent serverContents={serverContents} />;
}
