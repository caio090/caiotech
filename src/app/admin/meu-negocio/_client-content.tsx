"use client";

import { useMemo, useState } from "react";
import { Sparkles, LayoutGrid, Tags, Megaphone, Wallet, Database, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEGMENT_PRESETS, SEGMENT_ORDER } from "@/lib/motor-lokat/segment-presets";
import { buildFinancialSnapshot } from "@/lib/motor-lokat/financial-engine";
import { findGlossaryEntry } from "@/lib/motor-lokat/glossary";
import type { BusinessSegment, FinancialProfile, FinancialMetric } from "@/lib/motor-lokat/types";
import { MetricDetailModal } from "./_shared";
import { OverviewTab } from "./_overview-tab";
import { PricingTab } from "./_pricing-tab";
import { CampaignTab } from "./_campaign-tab";
import { CashFlowTab } from "./_cashflow-tab";
import { SourcesTab } from "./_sources-tab";
import { GlossaryTab } from "./_glossary-tab";

type TabKey = "overview" | "pricing" | "campaigns" | "cashflow" | "sources" | "glossary";

const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: "overview",  label: "Visão Geral",   icon: LayoutGrid },
  { key: "pricing",   label: "Precificação",  icon: Tags },
  { key: "campaigns", label: "Campanhas",     icon: Megaphone },
  { key: "cashflow",  label: "Fluxo de Caixa", icon: Wallet },
  { key: "sources",   label: "Fontes",        icon: Database },
  { key: "glossary",  label: "Glossário",     icon: BookOpen },
];

function demoProfileForSegment(segment: BusinessSegment): FinancialProfile {
  const preset = SEGMENT_PRESETS[segment];
  const demo: Record<BusinessSegment, { gross: number; subsidy: number; refunds: number; chargebacks: number; direct: number; variable: number; fixed: number; orders: number }> = {
    delivery: { gross: 4_500_000, subsidy: 120_000, refunds: 45_000, chargebacks: 10_000, direct: 1_575_000, variable: 900_000, fixed: 1_200_000, orders: 1500 },
    varejo:   { gross: 8_000_000, subsidy: 0,        refunds: 160_000, chargebacks: 20_000, direct: 3_600_000, variable: 800_000, fixed: 2_100_000, orders: 900 },
    clinica:  { gross: 3_200_000, subsidy: 0,        refunds: 30_000,  chargebacks: 0,        direct: 640_000,  variable: 256_000, fixed: 1_400_000, orders: 260 },
    servicos: { gross: 5_000_000, subsidy: 0,        refunds: 0,        chargebacks: 0,        direct: 1_250_000, variable: 500_000, fixed: 1_800_000, orders: 40 },
    agencia:  { gross: 6_500_000, subsidy: 0,        refunds: 0,        chargebacks: 0,        direct: 1_950_000, variable: 520_000, fixed: 2_400_000, orders: 12 },
    saas:     { gross: 2_800_000, subsidy: 0,        refunds: 0,        chargebacks: 0,        direct: 420_000,  variable: 224_000, fixed: 900_000,  orders: 320 },
  };
  const d = demo[segment];
  return {
    segment,
    grossSales: { value: d.gross, source: "manual" },
    platformSubsidies: { value: d.subsidy, source: d.subsidy > 0 ? "manual" : "missing" },
    refunds: { value: d.refunds, source: "manual" },
    chargebacks: { value: d.chargebacks, source: d.chargebacks > 0 ? "manual" : "missing" },
    directCost: { value: d.direct, source: "estimated" },
    variableExpenses: { value: d.variable, source: "estimated" },
    fixedExpenses: { value: d.fixed, source: "manual" },
    ordersCount: { value: d.orders, source: "manual" },
    goals: { ...preset.suggestedGoals },
  };
}

export function MeuNegocioContent() {
  const [segment, setSegment] = useState<BusinessSegment>("delivery");
  const [profile, setProfile] = useState<FinancialProfile>(() => demoProfileForSegment("delivery"));
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [detailMetric, setDetailMetric] = useState<FinancialMetric | null>(null);
  const [glossaryTermId, setGlossaryTermId] = useState<string | null>(null);

  const preset = SEGMENT_PRESETS[segment];
  const snapshot = useMemo(() => buildFinancialSnapshot(profile), [profile]);

  function handleSegmentChange(next: BusinessSegment) {
    setSegment(next);
    setProfile(demoProfileForSegment(next));
  }

  function openGlossaryTerm(termId: string) {
    if (findGlossaryEntry(termId)) setGlossaryTermId(termId);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">Meu Negócio</h1>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-600 text-white">
                Motor LOKAT
              </span>
            </div>
            <p className="text-xs text-gray-400">Finanças, campanhas e decisões em um só lugar.</p>
          </div>
        </div>

        <select
          value={segment}
          onChange={(e) => handleSegmentChange(e.target.value as BusinessSegment)}
          data-testid="meu-negocio-segment-select"
          className="text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 bg-white text-gray-700"
        >
          {SEGMENT_ORDER.map((s) => (
            <option key={s} value={s}>{SEGMENT_PRESETS[s].label}</option>
          ))}
        </select>
      </div>

      {/* Demo mode banner (Fase 3 — always visible, never hidden) */}
      <div className="mb-5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
        <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider mb-0.5">Modo demonstração</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          Os valores desta tela são exemplos editáveis e não representam a situação financeira real de nenhum cliente.
          Nada aqui é salvo — os dados existem apenas durante esta sessão da página.
        </p>
      </div>

      <p className="text-[11px] text-gray-400 mb-5 italic">
        Referência inicial. Ajuste conforme a realidade do negócio e a orientação do contador ou gestor financeiro.
      </p>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            data-testid={`meu-negocio-tab-${key}`}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border whitespace-nowrap transition-colors",
              activeTab === key
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <OverviewTab
          profile={profile} onProfileChange={setProfile} snapshot={snapshot} preset={preset}
          onOpenDetail={setDetailMetric} onOpenGlossary={openGlossaryTerm}
        />
      )}
      {activeTab === "pricing" && <PricingTab onOpenGlossary={openGlossaryTerm} />}
      {activeTab === "campaigns" && <CampaignTab onOpenGlossary={openGlossaryTerm} />}
      {activeTab === "cashflow" && <CashFlowTab snapshot={snapshot} onOpenGlossary={openGlossaryTerm} />}
      {activeTab === "sources" && <SourcesTab />}
      {activeTab === "glossary" && <GlossaryTab initialTermId={glossaryTermId} />}

      {detailMetric && (
        <MetricDetailModal metric={detailMetric} onClose={() => setDetailMetric(null)} />
      )}

      {glossaryTermId && activeTab !== "glossary" && (
        <GlossaryQuickView termId={glossaryTermId} onClose={() => setGlossaryTermId(null)} />
      )}
    </div>
  );
}

function GlossaryQuickView({ termId, onClose }: { termId: string; onClose: () => void }) {
  const entry = findGlossaryEntry(termId);
  if (!entry) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[80vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">{entry.technicalName}</p>
        <p className="text-base font-black text-gray-900 mt-0.5 mb-3">{entry.simpleName}</p>
        <p className="text-sm text-gray-700 leading-relaxed mb-3">{entry.explanation}</p>
        <p className="text-xs font-mono bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 mb-3">{entry.formula}</p>
        <p className="text-xs text-gray-500 mb-4">{entry.example}</p>
        <button onClick={onClose} className="w-full text-xs font-bold py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
          Fechar
        </button>
      </div>
    </div>
  );
}
