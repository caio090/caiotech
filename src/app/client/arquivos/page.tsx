import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FolderOpen } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  briefing: "Briefing", diagnosis: "Diagnóstico", identity: "Identidade",
  content: "Conteúdo", report: "Relatório", invoice: "Nota fiscal",
  media: "Mídia", general: "Geral",
};

function mimeIcon(mime: string | null, category: string | null) {
  if (category === "invoice")    return "🧾";
  if (category === "report")     return "📊";
  if (category === "briefing")   return "📋";
  if (category === "identity")   return "🎨";
  if (!mime) return "📁";
  if (mime.includes("pdf"))      return "📄";
  if (mime.includes("zip"))      return "🗜️";
  if (mime.includes("image"))    return "🖼️";
  if (mime.includes("video"))    return "🎬";
  if (mime.includes("word") || mime.includes("docx")) return "📝";
  return "📁";
}

interface FileRow {
  id: string;
  title: string;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  category: string | null;
  created_at: string;
}

export default async function ClientArquivosPage() {
  let files: FileRow[]    = [];
  let usedLegacyTable     = false;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles").select("client_id").eq("id", user.id).maybeSingle();
        const clientId = (profile as { client_id?: string | null } | null)?.client_id;

        if (clientId) {
          // Tenta client_files primeiro (SQL 44)
          const { data: cfData, error: cfErr } = await supabase
            .from("client_files")
            .select("id, title, file_name, file_url, file_type, category, created_at")
            .eq("client_id", clientId)
            .eq("visible_to_client", true)
            .order("created_at", { ascending: false });

          if (!cfErr) {
            files = (cfData ?? []) as FileRow[];
          } else {
            // Fallback para tabela legada
            const { data: legacyData } = await supabase
              .from("client_diagnosis_files")
              .select("id, file_name, file_url, mime_type, created_at")
              .eq("client_id", clientId)
              .order("created_at", { ascending: false });

            if (legacyData && legacyData.length > 0) {
              usedLegacyTable = true;
              files = (legacyData as Array<{
                id: string; file_name: string; file_url: string | null;
                mime_type: string | null; created_at: string;
              }>).map((f) => ({
                id: f.id, title: f.file_name, file_name: f.file_name,
                file_url: f.file_url, file_type: f.mime_type,
                category: "diagnosis", created_at: f.created_at,
              }));
            }
          }
        }
      }
    } catch {
      // Se tabelas não existem, mostra empty state
    }
  }

  return (
    <div>
      <PageHeader title="Arquivos" description="Materiais e entregáveis do seu projeto" />

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <FolderOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-1">Nenhum arquivo enviado ainda</p>
          <p className="text-xs text-gray-400 text-center max-w-xs">
            Arquivos enviados pela equipe aparecerão aqui para download.
          </p>
        </div>
      ) : (
        <>
          {usedLegacyTable && (
            <div className="mb-4 text-[10px] font-medium text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
              Exibindo arquivos de diagnóstico legados.
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{mimeIcon(f.file_type, f.category)}</div>
                <p className="text-xs font-bold text-gray-800 mb-0.5 truncate">{f.title}</p>
                {f.file_name && f.file_name !== f.title && (
                  <p className="text-[10px] text-gray-400 truncate mb-0.5">{f.file_name}</p>
                )}
                {f.category && (
                  <span className="inline-block text-[10px] font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                    {CATEGORY_LABEL[f.category] ?? f.category}
                  </span>
                )}
                <p className="text-[10px] text-gray-400 mt-2">
                  {new Date(f.created_at).toLocaleDateString("pt-BR")}
                </p>
                {f.file_url && (
                  <a
                    href={f.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block text-center py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Baixar
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
