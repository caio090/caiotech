"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Database, Plug, GitBranch, Radar, Map as MapIcon, LayoutPanelLeft, Compass } from "lucide-react";
import {
  PLATFORM_MODULES, MODULE_SURFACE_LABELS, findDependencyCycles, findMissingDependencies,
  type ModuleSurface, type PlatformModuleDefinition, type PlatformModuleMaturity,
} from "@/config/platform-modules";
import { DATA_SOURCES } from "@/lib/data-hub/sources";
import { buildModuleDataContracts } from "@/lib/data-hub/registry";
import { MESSAGING_PROVIDERS } from "@/lib/messaging/types";
import { CALENDAR_PROVIDERS } from "@/lib/global-calendar-v2/providers";
import { PRODUCT_RESEARCH_ENTRIES } from "@/lib/product-research/fixtures";
import { DETERMINISTIC_PRODUCT_RESEARCH_ANALYZER } from "@/lib/product-research/analyzer";
import { CANONICAL_FLOW_STEPS } from "@/lib/domain-events/canonical-flow";

type TabId = "overview" | "modules" | "panels" | "data" | "integrations" | "dependencies" | "radar" | "roadmap";

const TABS: Array<{ id: TabId; label: string; icon: React.ElementType }> = [
  { id: "overview", label: "Visão geral", icon: LayoutGrid },
  { id: "modules", label: "Módulos", icon: LayoutPanelLeft },
  { id: "panels", label: "Painéis", icon: Compass },
  { id: "data", label: "Dados", icon: Database },
  { id: "integrations", label: "Integrações", icon: Plug },
  { id: "dependencies", label: "Dependências", icon: GitBranch },
  { id: "radar", label: "Radar de Produto", icon: Radar },
  { id: "roadmap", label: "Roadmap", icon: MapIcon },
];

const MATURITY_LABELS: Record<PlatformModuleMaturity, string> = {
  production: "Em produção", qa_pending: "Aguardando QA", preview: "Prévia/demo", planned: "Planejado", blocked: "Bloqueado", experimental: "Experimental",
};

const MATURITY_TONE: Record<PlatformModuleMaturity, string> = {
  production: "bg-emerald-100 text-emerald-700", qa_pending: "bg-amber-100 text-amber-700", preview: "bg-sky-100 text-sky-700",
  planned: "bg-slate-100 text-slate-600", blocked: "bg-rose-100 text-rose-700", experimental: "bg-violet-100 text-violet-700",
};

const SURFACES: ModuleSurface[] = ["super_admin", "agency", "agency_client", "direct_business", "operational_user"];

const MVP_TRACKS = [
  { id: 0, label: "Trilha 0 — Fundação", items: ["Workspaces", "Permissões", "Preview", "Segurança", "Arquivos", "Auditoria"] },
  { id: 1, label: "Trilha 1 — Operação essencial", items: ["Assistente LOKAT", "Calendário Global", "REC OS operacional", "WhatsApp", "Relatórios"] },
  { id: 2, label: "Trilha 2 — Gestão comercial", items: ["Produtos", "Estoque", "Precificação", "Campanhas comerciais", "Financeiro", "Conciliação"] },
  { id: 3, label: "Trilha 3 — Nichos", items: ["Alimentação", "Materiais de construção", "Agências", "Construção civil"] },
  { id: 4, label: "Trilha 4 — Ecossistema externo", items: ["Fiscal", "Bancos", "Gateways", "PDVs", "Cardápios", "Contabilidade"] },
];

export default function EcosystemMapClient() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [viewLanguage, setViewLanguage] = useState<"product" | "technical">("product");
  const [activeSurface, setActiveSurface] = useState<ModuleSurface>("super_admin");

  const dataContracts = useMemo(() => buildModuleDataContracts(), []);
  const missingDeps = useMemo(() => findMissingDependencies(), []);
  const cycles = useMemo(() => findDependencyCycles(), []);
  const weeklySummary = useMemo(() => DETERMINISTIC_PRODUCT_RESEARCH_ANALYZER.buildWeeklySummary(PRODUCT_RESEARCH_ENTRIES), []);

  const modulesForSurface = useMemo(
    () => PLATFORM_MODULES.filter((module) => module.surfaces.some((entry) => entry.surface === activeSurface && entry.access !== "not_applicable")),
    [activeSurface],
  );

  return (
    <div className="mx-auto max-w-6xl p-3 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Mapa do Ecossistema LOKAT OS</h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500 sm:text-sm">Fundação técnica e visual (Sprint LOKAT Core 2.1) — módulos, painéis, dados, dependências e Radar de Produto em um único lugar. Nenhum dado real, nenhuma integração ativa.</p>
        </div>
        <div className="inline-flex shrink-0 rounded-md border border-slate-300 bg-white p-1" role="group" aria-label="Idioma da visualização">
          <button type="button" onClick={() => setViewLanguage("product")} aria-pressed={viewLanguage === "product"} className={`rounded px-3 py-1.5 text-xs font-semibold ${viewLanguage === "product" ? "bg-slate-900 text-white" : "text-slate-600"}`}>Visão do Produto</button>
          <button type="button" onClick={() => setViewLanguage("technical")} aria-pressed={viewLanguage === "technical"} className={`rounded px-3 py-1.5 text-xs font-semibold ${viewLanguage === "technical" ? "bg-slate-900 text-white" : "text-slate-600"}`}>Visão Técnica</button>
        </div>
      </div>

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Seções do mapa do ecossistema">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold ${activeTab === id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-600"}`}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Módulos mapeados" value={String(PLATFORM_MODULES.length)} />
          <SummaryCard label="Em produção" value={String(PLATFORM_MODULES.filter((m) => m.maturity === "production").length)} />
          <SummaryCard label="Com suporte a nicho" value={String(PLATFORM_MODULES.filter((m) => m.nicheSupport).length)} />
          <div className="sm:col-span-3 rounded-md border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-800">Fluxo canônico entre módulos</p>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {CANONICAL_FLOW_STEPS.map((step, index) => (
                <span key={step.id} className="inline-flex items-center gap-1.5">
                  <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-1 font-medium text-slate-700">{step.label}</span>
                  {index < CANONICAL_FLOW_STEPS.length - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "modules" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {PLATFORM_MODULES.map((module) => (
            <ModuleCard key={module.id} module={module} viewLanguage={viewLanguage} />
          ))}
        </div>
      )}

      {activeTab === "panels" && (
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Superfície">
            {SURFACES.map((surface) => (
              <button key={surface} type="button" onClick={() => setActiveSurface(surface)} aria-pressed={activeSurface === surface} className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${activeSurface === surface ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-600"}`}>
                {MODULE_SURFACE_LABELS[surface]}
              </button>
            ))}
          </div>
          <div className="grid gap-2">
            {modulesForSurface.length === 0 && <p className="text-xs text-slate-500">Nenhum módulo visível nesta superfície.</p>}
            {modulesForSurface.map((module) => {
              const entry = module.surfaces.find((surfaceEntry) => surfaceEntry.surface === activeSurface);
              return (
                <div key={module.id} className="flex flex-col gap-1 rounded-md border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{module.name}</p>
                    <p className="text-[11px] text-slate-500">{entry?.notes ?? "Sem observações adicionais."}</p>
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase text-slate-600">{entry?.access}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "data" && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Fontes de dados registradas</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DATA_SOURCES.map((source) => (
                <div key={source.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-800">{source.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{source.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Contratos de dado por módulo</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {dataContracts.filter((contract) => contract.consumes.length > 0 || contract.produces.length > 0).map((contract) => (
                <div key={contract.moduleId} className="rounded-md border border-slate-200 bg-white p-3 text-[11px]">
                  <p className="font-semibold text-slate-800">{contract.moduleId}</p>
                  <p className="text-slate-500">Consome: {contract.consumes.join(", ") || "—"}</p>
                  <p className="text-slate-500">Produz: {contract.produces.join(", ") || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "integrations" && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Mensageria (WhatsApp)</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {MESSAGING_PROVIDERS.map((provider) => (
                <div key={provider.id} className="rounded-md border border-slate-200 bg-white p-3 text-[11px]">
                  <p className="font-semibold text-slate-800">{provider.label}</p>
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{provider.status}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Calendário — providers</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {CALENDAR_PROVIDERS.map((provider) => (
                <div key={provider.id} className="rounded-md border border-slate-200 bg-white p-3 text-[11px]">
                  <p className="font-semibold text-slate-800">{provider.label}</p>
                  <p className="text-slate-500">{provider.reason}</p>
                  <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{provider.state}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "dependencies" && (
        <div className="space-y-3">
          <div className="rounded-md border border-slate-200 bg-white p-3 text-[11px]">
            <p className="font-semibold text-slate-800">Dependências ausentes: {missingDeps.length}</p>
            <p className="font-semibold text-slate-800">Ciclos detectados: {cycles.length}</p>
          </div>
          {PLATFORM_MODULES.map((module) => module.dependsOn.length > 0 && (
            <div key={module.id} className="rounded-md border border-slate-200 bg-white p-3 text-[11px]">
              <p className="font-semibold text-slate-800">{module.name}</p>
              <p className="text-slate-500">Depende de: {module.dependsOn.join(", ")}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "radar" && (
        <div className="space-y-3">
          <div className="rounded-md border border-violet-200 bg-violet-50 p-3 text-xs text-violet-800">{weeklySummary} (análise: {DETERMINISTIC_PRODUCT_RESEARCH_ANALYZER.availability})</div>
          {PRODUCT_RESEARCH_ENTRIES.map((entry) => (
            <div key={entry.id} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{entry.title}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{entry.status}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{entry.reportedProblem}</p>
              <p className="mt-1 text-[10px] text-slate-400">{entry.businessSegment} · {entry.city}/{entry.state} · severidade {entry.severity}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "roadmap" && (
        <div className="space-y-3">
          {MVP_TRACKS.map((track) => (
            <div key={track.id} className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-800">{track.label}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {track.items.map((item) => <span key={item} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{item}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function ModuleCard({ module, viewLanguage }: { module: PlatformModuleDefinition; viewLanguage: "product" | "technical" }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{module.name}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${MATURITY_TONE[module.maturity]}`}>{MATURITY_LABELS[module.maturity]}</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{module.description}</p>
      {viewLanguage === "technical" ? (
        <div className="mt-2 space-y-0.5 text-[10px] text-slate-500">
          <p>id: {module.id}</p>
          <p>rotas: {module.routes.join(", ")}</p>
          <p>capabilities: {module.capabilities.join(", ") || "—"}</p>
          <p>dependsOn: {module.dependsOn.join(", ") || "—"}</p>
        </div>
      ) : (
        <div className="mt-2 text-[10px] text-slate-500">
          <p>Quem usa: {module.surfaces.filter((entry) => entry.access !== "not_applicable").map((entry) => MODULE_SURFACE_LABELS[entry.surface]).join(", ")}</p>
        </div>
      )}
    </div>
  );
}
