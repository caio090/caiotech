import { PageHeader } from "@/components/page-header";
import { mockCourses, mockLessons } from "@/data/mock-data";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AcademyCursoPage() {
  const course = mockCourses[0];
  const lessons = mockLessons.filter((l) => l.courseId === course.id);

  return (
    <div>
      <PageHeader title={course.title} description={`por ${course.instructor} · ${course.lessons} aulas`} />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-gray-900 rounded-2xl aspect-video flex items-center justify-center mb-4">
            <span className="text-6xl">{course.thumbnail}</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-2">Sobre este curso</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Aprenda as melhores práticas de {course.title.toLowerCase()} com técnicas aplicadas por agências de alto desempenho.
              Conteúdo prático, direto ao ponto, com exemplos reais.
            </p>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-800 mb-3">Aulas ({lessons.length})</h2>
          <div className="space-y-2">
            {lessons.map((l, i) => (
              <Link key={l.id} href="/academy/aula" className={cn("flex items-center gap-3 p-3 rounded-xl border transition-colors hover:border-amber-200 hover:bg-amber-50", l.completed ? "bg-emerald-50 border-emerald-100" : "bg-white border-gray-100")}>
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0", l.completed ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500")}>
                  {l.completed ? "✓" : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{l.title}</p>
                  <p className="text-[10px] text-gray-400">{l.duration}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
