"use client";
import { useState } from "react";
import { X, ClipboardList, Palette, Video, ScrollText, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const PROD_OPTIONS = [
  { id: "designer",     icon: Palette,    label: "Design",       desc: "Arte, carrossel, story, feed",   task_type: "arte",    department: "design",       assigned_role: "designer" },
  { id: "videomaker",   icon: Video,      label: "Videomaker",   desc: "Reels, vídeo, captação, edição", task_type: "video",   department: "video",        assigned_role: "videomaker" },
  { id: "social_media", icon: ScrollText, label: "Social Media", desc: "Legenda, roteiro, calendário",   task_type: "legenda", department: "social_media", assigned_role: "social_media" },
  { id: "operacional",  icon: Users,      label: "Operacional",  desc: "Tarefa geral para a equipe",     task_type: "outro",   department: "geral",        assigned_role: "operacional" },
] as const;

export type ProdOptionId = typeof PROD_OPTIONS[number]["id"];

export const PRIORITY_OPTIONS = [
  { id: "baixa",   label: "Baixa" },
  { id: "media",   label: "Média" },
  { id: "alta",    label: "Alta" },
  { id: "urgente", label: "Urgente" },
];

export interface SendToProdConfig {
  task_type:     string;
  department:    string;
  assigned_role: string;
  due_date:      string | null;
  priority:      string;
  notes:         string;
}

interface Props {
  onClose:      () => void;
  onSubmit:     (cfg: SendToProdConfig) => Promise<void>;
  defaultRole?: string;
  contentTitle: string;
  clientName:   string;
  sending:      boolean;
}

export function SendToProdModal({ onClose, onSubmit, defaultRole, contentTitle, clientName, sending }: Props) {
  const defaultOption = PROD_OPTIONS.find((o) => o.assigned_role === defaultRole) ?? PROD_OPTIONS[0];
  const [selected, setSelected] = useState<string>(defaultOption.id);
  const [dueDate,   setDueDate]  = useState("");
  const [priority,  setPriority] = useState("media");
  const [notes,     setNotes]    = useState("");

  const opt = PROD_OPTIONS.find((o) => o.id === selected) ?? PROD_OPTIONS[0];

  async function handleSubmit() {
    await onSubmit({
      task_type:     opt.task_type,
      department:    opt.department,
      assigned_role: opt.assigned_role,
      due_date:      dueDate || null,
      priority,
      notes,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-600" />
            <div>
              <h2 className="text-base font-black text-gray-900">Enviar para produção</h2>
              <p className="text-xs text-gray-400 mt-0.5">Cria uma tarefa no Kanban Operacional</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Conteúdo</span>
              <span className="font-medium text-gray-700 truncate max-w-[60%] text-right">{contentTitle}</span>
            </div>
            {clientName && (
              <div className="flex justify-between">
                <span className="text-gray-400">Cliente</span>
                <span className="font-medium text-gray-700">{clientName}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Tipo de demanda *</label>
            <div className="grid grid-cols-2 gap-2">
              {PROD_OPTIONS.map((o) => {
                const Icon = o.icon;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSelected(o.id)}
                    className={cn(
                      "flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all",
                      selected === o.id
                        ? "border-slate-700 bg-slate-50"
                        : "border-gray-100 hover:border-gray-200 bg-white",
                    )}
                  >
                    <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", selected === o.id ? "text-slate-700" : "text-gray-400")} />
                    <div>
                      <p className={cn("text-xs font-bold", selected === o.id ? "text-slate-800" : "text-gray-700")}>{o.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{o.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Prazo</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-slate-400 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-slate-400 bg-white text-gray-700"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Observações internas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruções, referências, detalhes..."
              rows={3}
              className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-slate-400 resize-none text-gray-700 placeholder-gray-300"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 text-xs font-bold py-3 border border-gray-200 rounded-2xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={sending}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-3 bg-slate-800 text-white rounded-2xl hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
            {sending ? "Enviando…" : "Enviar para produção"}
          </button>
        </div>
      </div>
    </div>
  );
}
