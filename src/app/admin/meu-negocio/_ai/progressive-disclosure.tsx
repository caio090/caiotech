"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { formatCents, formatPercent } from "@/lib/motor-lokat/money";
import { generateFinancialInsights } from "@/lib/motor-lokat/insight-rules";
import type { FinancialMetric, FinancialSnapshot } from "@/lib/motor-lokat/types";
import type { SegmentPreset } from "@/lib/motor-lokat/segment-presets";

/**
 * Fase 8 — the first thing a user sees: 6 numbers, one alert, one action.
 * Everything else (formula, premises, composition, confidence, sources,
 * missing data) moves to a second level opened via "Ver cálculo completo".
 */
export function BusinessHeroSummary({ snapshot, preset, onOpenGlossary }: { snapshot: FinancialSnapshot; preset: SegmentPreset; onOpenGlossary: (t: string) => void }) {
  const [detailMetric, setDetailMetric] = useState<FinancialMetric | null>(null);
  const insights = generateFinancialInsights(snapshot);
  const topInsight = insights.find((i) => i.severity === "critico") ?? insights[0] ?? null;

  const items: Array<{ label: string; metric: FinancialMetric; display: string }> = [
    { label: "Faturamento", metric: snapshot.grossSales, display: formatCents(snapshot.grossSales.value) },
    { label: preset.directCostLabel, metric: snapshot.directCost, display: formatCents(snapshot.directCost.value) },
    { label: "Quanto sobrou", metric: snapshot.operatingResult, display: formatCents(snapshot.operatingResult.value) },
  ];

  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--business-surface)", borderColor: "var(--business-border)" }}>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl p-3" style={{ background: "var(--business-surface-soft)" }}>
            <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--business-muted)" }}>{item.label}</p>
            <p className="text-lg font-black" style={{ color: "var(--business-text)" }}>{item.display}</p>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => onOpenGlossary("margem_contribuicao")} className="text-[10px] font-bold underline" style={{ color: "var(--business-accent)" }}>Entender este número</button>
              <button onClick={() => setDetailMetric(item.metric)} className="text-[10px] font-bold underline" style={{ color: "var(--business-muted)" }}>Ver cálculo completo</button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "var(--business-accent-soft)" }}>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: "var(--business-accent)" }}>
            Situação: {snapshot.operatingResult.value >= 0 ? "Resultado positivo" : "Resultado negativo"}
          </p>
          {topInsight ? (
            <>
              <p className="text-xs font-bold mt-1" style={{ color: "var(--business-text)" }}>Principal alerta: {topInsight.what}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--business-text)" }}>Ação sugerida: {topInsight.suggestion}</p>
            </>
          ) : (
            <p className="text-xs mt-1" style={{ color: "var(--business-text)" }}>Nenhum alerta identificado com os dados e metas atuais.</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {detailMetric && <ProgressiveDetailPanel metric={detailMetric} onClose={() => setDetailMetric(null)} />}
      </AnimatePresence>
    </div>
  );
}

function ProgressiveDetailPanel({ metric, onClose }: { metric: FinancialMetric; onClose: () => void }) {
  const displayValue =
    metric.unit === "cents" ? formatCents(metric.value) :
    metric.unit === "percent" ? formatPercent(metric.value) :
    metric.unit === "months" ? `${metric.value.toFixed(1)} meses` :
    metric.value.toFixed(0);

  const content = (
    <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ color: "var(--business-text)" }}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--business-accent)" }}>{metric.explanationTechnical}</p>
        <p className="text-base font-black">{metric.label}</p>
        <p className="text-2xl font-black mt-1">{displayValue}</p>
      </div>
      <Section title="Fórmula"><p className="font-mono text-xs p-2 rounded-lg" style={{ background: "var(--business-surface-soft)" }}>{metric.formula}</p></Section>
      <Section title="Em palavras simples"><p className="text-xs">{metric.explanationSimple}</p></Section>
      <Section title="Confiança e origem"><p className="text-xs">{metric.confidence} · {metric.source}</p></Section>
      <Section title="Interpretação"><p className="text-xs">{metric.statusReason}</p></Section>
      {metric.missingInputs.length > 0 && <Section title="Dados ausentes"><p className="text-xs text-amber-700">{metric.missingInputs.join(", ")}</p></Section>}
    </div>
  );

  return (
    <>
      <motion.div
        initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
        transition={{ type: "tween", duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="hidden sm:flex fixed top-0 right-0 h-full w-[380px] z-[60] flex-col shadow-2xl border-l"
        style={{ background: "var(--business-bg)", borderColor: "var(--business-border)" }}
      >
        <PanelHeader onClose={onClose} />
        {content}
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="sm:hidden fixed inset-0 z-[60] bg-black/40" onClick={onClose}>
        <motion.div
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "tween", duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-3xl overflow-hidden flex flex-col"
          style={{ background: "var(--business-bg)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 rounded-full mx-auto mt-2" style={{ background: "var(--business-border)" }} />
          <PanelHeader onClose={onClose} />
          {content}
        </motion.div>
      </motion.div>
    </>
  );
}

function PanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--business-border)" }}>
      <p className="text-xs font-black" style={{ color: "var(--business-text)" }}>Cálculo completo</p>
      <button onClick={onClose} aria-label="Fechar detalhes" className="p-1 rounded-lg" style={{ color: "var(--business-muted)" }}><X className="w-4 h-4" /></button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--business-muted)" }}>{title}</p>
      {children}
    </div>
  );
}
