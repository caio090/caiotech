"use client";

import { Database, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type SourceState = "conectado" | "importacao_manual" | "planejado" | "bloqueado_api" | "nao_configurado";

const STATE_LABEL: Record<SourceState, string> = {
  conectado: "Conectado",
  importacao_manual: "Importação manual",
  planejado: "Planejado",
  bloqueado_api: "Bloqueado por API",
  nao_configurado: "Não configurado",
};
const STATE_STYLE: Record<SourceState, string> = {
  conectado: "bg-emerald-50 text-emerald-700 border-emerald-100",
  importacao_manual: "bg-blue-50 text-blue-700 border-blue-100",
  planejado: "bg-gray-50 text-gray-500 border-gray-200",
  bloqueado_api: "bg-red-50 text-red-700 border-red-100",
  nao_configurado: "bg-gray-50 text-gray-500 border-gray-200",
};

const SOURCES: Array<{ id: string; name: string; state: SourceState; note?: string }> = [
  { id: "manual", name: "Entrada manual", state: "importacao_manual", note: "Funcional nesta versão — todos os campos das abas são editáveis." },
  { id: "aipede", name: "AiPede", state: "planejado", note: "Importação manual planejada para uma próxima fatia — nenhuma integração real nesta versão." },
  { id: "ifood", name: "iFood", state: "nao_configurado" },
  { id: "olaclick", name: "OlaClick", state: "nao_configurado" },
  { id: "cardapio_proprio", name: "Cardápio próprio", state: "nao_configurado" },
  { id: "whatsapp", name: "WhatsApp", state: "nao_configurado" },
  { id: "csv", name: "CSV/Excel", state: "planejado", note: "Marcado como próximo vertical slice — ainda não implementado." },
];

export function SourcesTab() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Database className="w-3.5 h-3.5 text-indigo-600" />
          <p className="text-xs font-bold text-gray-700">Fontes de dados</p>
        </div>
        <div className="space-y-2">
          {SOURCES.map((s) => (
            <div key={s.id} className="flex items-start justify-between gap-3 bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800">{s.name}</p>
                {s.note && <p className="text-[10px] text-gray-400 mt-0.5">{s.note}</p>}
              </div>
              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0", STATE_STYLE[s.state])}>
                {STATE_LABEL[s.state]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          &ldquo;Ganhos&rdquo; reportados por uma plataforma de delivery não significa automaticamente lucro do estabelecimento —
          taxas, subsídios e repasses precisam ser conferidos separadamente antes de qualquer conclusão financeira.
        </p>
      </div>
    </div>
  );
}
