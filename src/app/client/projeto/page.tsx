import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FolderOpen } from "lucide-react";

export default async function ClientProjetoPage() {
  let projectName: string | null = null;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: clientRow } = await supabase
          .from("clients")
          .select("company_name")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (clientRow?.company_name) projectName = clientRow.company_name;
      }
    } catch {}
  }

  return (
    <div>
      <PageHeader
        title="Projeto"
        description={projectName ? `Acompanhe a evolução de ${projectName}` : "Acompanhe a evolução do seu projeto"}
      />

      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
          <FolderOpen className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="text-sm font-bold text-gray-700 mb-1">Nenhum projeto ativo ainda</p>
        <p className="text-xs text-gray-400 text-center max-w-xs">
          Quando a equipe configurar seu projeto, ele aparecerá aqui com tarefas, prazos e progresso.
        </p>
      </div>
    </div>
  );
}
