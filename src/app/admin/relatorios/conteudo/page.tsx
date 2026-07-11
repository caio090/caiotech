"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MetaInsightsPanel } from "@/app/admin/contentos/insights/_meta-insights-panel";
import {
  ArrowLeft, AtSign, Calendar, CheckSquare,
  BarChart3, Clock, Zap, Building2, ChevronDown,
} from "lucide-react";

interface ClientOption { id: string; company_name: string }

const CONTENT_FIELDS = [
  { label: "Conteúdos planejados",  icon: Calendar,    ready: false },
  { label: "Conteúdos publicados",  icon: AtSign,      ready: false },
  { label: "Conteúdos pendentes",   icon: Clock,       ready: false },
  { label: "Aprovações no período", icon: CheckSquare, ready: false },
  { label: "Top posts (alcance)",   icon: BarChart3,   ready: false },
  { label: "Taxa de entrega",       icon: Zap,         ready: false },
];

export default function RelatorioConteudoPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const [clients, setClients] = useState<ClientOption[]>([]);

  // URL é a fonte de verdade — sem auto-seleção de clients[0]
  const clientId = searchParams.get("client") ?? "";
  const range    = searchParams.get("range")  ?? "7d";

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const p = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") { p.delete(key); } else { p.set(key, value); }
      router.replace(`${pathname}?${p.toString()}`);
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/clients");
        if (!r.ok) return;
        const d = await r.json() as { clients?: ClientOption[] };
        setClients(d.clients ?? []);
        // Sem auto-seleção: se o URL já tem client válido, mantém; senão espera o usuário escolher
      } catch { /* silent */ }
    })();
  }, []);

  // Link para REC OS preservando cliente e período
  const recOsHref = `/admin/contentos/insights${clientId ? `?client=${clientId}&range=${range}` : ""}`;

  return (
    <div>
      <PageHeader title="Relatório de Conteúdo" description="Performance editorial e Meta Insights por cliente">
        <Link
          href="/admin/relatorios"
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-3 py-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Dados & Insights
        </Link>
      </PageHeader>

      {/* Seletor de cliente — sem seleção automática */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative inline-block">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <select
            value={clientId}
            onChange={(e) => updateParam("client", e.target.value || null)}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 bg-white rounded-xl outline-none focus:border-indigo-300 appearance-none"
          >
            <option value="">Selecione um cliente…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        {/* Link para ver no REC OS */}
        {clientId && (
          <Link
            href={recOsHref}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-100 bg-indigo-50 rounded-xl px-3 py-2 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Ver no REC OS
          </Link>
        )}
      </div>

      {/* Estado sem cliente */}
      {!clientId && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center mb-5">
          <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-600 mb-1">Nenhum cliente selecionado</p>
          <p className="text-xs text-gray-400">Selecione um cliente acima para ver os Meta Insights.</p>
        </div>
      )}

      {/* Meta Insights — mesmo motor do REC OS, modo relatório */}
      {clientId && <MetaInsightsPanel clientId={clientId} mode="report" />}

      {/* Campos editoriais — aguardando fonte */}
      {clientId && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-800">Campos editoriais</p>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
              Aguardando dados
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {CONTENT_FIELDS.map(({ label, icon: Icon, ready }) => (
              <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${ready ? "bg-emerald-100" : "bg-gray-100"}`}>
                  <Icon className={`w-3.5 h-3.5 ${ready ? "text-emerald-600" : "text-gray-400"}`} strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${ready ? "text-gray-800" : "text-gray-400"}`}>{label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{ready ? "Disponível" : "Aguardando fonte de dados"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {clientId && (
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/contentos/aprovacoes"
            className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Aprovações
          </Link>
          <Link
            href="/admin/contentos/calendario"
            className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-100 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            Calendário editorial
          </Link>
        </div>
      )}
    </div>
  );
}
