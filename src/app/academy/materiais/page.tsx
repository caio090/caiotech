import { PageHeader } from "@/components/page-header";

const materials = [
  { name: "Guia de Copywriting para Instagram", type: "PDF", size: "2.4 MB", course: "Copywriting para Redes" },
  { name: "Template Calendário Editorial", type: "XLSX", size: "340 KB", course: "Planejamento de Conteúdo" },
  { name: "Checklist de Auditoria de Perfil", type: "PDF", size: "1.1 MB", course: "Social Media Pro" },
  { name: "Kit de Templates Canva", type: "ZIP", size: "18.5 MB", course: "Design para Redes" },
  { name: "Swipe File de Captions", type: "DOCX", size: "620 KB", course: "Copywriting para Redes" },
  { name: "Planilha de Métricas Mensal", type: "XLSX", size: "780 KB", course: "Analytics Básico" },
];

const typeColor: Record<string, string> = {
  PDF: "bg-red-50 text-red-600",
  XLSX: "bg-emerald-50 text-emerald-600",
  DOCX: "bg-blue-50 text-blue-600",
  ZIP: "bg-amber-50 text-amber-600",
};

export default function AcademyMateriaisPage() {
  return (
    <div>
      <PageHeader title="Materiais" description="Todos os recursos complementares dos cursos" />
      <div className="space-y-2">
        {materials.map((m) => (
          <div key={m.name} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
            <div className={`text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 ${typeColor[m.type] ?? "bg-gray-50 text-gray-600"}`}>{m.type}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{m.name}</p>
              <p className="text-xs text-gray-400">{m.course} · {m.size}</p>
            </div>
            <button className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl font-medium hover:bg-amber-100 transition-colors flex-shrink-0">
              Baixar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
