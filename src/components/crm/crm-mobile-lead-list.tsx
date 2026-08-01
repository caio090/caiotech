"use client";

import { Bot, ChevronRight, MessageSquare } from "lucide-react";
import Link from "next/link";

/**
 * Sprint REC OS 3.0.1 (Fase 34) — substitui a tabela desktop por cards no
 * mobile. Consome exatamente os mesmos dados já filtrados pela página
 * (`filtered`, a mesma fonte da tabela) — nunca uma segunda consulta ou um
 * segundo cálculo de filtro. Não calcula temperatura nova: só mostra o
 * campo quando já existir dado real (aqui, nenhum ainda — por isso o campo
 * fica de fora até existir uma fonte real de temperatura).
 */
export interface CrmMobileLeadCardData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  sourceLabel: string;
  sourceClassName: string;
  statusLabel: string;
  statusClassName: string;
  createdAtLabel: string;
  intentLabel: string;
  whatsappUrl: string | null;
}

interface CrmMobileLeadListProps {
  leads: CrmMobileLeadCardData[];
  onOpenAgent: (id: string) => void;
}

export function CrmMobileLeadList({ leads, onOpenAgent }: CrmMobileLeadListProps) {
  return (
    <div className="space-y-2.5 md:hidden" data-testid="crm-mobile-lead-list">
      {leads.map((lead) => (
        <div key={lead.id} className="min-w-0 rounded-2xl border border-gray-100 bg-white p-3.5" data-testid="crm-mobile-lead-card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900">{lead.name}</p>
              <p className="truncate text-[11px] text-gray-500">{lead.email}</p>
              {lead.phone && <p className="truncate text-[11px] text-gray-400">{lead.phone}</p>}
            </div>
            <span className={`flex-shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold ${lead.sourceClassName}`}>
              {lead.sourceLabel}
            </span>
          </div>

          {lead.intentLabel && lead.intentLabel !== "—" && (
            <p className="mt-2 line-clamp-2 text-[11px] text-gray-500">{lead.intentLabel}</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold ${lead.statusClassName}`}>
              {lead.statusLabel}
            </span>
            <span className="text-[10px] text-gray-400">{lead.createdAtLabel}</span>
          </div>

          <div className="mt-3 flex items-center gap-1 border-t border-gray-50 pt-2.5">
            <button
              type="button"
              onClick={() => onOpenAgent(lead.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold text-violet-600 hover:bg-violet-50"
            >
              <Bot className="h-3.5 w-3.5" /> Agente IA
            </button>
            {lead.whatsappUrl && (
              <a
                href={lead.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50"
              >
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            <Link
              href="/admin/super/waitlist"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              Ver <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
