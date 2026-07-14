import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateContentOSClient } from "@/lib/admin-contentos-clients";
import { ContentosCalendarioContent } from "@/app/contentos/calendario/_client-content";
import type { CalendarEvent } from "@/app/contentos/calendario/_client-content";
import { ContentosSubNavServer } from "../_contentos-subnav-server";
import { dbStatusToUi } from "@/lib/supabase/types";

export default async function AdminContentosCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params         = await searchParams;
  const activeClientId = params.client ?? null;

  if (!activeClientId) {
    redirect("/admin/contentos/selecionar-cliente");
  }

  let serverEvents: CalendarEvent[] | undefined = undefined;

  if (isSupabaseConfigured) {
    const validClient = await validateContentOSClient(activeClientId);
    if (!validClient) {
      redirect("/admin/contentos/selecionar-cliente");
    }

    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("content_items")
          .select("id, title, type, channel, status, scheduled_date")
          .eq("client_id", activeClientId)
          .not("scheduled_date", "is", null)
          .order("scheduled_date", { ascending: true });

        if (data) {
          serverEvents = data.map((c) => ({
            id:       c.id,
            title:    c.title,
            platform: c.channel?.split(",")[0]?.trim() ?? "Instagram",
            status:   dbStatusToUi(c.status),
            date:     c.scheduled_date!,
            type:     c.type ?? undefined,
          }));
        }
      }
    } catch (e) {
      console.error("[admin/contentos/calendario] Supabase fetch error:", e);
    }
  }

  return (
    <>
      <ContentosSubNavServer />
      <ContentosCalendarioContent serverEvents={serverEvents} />
    </>
  );
}
