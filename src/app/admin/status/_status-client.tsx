"use client";

import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import {
  CheckCircle2, AlertCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, X, Zap, Shield,
  Database, GitCommit, Calendar, TrendingUp, Server
} from "lucide-react";
import {
  PROJECT_AREAS, SQL_BLOCKERS, V1_HISTORY, EFFORT_ESTIMATE,
  calcV1Readiness,
  type ProjectAreaStatus, type AreaReadiness,
} from "@/config/project-status";
import { V1_PROGRESS, V2_PROGRESS, getDaysRemainingV1 } from "@/lib/project-status";
import type { DeploymentInfo } from "@/lib/deployment-info";

// ── Constantes de UI ─────────────────────────────────────────
const READINESS_COLORS: Record<AreaReadiness, string> = {
  validated:    "bg-emerald-500",
  deployed:     "bg-blue-400",
  implemented:  "bg-sky-300",
  qa_pending:   "bg-yellow-400",
  in_progress:  "bg-orange-300",
  blocked:      "bg-red-500",
  planned:      "bg-slate-300",
  out_of_scope: "bg-slate-200",
};

const READINESS_LABEL: Record<AreaReadiness, string> = {
  validated:    "Validado",
  deployed:     "Em produção",
  implemented:  "Implementado",
  qa_pending:   "QA pendente",
  in_progress:  "Em progresso",
  blocked:      "Bloqueado",
  planned:      "Planejado",
  out_of_scope: "Fora do escopo",
};

const READINESS_BG: Record<AreaReadiness, string> = {
  validated:    "bg-emerald-50 border-emerald-200 text-emerald-700",
  deployed:     "bg-blue-50 border-blue-200 text-blue-700",
  implemented:  "bg-sky-50 border-sky-200 text-sky-700",
  qa_pending:   "bg-yellow-50 border-yellow-200 text-yellow-700",
  in_progress:  "bg-orange-50 border-orange-200 text-orange-700",
  blocked:      "bg-red-50 border-red-200 text-red-700",
  planned:      "bg-slate-50 border-slate-200 text-slate-500",
  out_of_scope: "bg-slate-50 border-slate-100 text-slate-400",
};

type FilterKey =
  | "todos" | "validados" | "qa_pendente" | "bloqueados"
  | "v1" | "v2" | "p0_p1" | "p2_p3"
  | "banco" | "integracoes" | "operacional" | "aquisicao"
  | "financeiro" | "admin" | "conteudo";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "todos",       label: "Todos" },
  { key: "validados",   label: "✅ Validados" },
  { key: "qa_pendente", label: "⚠️ QA pendente" },
  { key: "bloqueados",  label: "🔴 Bloqueados" },
  { key: "v1",          label: "V1" },
  { key: "v2",          label: "V2" },
  { key: "p0_p1",       label: "Risco alto" },
  { key: "p2_p3",       label: "Risco médio" },
  { key: "banco",       label: "Banco" },
  { key: "integracoes", label: "Integrações" },
  { key: "operacional", label: "Operacional" },
  { key: "aquisicao",   label: "Aquisição" },
  { key: "financeiro",  label: "Financeiro" },
  { key: "admin",       label: "Admin" },
  { key: "conteudo",    label: "Conteúdo" },
];

function filterAreas(areas: ProjectAreaStatus[], key: FilterKey): ProjectAreaStatus[] {
  switch (key) {
    case "todos":       return areas;
    case "validados":   return areas.filter(a => a.readiness === "validated");
    case "qa_pendente": return areas.filter(a => a.readiness === "qa_pending");
    case "bloqueados":  return areas.filter(a => a.readiness === "blocked");
    case "v1":          return areas.filter(a => a.phase === "v1");
    case "v2":          return areas.filter(a => a.phase === "v2");
    case "p0_p1":       return areas.filter(a => a.risk === "critical" || a.risk === "high");
    case "p2_p3":       return areas.filter(a => a.risk === "medium" || a.risk === "low");
    case "banco":       return areas.filter(a => a.category === "banco");
    case "integracoes": return areas.filter(a => a.category === "integracao");
    case "operacional": return areas.filter(a => a.category === "operacional");
    case "aquisicao":   return areas.filter(a => a.category === "publico");
    case "financeiro":  return areas.filter(a => a.category === "billing");
    case "admin":       return areas.filter(a => a.category === "admin" || a.category === "infraestrutura");
    case "conteudo":    return areas.filter(a => a.category === "conteudo");
    default:            return areas;
  }
}

// ── Modal de detalhe da área ────────────────────────────────
function AreaModal({ area, onClose }: { area: ProjectAreaStatus; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium mb-1">{area.category}</p>
            <h2 className="text-lg font-semibold text-slate-800">{area.name}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{area.description}</p>

          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${READINESS_BG[area.readiness]}`}>
              {READINESS_LABEL[area.readiness]}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full border bg-slate-50 border-slate-200 text-slate-500 font-medium uppercase">
              {area.phase}
            </span>
            {area.risk && area.risk !== "none" && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                area.risk === "high" || area.risk === "critical"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-orange-50 border-orange-200 text-orange-700"
              }`}>
                Risco {area.risk}
              </span>
            )}
          </div>

          {area.qa && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">QA</p>
              {area.qa.date && (
                <p className="text-xs text-slate-500 mb-2">
                  {area.qa.auditor} · {area.qa.date}
                </p>
              )}
              {area.qa.result?.map((r, i) => (
                <div key={i} className="flex gap-2 text-sm text-slate-700 mb-1">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  <span>{r}</span>
                </div>
              ))}
              {area.qa.p2 && area.qa.p2.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-xs font-medium text-yellow-600 mb-1">Ressalvas P2 (não bloqueiam V1)</p>
                  {area.qa.p2.map((p, i) => (
                    <div key={i} className="flex gap-2 text-sm text-yellow-700 mb-0.5">
                      <span>⚠</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {area.blockers && area.blockers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Bloqueadores</p>
              {area.blockers.map((b, i) => (
                <div key={i} className="flex gap-2 text-sm text-red-700 mb-1">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-400" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}

          {area.next_actions && area.next_actions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Próximos passos</p>
              {area.next_actions.map((a, i) => (
                <div key={i} className="flex gap-2 text-sm text-slate-700 mb-1">
                  <span className="text-blue-400">→</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}

          {(area.commit || area.deployment || area.sql_dependency) && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Técnico</p>
              {area.commit && (
                <div className="flex gap-2 items-center text-xs text-slate-500 mb-1">
                  <GitCommit size={12} />
                  <span>Commit: <code className="font-mono">{area.commit}</code></span>
                </div>
              )}
              {area.deployment && (
                <div className="flex gap-2 items-center text-xs text-slate-500 mb-1">
                  <Zap size={12} />
                  <span className="truncate">Deploy: <code className="font-mono text-xs">{area.deployment.slice(0, 24)}…</code></span>
                </div>
              )}
              {area.sql_dependency && (
                <div className="flex gap-2 items-center text-xs text-slate-500 mb-1">
                  <Database size={12} />
                  <span>SQL: {area.sql_dependency}</span>
                </div>
              )}
            </div>
          )}

          {area.estimate && (
            <div className="flex gap-3 text-xs text-slate-500">
              <span className="font-medium text-slate-700">Esforço estimado:</span>
              <span>{area.estimate.hoursMin}h – {area.estimate.hoursMax}h</span>
            </div>
          )}

          {area.notes && (
            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-3">{area.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Seção de bloqueadores SQL ────────────────────────────────
function SQLBlockersSection() {
  const [expanded, setExpanded] = useState<number | null>(null);

  const statusColor = {
    executed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
    failed:   "bg-red-100 text-red-700 border-red-200",
    created:  "bg-blue-100 text-blue-700 border-blue-200",
    partial_unknown: "bg-orange-100 text-orange-700 border-orange-200",
    not_executed: "bg-slate-100 text-slate-700 border-slate-200",
  } as const;

  const statusLabel = {
    executed: "Executado",
    pending:  "Pendente",
    failed:   "Falhou",
    created:  "Criado",
    partial_unknown: "Parcial/desconhecido",
    not_executed: "Não executado",
  } as const;

  return (
    <div className="rounded-xl border border-red-100 bg-red-50/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Database size={16} className="text-red-500" />
        <h2 className="text-sm font-semibold text-slate-700">Bloqueadores de banco (SQL)</h2>
        <span className="ml-auto text-xs text-red-500 font-medium bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
          {SQL_BLOCKERS.filter(s => s.status !== "executed").length} pendentes
        </span>
      </div>
      <div className="space-y-2">
        {SQL_BLOCKERS.map((sql) => (
          <div key={sql.number} className="rounded-lg border border-red-100 bg-white overflow-hidden">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              onClick={() => setExpanded(expanded === sql.number ? null : sql.number)}
            >
              <span className="text-xs font-mono text-slate-400 w-6 shrink-0">#{sql.number}</span>
              <span className="text-sm font-medium text-slate-700 flex-1">{sql.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[sql.status]}`}>
                {statusLabel[sql.status]}
              </span>
              {expanded === sql.number ? (
                <ChevronUp size={14} className="text-slate-400 shrink-0" />
              ) : (
                <ChevronDown size={14} className="text-slate-400 shrink-0" />
              )}
            </button>
            {expanded === sql.number && (
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">
                <div className="text-xs text-slate-500 font-mono bg-slate-50 rounded p-2 break-all">
                  {sql.file}
                </div>
                {sql.errorMessage && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">
                    <span className="font-medium">Erro {sql.errorCode}:</span> {sql.errorMessage}
                  </div>
                )}
                {sql.rootCause && (
                  <p className="text-xs text-slate-500">{sql.rootCause}</p>
                )}
                {sql.affectedAreas.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-xs text-slate-400">Afeta:</span>
                    {sql.affectedAreas.map(a => (
                      <span key={a} className="text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{a}</span>
                    ))}
                  </div>
                )}
                {sql.fixFile && (
                  <div className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded p-2">
                    Correção: <span className="font-mono">{sql.fixFile}</span>
                    {sql.fixStatus === "created" && (
                      <span className="ml-2 text-blue-500">(criado, aguardando execução)</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-red-400">
        Não executar SQL sem revisão do time. Nenhum botão de execução automática disponível.
      </p>
    </div>
  );
}

// ── Card de área (grade filtrada) ─────────────────────────────
function AreaCard({ area, onClick, technical }: { area: ProjectAreaStatus; onClick: () => void; technical: boolean }) {
  return (
    <button
      className="w-full text-left rounded-xl border border-slate-100 bg-white p-4 hover:border-slate-200 hover:shadow-sm transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-slate-800 leading-tight">{area.name}</p>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${READINESS_BG[area.readiness]}`}>
          {technical ? area.readiness : READINESS_LABEL[area.readiness]}
        </span>
      </div>
      {technical ? (
        <p className="text-[11px] font-mono text-slate-400 mb-1">
          id: {area.id} · phase: {area.phase} · last_updated: {area.last_updated}
        </p>
      ) : (
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3">{area.description}</p>
      )}
      {technical && area.next_actions && area.next_actions.length > 0 && (
        <p className="text-[11px] font-mono text-slate-500 mb-3 line-clamp-2">next_action: {area.next_actions[0]}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 uppercase tracking-wide">{area.category}</span>
        <div className="flex items-center gap-1.5">
          {area.qa?.date && (
            <span className="text-xs text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 size={10} />
              QA {area.qa.date.slice(5)}
            </span>
          )}
          {area.risk && (area.risk === "high" || area.risk === "critical") && (
            <AlertTriangle size={12} className="text-red-400" />
          )}
          {area.risk === "medium" && (
            <AlertCircle size={12} className="text-yellow-400" />
          )}
        </div>
      </div>
    </button>
  );
}

// ── Integridade da Produção (Fase 16 do hotfix canônico 1.0.1) ─────────────
const PRODUCTION_INTEGRITY_ITEMS = [
  "Rotas canônicas",
  "Hydration",
  "Menu administrativo",
  "Meu Negócio",
  "REC OS",
  "EditorOS",
  "Deployment oficial",
];

function ProductionIntegritySection({ onSelectArea }: { onSelectArea: (area: ProjectAreaStatus) => void }) {
  const routeArea = PROJECT_AREAS.find((a) => a.id === "production_route_integrity");
  const hydrationArea = PROJECT_AREAS.find((a) => a.id === "production_hydration_stability");

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-1">Integridade da Produção</h2>
      <p className="text-xs text-slate-400 mb-4">
        QA autenticado em Production encontrou React #418, redirect excessivo de subrotas e EditorOS sem landing —
        corrigidos nesta sprint, QA local ainda pendente antes de qualquer novo deployment.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {PRODUCTION_INTEGRITY_ITEMS.map((item) => (
          <span key={item} className="text-xs px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
            {item}
          </span>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {[routeArea, hydrationArea].filter((a): a is ProjectAreaStatus => !!a).map((area) => (
          <button
            key={area.id}
            onClick={() => onSelectArea(area)}
            className="text-left rounded-lg border border-slate-100 p-3 hover:border-slate-200 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-slate-700">{area.name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${READINESS_BG[area.readiness]}`}>
                {READINESS_LABEL[area.readiness]}
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">{area.id}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Mapa de fogo ──────────────────────────────────────────────
function FireMap() {
  const v1 = PROJECT_AREAS.filter(a => a.phase === "v1");

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Mapa de status — V1</h2>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {v1.map((area) => (
          <div
            key={area.id}
            title={`${area.name} — ${READINESS_LABEL[area.readiness]}`}
            className={`w-4 h-4 rounded-sm ${READINESS_COLORS[area.readiness]}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {(["validated", "deployed", "implemented", "qa_pending", "blocked", "planned"] as AreaReadiness[]).map(r => {
          const count = v1.filter(a => a.readiness === r).length;
          if (count === 0) return null;
          return (
            <div key={r} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${READINESS_COLORS[r]}`} />
              <span className="text-xs text-slate-500">{READINESS_LABEL[r]} ({count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Seção de esforço e ritmo ──────────────────────────────────
function EffortSection() {
  const [days, setDays] = useState(0);
  useEffect(() => { setDays(getDaysRemainingV1()); }, []);
  const scenarios = [
    { label: "2h/dia", hPerDay: 2 },
    { label: "3-4h/dia", hPerDay: 3.5 },
    { label: "5h/dia", hPerDay: 5 },
  ];

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={16} className="text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Cotação de esforço</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
          <p className="text-2xl font-semibold text-slate-800">{EFFORT_ESTIMATE.hoursMin}h</p>
          <p className="text-xs text-slate-400 mt-0.5">mínimo</p>
        </div>
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-center">
          <p className="text-2xl font-semibold text-indigo-700">{EFFORT_ESTIMATE.hoursLikely}h</p>
          <p className="text-xs text-indigo-400 mt-0.5">provável</p>
        </div>
        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
          <p className="text-2xl font-semibold text-slate-800">{EFFORT_ESTIMATE.hoursMax}h</p>
          <p className="text-xs text-slate-400 mt-0.5">máximo</p>
        </div>
      </div>

      <div className="space-y-1 mb-5">
        {EFFORT_ESTIMATE.scopeRemaining.map((s, i) => (
          <div key={i} className="flex gap-2 text-xs text-slate-500">
            <span className="text-slate-300 shrink-0">·</span>
            <span>{s}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-medium text-slate-600 mb-3">Cenários de ritmo — {days} dias até 31/07</p>
        <div className="space-y-2">
          {scenarios.map(({ label, hPerDay }) => {
            const totalHours = days * hPerDay;
            const canFinish = totalHours >= EFFORT_ESTIMATE.hoursMin;
            const comfortable = totalHours >= EFFORT_ESTIMATE.hoursLikely;
            return (
              <div key={label} className="flex items-center gap-3 text-xs">
                <span className="text-slate-500 w-16 shrink-0">{label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${comfortable ? "bg-emerald-400" : canFinish ? "bg-yellow-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(100, (totalHours / EFFORT_ESTIMATE.hoursMax) * 100)}%` }}
                  />
                </div>
                <span className={`w-24 text-right shrink-0 font-medium ${comfortable ? "text-emerald-600" : canFinish ? "text-yellow-600" : "text-red-500"}`}>
                  {totalHours.toFixed(0)}h disponíveis{comfortable ? " ✓" : canFinish ? " ⚡" : " ✗"}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          QA: +{EFFORT_ESTIMATE.qaHoursMin}–{EFFORT_ESTIMATE.qaHoursMax}h não incluídas acima
        </p>
      </div>
    </div>
  );
}

// ── Linha do tempo ────────────────────────────────────────────
function HistorySection() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">Histórico de eventos</h2>
      <div className="space-y-3">
        {V1_HISTORY.map((entry, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 shrink-0" />
              {i < V1_HISTORY.length - 1 && (
                <div className="w-px flex-1 bg-slate-100 mt-1" />
              )}
            </div>
            <div className="pb-3">
              <p className="text-xs text-slate-400 mb-0.5">{entry.date}</p>
              <p className="text-sm text-slate-700 leading-relaxed">{entry.event}</p>
              {entry.commit && (
                <p className="text-xs font-mono text-slate-400 mt-0.5">{entry.commit}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Faixa de ambiente/commit/deployment ────────────────────────
const ENVIRONMENT_BADGE_STYLE: Record<DeploymentInfo["environment"], string> = {
  Production: "bg-emerald-50 border-emerald-200 text-emerald-700",
  Preview:    "bg-amber-50 border-amber-200 text-amber-700",
  Local:      "bg-slate-100 border-slate-200 text-slate-600",
};

function DeploymentBanner({ deploymentInfo, lastUpdated }: { deploymentInfo: DeploymentInfo; lastUpdated: string | null }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <div className="flex items-center gap-1.5">
        <Server size={13} className="text-slate-400" />
        <span className="text-slate-400">Ambiente:</span>
        <span className={`px-2 py-0.5 rounded-full border font-medium ${ENVIRONMENT_BADGE_STYLE[deploymentInfo.environment]}`}>
          {deploymentInfo.environment}
        </span>
      </div>
      {deploymentInfo.branch && (
        <div className="flex items-center gap-1.5 text-slate-500">
          <span className="text-slate-400">Branch:</span>
          <code className="font-mono">{deploymentInfo.branch}</code>
        </div>
      )}
      {deploymentInfo.commitShort && (
        <div className="flex items-center gap-1.5 text-slate-500">
          <GitCommit size={12} className="text-slate-400" />
          <code className="font-mono">{deploymentInfo.commitShort}</code>
        </div>
      )}
      {deploymentInfo.deploymentId ? (
        <div className="flex items-center gap-1.5 text-slate-500 truncate">
          <Zap size={12} className="text-slate-400" />
          <span className="text-slate-400">Deployment:</span>
          <code className="font-mono truncate max-w-[220px]">{deploymentInfo.deploymentId}</code>
        </div>
      ) : deploymentInfo.deploymentHost ? (
        <div className="flex items-center gap-1.5 text-slate-500 truncate">
          <Zap size={12} className="text-slate-400" />
          <span className="text-slate-400">Host do deployment:</span>
          <span className="truncate max-w-[220px]">{deploymentInfo.deploymentHost}</span>
        </div>
      ) : null}
      <div className="flex items-center gap-1.5 text-slate-400 ml-auto">
        <span>Última atualização:</span>
        <span className="text-slate-600 font-medium">{lastUpdated ?? "—"}</span>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function StatusPage({ deploymentInfo }: { deploymentInfo: DeploymentInfo }) {
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [selectedArea, setSelectedArea] = useState<ProjectAreaStatus | null>(null);
  const [viewMode, setViewMode] = useState<"resumo" | "tecnico">("resumo");

  const readiness = useMemo(() => calcV1Readiness(), []);
  const [days, setDays] = useState(0);
  useEffect(() => { setDays(getDaysRemainingV1()); }, []);

  const lastUpdated = useMemo(() => {
    const dates = PROJECT_AREAS.map(a => a.last_updated).filter(Boolean);
    if (dates.length === 0) return null;
    return dates.reduce((max, d) => (d > max ? d : max), dates[0]);
  }, []);

  const filteredAreas = useMemo(
    () => filterAreas(PROJECT_AREAS, filter),
    [filter]
  );

  const v1Areas = PROJECT_AREAS.filter(a => a.phase === "v1");
  const validatedCount = v1Areas.filter(a => a.readiness === "validated").length;
  const blockedCount   = v1Areas.filter(a => a.readiness === "blocked").length;
  const qaPendingCount = v1Areas.filter(a => a.readiness === "qa_pending").length;

  const urgencyColor = days <= 7 ? "text-red-600" : days <= 14 ? "text-orange-500" : "text-slate-800";

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Central de controle V1"
        description="Acompanhe o que está validado, bloqueado e quanto esforço ainda falta."
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Ambiente / commit / deployment ────────────────── */}
        <DeploymentBanner deploymentInfo={deploymentInfo} lastUpdated={lastUpdated} />

        {/* ── Métricas de lançamento ───────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield size={14} className="text-indigo-400" />
              <p className="text-xs text-slate-400 font-medium">V1 — Progresso</p>
            </div>
            <p className="text-3xl font-bold text-indigo-600">{V1_PROGRESS}%</p>
            <p className="text-xs text-slate-400 mt-0.5">Implementado</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <p className="text-xs text-slate-400 font-medium">Prontidão real</p>
            </div>
            <p className="text-3xl font-bold text-emerald-600">{readiness.score}%</p>
            <p className="text-xs text-slate-400 mt-0.5">{readiness.label}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar size={14} className="text-slate-400" />
              <p className="text-xs text-slate-400 font-medium">Prazo V1</p>
            </div>
            <p className={`text-3xl font-bold ${urgencyColor}`}>{days}</p>
            <p className="text-xs text-slate-400 mt-0.5">dias até 31/07</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap size={14} className="text-slate-400" />
              <p className="text-xs text-slate-400 font-medium">V2 — Progresso</p>
            </div>
            <p className="text-3xl font-bold text-slate-700">{V2_PROGRESS}%</p>
            <p className="text-xs text-slate-400 mt-0.5">Fundações</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 -mt-3">
          Percentuais da última recalibração oficial. Áreas novas em QA não alteram automaticamente o percentual — recalibração formal ocorre após validação em Production.
        </p>

        {/* Fase 17 — não há um snapshot persistido de "quando foi a última
            recalibração" para calcular um delta exato; os números abaixo são
            uma contagem honesta do estado atual, não uma comparação temporal
            inventada. */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 mb-2">Mudanças desde a última recalibração — nenhuma alterou o percentual acima</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <span className="text-xs text-slate-500"><b className="text-slate-800">{PROJECT_AREAS.length}</b> áreas registradas</span>
            <span className="text-xs text-slate-500"><b className="text-slate-800">{PROJECT_AREAS.filter(a => a.readiness === "qa_pending").length}</b> em QA</span>
            <span className="text-xs text-slate-500"><b className="text-slate-800">{PROJECT_AREAS.filter(a => a.readiness === "blocked").length}</b> bloqueadas</span>
            <span className="text-xs text-slate-500"><b className="text-slate-800">{PROJECT_AREAS.filter(a => a.readiness === "planned").length}</b> planejadas</span>
          </div>
        </div>

        {/* ── Barra de saúde ────────────────────────────── */}
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500">Prontidão V1 — por área</p>
            <p className="text-xs text-slate-400">{validatedCount} validadas · {qaPendingCount} em QA · {blockedCount} bloqueadas de {v1Areas.length} áreas</p>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
            {v1Areas.map(a => (
              <div
                key={a.id}
                title={`${a.name}: ${READINESS_LABEL[a.readiness]}`}
                className={`${READINESS_COLORS[a.readiness]} flex-1`}
              />
            ))}
          </div>
          <div className="flex gap-4 mt-2">
            {([["validated", "Validadas"], ["qa_pending", "Em QA"], ["blocked", "Bloqueadas"]] as [AreaReadiness, string][]).map(([r, lbl]) => {
              const count = v1Areas.filter(a => a.readiness === r).length;
              return (
                <div key={r} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-sm ${READINESS_COLORS[r]}`} />
                  <span className="text-xs text-slate-400">{lbl}: {count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Integridade da Produção ───────────────────── */}
        <ProductionIntegritySection onSelectArea={setSelectedArea} />

        {/* ── Mapa de fogo ──────────────────────────────── */}
        <FireMap />

        {/* ── Bloqueadores SQL ──────────────────────────── */}
        <SQLBlockersSection />

        {/* ── Áreas críticas em destaque ────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Meta — QA pendente */}
          {PROJECT_AREAS.filter(a => a.id === "meta").map(area => (
            <div key={area.id} className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-yellow-500" />
                <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">QA pendente</p>
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">{area.name}</p>
              <p className="text-xs text-slate-500 mb-3">{area.description}</p>
              {area.qa?.p2?.map((p, i) => (
                <div key={i} className="flex gap-1.5 text-xs text-yellow-700 mb-0.5">
                  <span>⚠</span><span>{p}</span>
                </div>
              ))}
              <button
                className="mt-3 text-xs text-yellow-700 underline"
                onClick={() => setSelectedArea(area)}
              >
                Ver detalhes completos →
              </button>
            </div>
          ))}

          {/* Asaas — bloqueado */}
          {PROJECT_AREAS.filter(a => a.id === "asaas").map(area => (
            <div key={area.id} className="rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-red-500" />
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Bloqueado</p>
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">{area.name}</p>
              <p className="text-xs text-slate-500 mb-3">{area.notes}</p>
              {area.blockers?.map((b, i) => (
                <div key={i} className="flex gap-1.5 text-xs text-red-700 mb-0.5">
                  <AlertCircle size={10} className="mt-0.5 shrink-0" /><span>{b}</span>
                </div>
              ))}
              <button
                className="mt-3 text-xs text-red-700 underline"
                onClick={() => setSelectedArea(area)}
              >
                Ver detalhes completos →
              </button>
            </div>
          ))}
        </div>

        {/* ── Filtros ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="overflow-x-auto pb-2 flex-1">
              <div className="flex gap-2 min-w-max">
                {FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium whitespace-nowrap transition-colors ${
                      filter === f.key
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Fase 15 — alternância Resumo / Detalhes técnicos: no modo
                técnico, cada card mostra id/readiness/phase/last_updated
                exatos em vez de só o texto humano. */}
            <div className="shrink-0 flex items-center gap-1 bg-slate-100 rounded-full p-0.5">
              {(["resumo", "tecnico"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                    viewMode === mode ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {mode === "resumo" ? "Resumo" : "Detalhes técnicos"}
                </button>
              ))}
            </div>
          </div>

          {/* Grade de áreas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            {filteredAreas.map(area => (
              <AreaCard
                key={area.id}
                area={area}
                onClick={() => setSelectedArea(area)}
                technical={viewMode === "tecnico"}
              />
            ))}
          </div>
          {filteredAreas.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-8">Nenhuma área neste filtro.</p>
          )}
        </div>

        {/* ── Ressalvas P2 ──────────────────────────────── */}
        <div className="rounded-xl border border-yellow-100 bg-yellow-50/50 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Ressalvas P2 — não bloqueiam V1</h2>
          <div className="space-y-2">
            {[
              "prefers-reduced-motion: não validado com mídia ativa em nenhum dispositivo real",
              "Hover e focus-visible: aprovados visualmente, teste de teclado completo pendente",
              "Meta multiconexão: QA do wizard completo com conta nova ainda pendente",
              "SEO: robots.ts e sitemap.ts gerados, score formal não mensurado neste ciclo",
            ].map((note, i) => (
              <div key={i} className="flex gap-2 text-sm text-yellow-800">
                <span className="text-yellow-400 shrink-0">⚠</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cotação de esforço ────────────────────────── */}
        <EffortSection />

        {/* ── Histórico ─────────────────────────────────── */}
        <HistorySection />

        <footer className="text-center text-xs text-slate-300 pb-4">
          Última atualização: {lastUpdated ?? "—"} · Área reservada à equipe técnica
        </footer>
      </div>

      {/* ── Modal de área ─────────────────────────────────── */}
      {selectedArea && (
        <AreaModal
          area={selectedArea}
          onClose={() => setSelectedArea(null)}
        />
      )}
    </div>
  );
}
