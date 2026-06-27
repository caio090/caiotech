import { PageHeader } from "@/components/page-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FolderOpen } from "lucide-react";

const typeIcon: Record<string, string> = {
  pdf: "📄", zip: "🗜️", docx: "📝", ai: "🎨", png: "🖼️", jpg: "🖼️", mp4: "🎬", default: "📁",
};

interface FileRow {
  id: string;
  file_name: string;
  file_url: string | null;
  mime_type: string | null;
  created_at: string;
  created_by: string | null;
}

export default async function ClientArquivosPage() {
  let files: FileRow[] = [];

  if (isSupabaseConfigured) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("client_id")
          .eq("id", user.id)
          .maybeSingle();
        const clientId = (profile as { client_id?: string | null } | null)?.client_id;
        if (clientId) {
          const { data } = await supabase
            .from("client_diagnosis_files")
            .select("id, file_name, file_url, mime_type, created_at, created_by")
            .eq("client_id", clientId)
            .order("created_at", { ascending: false });
          files = (data ?? []) as FileRow[];
        }
      }
    } catch {}
  }

  function getIcon(mime: string | null) {
    if (!mime) return typeIcon.default;
    if (mime.includes("pdf")) return typeIcon.pdf;
    if (mime.includes("zip")) return typeIcon.zip;
    if (mime.includes("word") || mime.includes("docx")) return typeIcon.docx;
    if (mime.includes("image")) return typeIcon.jpg;
    if (mime.includes("video")) return typeIcon.mp4;
    return typeIcon.default;
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {files.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{getIcon(f.mime_type)}</div>
              <p className="text-xs font-bold text-gray-800 mb-1 truncate">{f.file_name}</p>
              <p className="text-xs text-gray-400 mt-1">
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
      )}
    </div>
  );
}
