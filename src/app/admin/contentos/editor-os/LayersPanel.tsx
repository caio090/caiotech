"use client";

import { Eye, EyeOff, Lock, Unlock, Copy, Trash2, ChevronUp, ChevronDown, X, Image as ImageIcon, Type, Square } from "lucide-react";
import type { EditorElement } from "./CanvasEditor";
import { layerSourceLabel } from "@/lib/editor-os/layer-scanner/serialization";

interface Props {
  elements: EditorElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onClose: () => void;
}

function LayerIcon({ el }: { el: EditorElement }) {
  if (el.type === "image" && el.src) {
    // eslint-disable-next-line @next/next/no-img-element -- thumbnail of a data: URL already in memory, not a remote asset Next's Image optimizer should touch.
    return <img src={el.src} alt="" className="w-7 h-7 object-cover rounded border border-zinc-700" />;
  }
  const Icon = el.type === "text" ? Type : el.type === "image" ? ImageIcon : Square;
  return (
    <div className="w-7 h-7 rounded border border-zinc-700 bg-zinc-800 flex items-center justify-center shrink-0">
      <Icon className="w-3.5 h-3.5 text-zinc-500" />
    </div>
  );
}

/** Fase 16 — CanvasEditor has no prior layers panel (confirmed by audit); this is a minimal one, not a drag-and-drop rebuild. */
export function LayersPanel({ elements, selectedId, onSelect, onToggleHidden, onToggleLocked, onDuplicate, onDelete, onMoveUp, onMoveDown, onClose }: Props) {
  const sorted = [...elements].sort((a, b) => b.z - a.z);

  return (
    <aside data-testid="editor-layer-panel" className="w-64 shrink-0 border-l border-zinc-800 bg-zinc-900 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Camadas</p>
        <button onClick={onClose} aria-label="Fechar lista de camadas" className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {sorted.length === 0 && <p className="text-[11px] text-zinc-600 text-center py-4">Nenhuma camada ainda.</p>}
        {sorted.map((el) => (
          <div
            key={el.id}
            data-testid={`editor-layer-item-${el.id}`}
            onClick={() => onSelect(el.id)}
            className={`flex items-center gap-2 rounded-lg border p-1.5 cursor-pointer transition-colors ${
              selectedId === el.id ? "border-indigo-500 bg-indigo-950/40" : "border-zinc-800 hover:bg-zinc-800/60"
            }`}
          >
            <LayerIcon el={el} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-zinc-200 truncate">{el.type === "text" ? (el.text || "Texto") : layerSourceLabel(el)}</p>
              <p className="text-[9px] text-zinc-500">{layerSourceLabel(el)}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={(e) => { e.stopPropagation(); onMoveUp(el.id); }} aria-label="Trazer para frente" className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200">
                <ChevronUp className="w-3 h-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onMoveDown(el.id); }} aria-label="Enviar para trás" className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200">
                <ChevronDown className="w-3 h-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onToggleHidden(el.id); }} aria-label={el.hidden ? "Mostrar camada" : "Ocultar camada"} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200">
                {el.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onToggleLocked(el.id); }} aria-label={el.locked ? "Desbloquear camada" : "Bloquear camada"} className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200">
                {el.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDuplicate(el.id); }} aria-label="Duplicar camada" className="p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200">
                <Copy className="w-3 h-3" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(el.id); }} aria-label="Excluir camada" className="p-1 rounded hover:bg-red-950/50 text-zinc-500 hover:text-red-400">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
