"use client";

import { useState } from "react";
import { HelpCircle, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCents, parseCentsInput, formatPercent, parsePercentInput } from "@/lib/motor-lokat/money";
import { findGlossaryEntry } from "@/lib/motor-lokat/glossary";
import type { FinancialDataSource, FinancialConfidence, FinancialMetric } from "@/lib/motor-lokat/types";

// ── Data-quality badges (Fase 7) ─────────────────────────────────────────────

const SOURCE_LABEL: Record<FinancialDataSource, string> = {
  imported: "Importado", manual: "Manual", estimated: "Estimado", missing: "Ausente",
};
const SOURCE_STYLE: Record<FinancialDataSource, string> = {
  imported: "bg-emerald-50 text-emerald-700 border-emerald-100",
  manual: "bg-blue-50 text-blue-700 border-blue-100",
  estimated: "bg-amber-50 text-amber-700 border-amber-100",
  missing: "bg-gray-100 text-gray-500 border-gray-200",
};

export function SourceBadge({ source }: { source: FinancialDataSource }) {
  return (
    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border", SOURCE_STYLE[source])}>
      {SOURCE_LABEL[source]}
    </span>
  );
}

const CONFIDENCE_LABEL: Record<FinancialConfidence, string> = {
  alta: "Confiança alta", media: "Confiança média", baixa: "Confiança baixa", insuficiente: "Dados insuficientes",
};
const CONFIDENCE_STYLE: Record<FinancialConfidence, string> = {
  alta: "text-emerald-600", media: "text-blue-600", baixa: "text-amber-600", insuficiente: "text-red-600",
};

export function ConfidenceLabel({ confidence }: { confidence: FinancialConfidence }) {
  return <span className={cn("text-[10px] font-medium", CONFIDENCE_STYLE[confidence])}>{CONFIDENCE_LABEL[confidence]}</span>;
}

const STATUS_STYLE: Record<NonNullable<FinancialMetric["status"]>, string> = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-100",
  atencao: "bg-amber-50 text-amber-700 border-amber-100",
  critico: "bg-red-50 text-red-700 border-red-100",
  sem_meta: "bg-gray-50 text-gray-500 border-gray-200",
};
const STATUS_LABEL: Record<NonNullable<FinancialMetric["status"]>, string> = {
  ok: "Dentro da meta", atencao: "Atenção", critico: "Crítico", sem_meta: "Referência",
};

export function StatusPill({ status }: { status: FinancialMetric["status"] }) {
  const s = status ?? "sem_meta";
  return <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border", STATUS_STYLE[s])}>{STATUS_LABEL[s]}</span>;
}

// ── Money / percent inputs (cents/fraction internally, editable text on screen) ──

export function MoneyInput({
  label, valueCents, onChange, placeholder, dataTestId,
}: { label: string; valueCents: number; onChange: (cents: number) => void; placeholder?: string; dataTestId?: string }) {
  const [text, setText] = useState(valueCents ? (valueCents / 100).toFixed(2).replace(".", ",") : "");
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
        <input
          type="text"
          inputMode="decimal"
          data-testid={dataTestId}
          value={text}
          placeholder={placeholder ?? "0,00"}
          onChange={(e) => { setText(e.target.value); onChange(parseCentsInput(e.target.value)); }}
          className="w-full text-sm border border-gray-200 rounded-xl pl-8 pr-3 py-2 outline-none focus:border-purple-400"
        />
      </div>
    </label>
  );
}

export function PercentInput({
  label, valueFraction, onChange, dataTestId,
}: { label: string; valueFraction: number; onChange: (fraction: number) => void; dataTestId?: string }) {
  const [text, setText] = useState(valueFraction ? (valueFraction * 100).toFixed(1).replace(".", ",") : "");
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</span>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          data-testid={dataTestId}
          value={text}
          placeholder="0,0"
          onChange={(e) => { setText(e.target.value); onChange(parsePercentInput(e.target.value)); }}
          className="w-full text-sm border border-gray-200 rounded-xl pl-3 pr-7 py-2 outline-none focus:border-purple-400"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
      </div>
    </label>
  );
}

export function NumberInput({
  label, value, onChange, dataTestId,
}: { label: string; value: number; onChange: (n: number) => void; dataTestId?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        data-testid={dataTestId}
        value={value || ""}
        placeholder="0"
        onChange={(e) => onChange(Number.parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400"
      />
    </label>
  );
}

// ── Help icon → opens glossary term (Fase 22) ───────────────────────────────

export function GlossaryHelpIcon({ termId, onOpen }: { termId: string; onOpen: (termId: string) => void }) {
  if (!findGlossaryEntry(termId)) return null;
  return (
    <button
      type="button"
      onClick={() => onOpen(termId)}
      aria-label="Ver no glossário"
      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-gray-300 hover:text-purple-500 transition-colors"
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  );
}

// ── Metric card (Fase 11) ────────────────────────────────────────────────────

export function MetricCard({ metric, onOpenDetail }: { metric: FinancialMetric; onOpenDetail: (metric: FinancialMetric) => void }) {
  const displayValue =
    metric.unit === "cents" ? formatCents(metric.value) :
    metric.unit === "percent" ? formatPercent(metric.value) :
    metric.unit === "months" ? `${metric.value.toFixed(1)} meses` :
    metric.value.toFixed(0);

  return (
    <button
      type="button"
      onClick={() => onOpenDetail(metric)}
      className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-purple-200 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{metric.label}</p>
        <SourceBadge source={metric.source} />
      </div>
      <p className="text-lg font-black text-gray-900">{displayValue}</p>
      <div className="flex items-center justify-between mt-2">
        <ConfidenceLabel confidence={metric.confidence} />
        <StatusPill status={metric.status} />
      </div>
    </button>
  );
}

// ── Metric detail drawer (Fase 12) ──────────────────────────────────────────

export function MetricDetailModal({ metric, onClose }: { metric: FinancialMetric; onClose: () => void }) {
  const displayValue =
    metric.unit === "cents" ? formatCents(metric.value) :
    metric.unit === "percent" ? formatPercent(metric.value) :
    metric.unit === "months" ? `${metric.value.toFixed(1)} meses` :
    metric.value.toFixed(0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
          <div>
            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">{metric.explanationTechnical}</p>
            <p className="text-base font-black text-gray-900 mt-0.5">{metric.label}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{displayValue}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <SourceBadge source={metric.source} />
            <ConfidenceLabel confidence={metric.confidence} />
            <StatusPill status={metric.status} />
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Em palavras simples</p>
            <p className="text-sm text-gray-700 leading-relaxed">{metric.explanationSimple}</p>
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fórmula</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 font-mono">{metric.formula}</p>
          </div>

          {metric.goal !== undefined && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Meta configurada</p>
              <p className="text-sm text-gray-700">{formatPercent(metric.goal)}</p>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Interpretação</p>
            <p className="text-sm text-gray-700 leading-relaxed">{metric.statusReason}</p>
          </div>

          {metric.missingInputs.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">Dados faltantes</p>
                <p className="text-xs text-amber-700 mt-0.5">{metric.missingInputs.join(", ")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Simple CSS bar chart (Fase 28 — no chart library installed) ─────────────

export function SimpleBarChart({ bars }: { bars: Array<{ label: string; value: number; colorClass: string; displayValue: string }> }) {
  const max = Math.max(1, ...bars.map((b) => Math.abs(b.value)));
  return (
    <div className="space-y-2.5">
      {bars.map((b) => (
        <div key={b.label}>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-gray-500">{b.label}</span>
            <span className="font-bold text-gray-800">{b.displayValue}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full", b.colorClass)}
              style={{ width: `${Math.min(100, (Math.abs(b.value) / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
