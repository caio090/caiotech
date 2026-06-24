import { PageHeader } from "@/components/page-header";
import { mockCourses } from "@/data/mock-data";
import Link from "next/link";

export default function AcademyCursosPage() {
  return (
    <div>
      <PageHeader title="Cursos" description="Todos os cursos disponíveis na Academy" />
      <div className="flex gap-2 mb-5 flex-wrap">
        {["Todos", "Social Media", "Marketing", "Gestão", "Design"].map((f) => (
          <button key={f} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-xl hover:border-amber-400 hover:text-amber-600 transition-colors">{f}</button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockCourses.map((c) => (
          <Link key={c.id} href="/academy/curso" className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow block">
            <div className="text-3xl mb-3">{c.thumbnail}</div>
            <h3 className="text-sm font-bold text-gray-800 mb-1">{c.title}</h3>
            <p className="text-xs text-gray-400 mb-3">por {c.instructor} · {c.lessons} aulas</p>
            {c.progress > 0 ? (
              <>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${c.progress}%` }} />
                </div>
                <p className="text-[10px] text-gray-400">{c.progress}% concluído</p>
              </>
            ) : (
              <button className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl font-medium hover:bg-amber-100 transition-colors">
                Começar
              </button>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
