import { PageHeader } from "@/components/page-header";
import { ContentCard } from "@/components/content-card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { dbStatusToUi, contentTypeEmoji } from "@/lib/supabase/types";
import { Image as ImageIcon } from "lucide-react";

interface ContentItem {
  id: string;
  title: string;
  platform: string;
  type: string;
  status: string;
  thumbnail: string;
  scheduledAt?: string | null;
  clientName?: string;
}

export default async function ClientConteudosPage() {
  let contents: ContentItem[] | null = null;
  let companyName = "sua marca";
  let isDemo = true;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("id, company_name")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (clientData) {
          companyName = clientData.company_name ?? "sua marca";
          const { data } = await supabase
            .from("content_items")
            .select("*")
            .eq("client_id", clientData.id)
            .order("created_at", { ascending: false });
          if (data) {
            contents = data.map((c) => ({
              id:          c.id,
              title:       c.title,
              platform:    c.channel?.split(",")[0]?.trim() ?? "Instagram",
              type:        c.type ?? "post",
              status:      dbStatusToUi(c.status) as "draft",
              thumbnail:   contentTypeEmoji(c.type),
              scheduledAt: c.scheduled_date ?? undefined,
            }));
            isDemo = false;
          }
        }
      }
    } catch (e) {
      console.error("[client/conteudos] Supabase fetch error:", e);
    }
  }

  const displayContents = contents ?? [];

  return (
    <div>
      <PageHeader
        title="Meus Conteúdos"
        description={`Todos os conteúdos criados para ${companyName}`}
      />

      {isDemo && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
          Modo demonstração — nenhum conteúdo cadastrado
        </div>
      )}

      {displayContents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">Nenhum conteúdo cadastrado ainda.</p>
          <p className="text-xs text-gray-400 mt-1">
            Os conteúdos criados pela equipe aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {displayContents.map((c) => (
            <ContentCard key={c.id} {...c} />
          ))}
        </div>
      )}
    </div>
  );
}
