import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { DbOperationalTask } from "@/lib/supabase/types";
import { KanbanClientContent } from "./_client-content";

export default async function AdminOperacionalKanbanPage() {
  let tasks: DbOperationalTask[] = [];
  let clients: { id: string; company_name: string | null }[] = [];
  let currentUserId: string | undefined;
  let currentUserRole: string | undefined;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        currentUserRole = profile?.role ?? "admin";
      }

      const [tasksRes, clientsRes] = await Promise.all([
        supabase
          .from("operational_tasks")
          .select("*, clients(company_name), profiles(name)")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("clients")
          .select("id, company_name")
          .order("company_name"),
      ]);

      if (!tasksRes.error && tasksRes.data)   tasks   = tasksRes.data   as DbOperationalTask[];
      if (!clientsRes.error && clientsRes.data) clients = clientsRes.data;
    } catch {}
  }

  return (
    <div className="h-full flex flex-col">
      <KanbanClientContent
        initialTasks={tasks}
        clients={clients}
        isAdmin={true}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
