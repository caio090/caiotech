import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getOpUserCtx, fetchOpTasks } from "@/lib/operational-tasks";
import { BriefingsContent } from "./_client-content";
import type { DbOperationalTask } from "@/lib/supabase/types";

export default async function OperacionalBriefingsPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const params = await searchParams;
  const initialTaskId = params.task ?? null;

  let tasks: DbOperationalTask[] = [];
  let primaryRole  = "operacional";
  let allRoles: string[] = ["operacional"];

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const ctx = await getOpUserCtx(supabase);

      if (ctx) {
        primaryRole = ctx.primaryRole;
        allRoles    = ctx.allRoles;

        tasks = await fetchOpTasks(supabase, ctx, {
          statusFilter: null,
          includeDone:  false,
        });
      }
    } catch {}
  }

  return (
    <BriefingsContent
      tasks={tasks}
      primaryRole={primaryRole}
      allRoles={allRoles}
      initialTaskId={initialTaskId}
    />
  );
}
