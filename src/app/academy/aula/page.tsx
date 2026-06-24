import { PageHeader } from "@/components/page-header";
import { mockLessons } from "@/data/mock-data";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Paperclip } from "lucide-react";

export default function AcademyAulaPage() {
  const lesson = mockLessons[0];

  return (
    <div>
      <PageHeader title={lesson.title} description={`Duração: ${lesson.duration}`} />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gray-900 rounded-2xl aspect-video flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mb-2">
                <Play className="w-7 h-7 text-white" strokeWidth={1.5} />
              </div>
              <p className="text-white/60 text-xs">Player de vídeo (mockado)</p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-4">
            <button className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl hover:border-gray-300 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
              Aula anterior
            </button>
            <button className="flex items-center gap-1.5 text-xs font-medium text-white bg-amber-500 px-3 py-2 rounded-xl hover:bg-amber-600 transition-colors">
              Próxima aula
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-2">Anotações da aula</h2>
            <textarea placeholder="Anote os pontos mais importantes aqui..." className="w-full h-32 text-sm text-gray-700 outline-none resize-none" />
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">Materiais</h2>
          <div className="space-y-2">
            {["Slides da aula.pdf", "Checklist de ferramentas.xlsx", "Template de planejamento.docx"].map((m) => (
              <div key={m} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-2.5">
                <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" strokeWidth={1.5} />
                <p className="text-xs text-gray-700 flex-1">{m}</p>
                <button className="text-[10px] text-amber-600 font-medium">Baixar</button>
              </div>
            ))}
          </div>
          <Link href="/academy/curso" className="mt-4 text-xs text-gray-500 flex items-center gap-1 hover:text-gray-700">
            <ChevronLeft className="w-3 h-3" />
            Voltar ao curso
          </Link>
        </div>
      </div>
    </div>
  );
}
