import { redirect } from "next/navigation";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getOpUserCtx, fetchOpTasks } from "@/lib/operational-tasks";
import { MinhasTarefasContent } from "./_client-content";
import type { DbOperationalTask } from "@/lib/supabase/types";
import { SmartSuggestionsPanel } from "@/components/smart-suggestions-panel";
import { getOperationalSuggestions } from "@/lib/ai-suggestions";

export default async function MinhasTarefasPage() {
  if (!isSupabaseConfigured) {
    return <MinhasTarefasContent tasks={[]} userRole="designer" roleDisplay="Designer" />;
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getOpUserCtx(supabase);
  if (!ctx) redirect("/login");

  let tasks: DbOperationalTask[] = [];
  let suggestions: Awaited<ReturnType<typeof getOperationalSuggestions>> = [];
  try {
    [tasks, suggestions] = await Promise.all([
      fetchOpTasks(supabase, ctx),
      getOperationalSuggestions(supabase, ctx.userId, ctx.allRoles),
    ]);
  } catch {}

  return (
    <>
      {suggestions.length > 0 && (
        <SmartSuggestionsPanel suggestions={suggestions} compact className="mb-5" />
      )}
      <MinhasTarefasContent
        tasks={tasks}
        userRole={ctx.primaryRole}
        roleDisplay={ctx.roleDisplay}
      />
    </>
  );
}
