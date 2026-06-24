import { PageHeader } from "@/components/page-header";
import { mockCourses } from "@/data/mock-data";

const achievements = [
  { emoji: "🎯", label: "Primeira aula concluída", date: "Jan 2024" },
  { emoji: "🔥", label: "7 dias seguidos estudando", date: "Jan 2024" },
  { emoji: "📚", label: "Primeiro curso finalizado", date: "Fev 2024" },
];

export default function AcademyProgressoPage() {
  const completed = mockCourses.filter((c) => c.progress === 100).length;
  const inProgress = mockCourses.filter((c) => c.progress > 0 && c.progress < 100).length;
  const totalProgress = Math.round(mockCourses.reduce((s, c) => s + c.progress, 0) / mockCourses.length);

  return (
    <div>
      <PageHeader title="Meu Progresso" description="Acompanhe sua evolução na Academy" />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-black text-amber-500">{totalProgress}%</div>
          <div className="text-xs text-gray-400 mt-0.5">Progresso geral</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-black text-emerald-600">{completed}</div>
          <div className="text-xs text-gray-400 mt-0.5">Cursos concluídos</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-2xl font-black text-blue-600">{inProgress}</div>
          <div className="text-xs text-gray-400 mt-0.5">Em andamento</div>
        </div>
      </div>

      <h2 className="text-sm font-bold text-gray-800 mb-3">Progresso por curso</h2>
      <div className="space-y-3 mb-6">
        {mockCourses.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">{c.thumbnail}</span>
              <span className="text-xs font-bold text-gray-800 flex-1">{c.title}</span>
              <span className="text-xs font-black text-amber-600">{c.progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${c.progress}%` }} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-bold text-gray-800 mb-3">Conquistas</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        {achievements.map((a) => (
          <div key={a.label} className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1.5">{a.emoji}</div>
            <p className="text-xs font-bold text-amber-800">{a.label}</p>
            <p className="text-[10px] text-amber-500 mt-0.5">{a.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
