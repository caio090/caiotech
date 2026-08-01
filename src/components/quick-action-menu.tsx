"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Zap, Plus, LayoutGrid, Users, CheckSquare, CalendarDays, ClipboardList,
  Activity, Map, Sparkles, UserRoundPlus, Lightbulb,
} from "lucide-react";
import type { WorkspaceSurface } from "@/lib/workspaces/types";

interface QuickAction {
  label: string;
  href: string | null; // null = ainda não implementado (Fase 23: nunca executa ação inexistente)
  icon: React.ElementType;
}

type QuickActionSurface = WorkspaceSurface | "default";

/**
 * Sprint REC OS 3.0.1.1 (Fase 23) — "Ação rápida" no dashboard era um
 * `<button>` sem `onClick`, sem menu, sem destino: um botão falso. Cada
 * item aqui só tem `href` quando a rota já existe de verdade; os que ainda
 * não têm implementação real (registrar oportunidade de produto, adicionar
 * tarefa, registrar lead manualmente) ficam desabilitados com "Em breve" —
 * nunca disparam uma ação que não existe.
 */
const QUICK_ACTIONS: Record<QuickActionSurface, QuickAction[]> = {
  super_admin: [
    { label: "Ver Status V1", href: "/admin/status", icon: Activity },
    { label: "Abrir Ecossistema", href: "/admin/ecossistema", icon: Map },
    { label: "Registrar oportunidade de produto", href: null, icon: Lightbulb },
  ],
  agency: [
    { label: "Criar conteúdo", href: "/admin/contentos/criar", icon: Plus },
    { label: "Abrir Roadmap", href: "/admin/contentos/roadmap", icon: LayoutGrid },
    { label: "Selecionar cliente", href: "/admin/contentos/selecionar-cliente", icon: Users },
    { label: "Adicionar tarefa", href: null, icon: ClipboardList },
  ],
  agency_client: [
    { label: "Solicitar conteúdo", href: "/admin/contentos/criar", icon: Plus },
    { label: "Abrir aprovações", href: "/admin/contentos/aprovacoes", icon: CheckSquare },
    { label: "Abrir calendário", href: "/admin/calendario", icon: CalendarDays },
  ],
  direct_business: [
    { label: "Registrar lead", href: null, icon: UserRoundPlus },
    { label: "Criar conteúdo", href: "/admin/contentos/criar", icon: Plus },
    { label: "Criar evento", href: "/admin/calendario", icon: CalendarDays },
    { label: "Abrir Meu Negócio", href: "/admin/meu-negocio", icon: Sparkles },
  ],
  default: [
    { label: "Criar conteúdo", href: "/admin/contentos/criar", icon: Plus },
    { label: "Abrir REC OS", href: "/admin/contentos", icon: Sparkles },
  ],
};

export function QuickActionMenu({ surface }: { surface?: WorkspaceSurface }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const actions = QUICK_ACTIONS[surface ?? "default"];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="quick-action-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full sm:w-auto justify-center text-sm text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
      >
        <Zap className="w-4 h-4" />
        Ação rápida
      </button>

      {open && (
        <div
          role="menu"
          data-testid="quick-action-menu"
          className="absolute right-0 left-0 sm:left-auto mt-2 z-50 w-full sm:w-64 bg-white border border-gray-100 rounded-2xl shadow-xl p-2"
        >
          {actions.map((a) =>
            a.href ? (
              <Link
                key={a.label}
                href={a.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm text-gray-700"
              >
                <a.icon className="w-4 h-4 text-indigo-500 flex-shrink-0" /> {a.label}
              </Link>
            ) : (
              <div
                key={a.label}
                data-testid="quick-action-planned"
                className="flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-400 cursor-not-allowed"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <a.icon className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{a.label}</span>
                </span>
                <span className="text-[9px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full flex-shrink-0">Em breve</span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
