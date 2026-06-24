import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";

const actions = [
  { client: "Demo Cliente", area: "Conteúdo", action: "Criar calendário editorial mensal com 3 posts/semana", priority: "alta", status: "in_progress", deadline: "2024-02-15" },
  { client: "Demo Cliente", area: "Engajamento", action: "Responder todos os comentários dos últimos 7 dias", priority: "alta", status: "pending", deadline: "2024-02-10" },
  { client: "Duh Lanches", area: "Perfil", action: "Atualizar bio e foto de perfil com identidade visual nova", priority: "media", status: "done", deadline: "2024-02-05" },
  { client: "Duh Lanches", area: "Conteúdo", action: "Produzir 2 reels mostrando o processo de preparo", priority: "alta", status: "in_progress", deadline: "2024-02-20" },
  { client: "O Pedreirão", area: "Posicionamento", action: "Definir nicho: residencial vs comercial", priority: "urgente", status: "pending", deadline: "2024-02-08" },
  { client: "Odonto Lura", area: "Crescimento", action: "Campanha de indicação para pacientes ativos", priority: "media", status: "pending", deadline: "2024-02-25" },
];

const priorityColor: Record<string, string> = {
  urgente: "bg-red-100 text-red-700",
  alta: "bg-orange-100 text-orange-700",
  media: "bg-amber-100 text-amber-700",
};

const statusLabel: Record<string, string> = {
  done: "Concluído",
  in_progress: "Em andamento",
  pending: "Pendente",
};

export default function GrowthPlanoPage() {
  return (
    <div>
      <PageHeader title="Plano de Ação" description="Ações estratégicas por cliente" />
      <div className="space-y-2">
        {actions.map((a, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-gray-800">{a.client}</span>
                <span className="text-[10px] text-gray-400">· {a.area}</span>
              </div>
              <p className="text-sm text-gray-700">{a.action}</p>
              <p className="text-xs text-gray-400 mt-1">Prazo: {new Date(a.deadline).toLocaleDateString("pt-BR")}</p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", priorityColor[a.priority])}>{a.priority}</span>
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", a.status === "done" ? "bg-emerald-50 text-emerald-600" : a.status === "in_progress" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500")}>
                {statusLabel[a.status]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
