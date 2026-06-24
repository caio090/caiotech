import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DbContentItem } from "@/lib/supabase/types";
import { ContentosBibliotecaContent } from "./_client-content";

export default async function ContentosBibliotecaPage() {
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
            .order("created_at", { ascending: false });
          serverContents = data ?? [];
        } else {
          const { data } = await supabase
            .from("content_items")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);
          serverContents = data ?? [];
        }
      }
    } catch (e) {
      console.error("[contentos/biblioteca] Supabase fetch error:", e);
    }
  }

  return <ContentosBibliotecaContent serverContents={serverContents} />;
}
