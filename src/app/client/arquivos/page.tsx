import { PageHeader } from "@/components/page-header";
import { getFilesByClient } from "@/data/mock-data";

const typeIcon: Record<string, string> = { pdf: "📄", zip: "🗜️", docx: "📝", ai: "🎨", default: "📁" };

export default function ClientArquivosPage() {
  const files = getFilesByClient("client-1");
  return (
    <div>
      <PageHeader title="Arquivos" description="Materiais e entregáveis do seu projeto" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {files.map((f) => (
          <div key={f.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">{typeIcon[f.type] || typeIcon.default}</div>
            <p className="text-xs font-bold text-gray-800 mb-1 truncate">{f.name}</p>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{f.size}</span>
              <span>{new Date(f.uploadedAt).toLocaleDateString("pt-BR")}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">por {f.uploadedBy}</p>
            <button className="mt-3 w-full py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
              Baixar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
