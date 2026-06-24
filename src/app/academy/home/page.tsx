import { PageHeader } from "@/components/page-header";
import { mockCourses } from "@/data/mock-data";
import Link from "next/link";

export default function AcademyHomePage() {
  const inProgress = mockCourses.filter((c) => c.progress > 0 && c.progress < 100).slice(0, 2);
  const recommended = mockCourses.filter((c) => c.progress === 0).slice(0, 2);

  return (
    <div>
      <PageHeader title="Academy" description="Olá, Ana! Continue aprendendo." />
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div>
          <p className="text-white/80 text-xs mb-1">Sua trilha atual</p>
          <h2 className="text-white font-black text-lg">Social Media Pro</h2>
          <p className="text-white/70 text-xs mt-0.5">3 cursos em andamento · 12h assistidas</p>
        </div>
        <div className="text-right">
          <div className="text-white font-black text-3xl">65%</div>
          <p className="text-white/70 text-xs">concluído</p>
        </div>
      </div>

      <h2 className="text-sm font-bold text-gray-800 mb-3">Continuar estudando</h2>
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {inProgress.map((c) => (
          <Link key={c.id} href="/academy/curso" className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow block">
            <div className="text-2xl mb-2">{c.thumbnail}</div>
            <p className="text-xs font-bold text-gray-800 mb-0.5">{c.title}</p>
            <p className="text-[10px] text-gray-400 mb-3">{c.instructor}</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${c.progress}%` }} />
            </div>
            <p className="text-[10px] text-gray-400">{c.progress}% concluído</p>
          </Link>
        ))}
      </div>

      <h2 className="text-sm font-bold text-gray-800 mb-3">Recomendados para você</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {recommended.map((c) => (
          <Link key={c.id} href="/academy/curso" className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-shadow block">
            <div className="text-2xl mb-2">{c.thumbnail}</div>
            <p className="text-xs font-bold text-gray-800 mb-0.5">{c.title}</p>
            <p className="text-[10px] text-gray-400 mb-1">{c.instructor}</p>
            <p className="text-[10px] text-amber-600 font-medium">{c.lessons} aulas</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
