import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ContentosCalendarioContent } from "./_client-content";
import type { CalendarEvent } from "./_client-content";
import { dbStatusToUi } from "@/lib/supabase/types";

export default async function ContentosCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const params = await searchParams;
  const activeClientId = params.client ?? null;

  let serverEvents: CalendarEvent[] | undefined = undefined;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clientData } = await supabase
          .from("clients").select("id").eq("owner_id", user.id).maybeSingle();

        const query = supabase
          .from("content_items")
          .select("id, title, type, channel, status, scheduled_date, caption, script, objective")
          .not("scheduled_date", "is", null)
          .order("scheduled_date", { ascending: true });

        if (clientData) {
          query.eq("client_id", clientData.id);
        } else if (activeClientId) {
          query.eq("client_id", activeClientId);
        }
        // else: show all events for staff with no client filter

        const { data } = await query;
        if (data) {
          serverEvents = data.map((c) => ({
            id:        c.id,
            title:     c.title,
            platform:  c.channel?.split(",")[0]?.trim() ?? "Instagram",
            status:    dbStatusToUi(c.status),
            date:      c.scheduled_date!,
            type:      c.type ?? undefined,
            caption:   c.caption ?? undefined,
            copy:      c.script ?? undefined,
            objective: c.objective ?? undefined,
          }));
        }
      }
    } catch (e) {
      console.error("[contentos/calendario] Supabase fetch error:", e);
    }
  }

  return <ContentosCalendarioContent serverEvents={serverEvents} />;
}
