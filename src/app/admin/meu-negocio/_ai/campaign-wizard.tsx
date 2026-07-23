"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, MessageCircle } from "lucide-react";
import { formatCents } from "@/lib/motor-lokat/money";
import { calculateCampaignProjection } from "@/lib/motor-lokat/campaign-engine";
import type { CampaignInput, CampaignObjective } from "@/lib/motor-lokat/types";
import type { AssistantContextSnapshot } from "@/lib/motor-lokat/ai/types";
import { defaultCampaignInput } from "../_campaign-tab";
import { AssistantChat } from "./chat";

const OBJECTIVES: Array<{ value: CampaignObjective; label: string }> = [
  { value: "vender", label: "Vender" },
  { value: "aumentar_ticket", label: "Aumentar ticket" },
  { value: "conquistar_clientes", label: "Conquistar clientes" },
  { value: "recuperar_clientes", label: "Recuperar clientes" },
  { value: "gerar_recorrencia", label: "Gerar recorrência" },
  { value: "fortalecer_marca", label: "Fortalecer a marca" },
];

interface WizardState {
  objective: CampaignObjective;
  product: string;
  audience: string;
  period: string;
  budgetCents: number;
  regularPriceCents: number;
  offerPriceCents: number;
  discountFundedBy: "plataforma" | "empresa";
  capacity: number;
  goalOrders: number;
  channels: string;
}

const QUESTIONS = [
  "Objetivo", "Produto ou serviço", "Público", "Período", "Orçamento",
  "Oferta", "Quem paga o desconto", "Capacidade", "Meta", "Canais",
] as const;

function initialWizardState(): WizardState {
  return {
    objective: "vender", product: "", audience: "", period: "", budgetCents: 0,
    regularPriceCents: 0, offerPriceCents: 0, discountFundedBy: "empresa",
    capacity: 0, goalOrders: 0, channels: "",
  };
}

function buildCampaignInput(state: WizardState): CampaignInput {
  const base = defaultCampaignInput();
  const discount = Math.max(0, state.regularPriceCents - state.offerPriceCents);
  return {
    ...base,
    name: state.product || base.name,
    objective: state.objective,
    product: state.product || base.product,
    regularPrice: state.regularPriceCents || base.regularPrice,
    pricePaidByCustomer: state.offerPriceCents || base.pricePaidByCustomer,
    platformSubsidyPerOrder: state.discountFundedBy === "plataforma" ? discount : 0,
    mediaBudget: state.budgetCents || base.mediaBudget,
    projectedQuantity: state.goalOrders || base.projectedQuantity,
  };
}

/** Fase 14 — guided campaign planning. Every projection comes from calculateCampaignProjection (Sprint 1.0); the wizard never estimates money itself. */
export function CampaignWizard({ context, onOpenGlossary }: { context: AssistantContextSnapshot; onOpenGlossary: (t: string) => void }) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialWizardState);
  const [showAssistant, setShowAssistant] = useState(false);

  const campaignInput = buildCampaignInput(state);
  const projection = calculateCampaignProjection(campaignInput);
  const isLast = step === QUESTIONS.length - 1;

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  const missingData: string[] = [];
  if (!state.product) missingData.push("Produto ou serviço");
  if (!state.regularPriceCents || !state.offerPriceCents) missingData.push("Preço normal e preço de oferta");
  if (!state.goalOrders) missingData.push("Meta de pedidos");
  if (state.capacity && state.goalOrders > state.capacity) missingData.push("Meta acima da capacidade informada");

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border p-4 space-y-4" style={{ background: "var(--business-surface)", borderColor: "var(--business-border)" }}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold" style={{ color: "var(--business-text)" }}>Planejar campanha comigo — {step + 1}/{QUESTIONS.length}: {QUESTIONS[step]}</p>
          <button onClick={() => setShowAssistant((v) => !v)} className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "var(--business-accent)" }}>
            <MessageCircle className="w-3 h-3" /> Perguntar ao assistente
          </button>
        </div>

        {step === 0 && (
          <div className="grid grid-cols-2 gap-2">
            {OBJECTIVES.map((o) => (
              <button key={o.value} onClick={() => update("objective", o.value)} className="text-[11px] font-bold px-2.5 py-2 rounded-lg border"
                style={state.objective === o.value ? { background: "var(--business-accent)", color: "white", borderColor: "var(--business-accent)" } : { borderColor: "var(--business-border)", color: "var(--business-text)" }}>
                {o.label}
              </button>
            ))}
          </div>
        )}
        {step === 1 && <TextField label="Produto ou serviço" value={state.product} onChange={(v) => update("product", v)} />}
        {step === 2 && <TextField label="Público" value={state.audience} onChange={(v) => update("audience", v)} />}
        {step === 3 && <TextField label="Período" value={state.period} onChange={(v) => update("period", v)} placeholder="Ex.: 15 a 30 de agosto" />}
        {step === 4 && <MoneyField label="Orçamento de mídia" cents={state.budgetCents} onChange={(v) => update("budgetCents", v)} />}
        {step === 5 && (
          <div className="grid grid-cols-2 gap-2">
            <MoneyField label="Preço normal" cents={state.regularPriceCents} onChange={(v) => update("regularPriceCents", v)} />
            <MoneyField label="Preço da oferta" cents={state.offerPriceCents} onChange={(v) => update("offerPriceCents", v)} />
          </div>
        )}
        {step === 6 && (
          <div className="flex gap-2">
            {(["empresa", "plataforma"] as const).map((who) => (
              <button key={who} onClick={() => update("discountFundedBy", who)} className="flex-1 text-[11px] font-bold px-2.5 py-2 rounded-lg border capitalize"
                style={state.discountFundedBy === who ? { background: "var(--business-accent)", color: "white", borderColor: "var(--business-accent)" } : { borderColor: "var(--business-border)", color: "var(--business-text)" }}>
                {who}
              </button>
            ))}
          </div>
        )}
        {step === 7 && <NumberField label="Capacidade máxima no período" value={state.capacity} onChange={(v) => update("capacity", v)} />}
        {step === 8 && <NumberField label="Meta de pedidos" value={state.goalOrders} onChange={(v) => update("goalOrders", v)} />}
        {step === 9 && <TextField label="Canais" value={state.channels} onChange={(v) => update("channels", v)} placeholder="Ex.: Instagram, WhatsApp, e-mail" />}

        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-1 text-[11px] font-bold disabled:opacity-30" style={{ color: "var(--business-muted)" }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </button>
          {!isLast && (
            <button onClick={() => setStep((s) => Math.min(QUESTIONS.length - 1, s + 1))} className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--business-accent)" }}>
              Próxima <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {showAssistant && (
          <div className="h-56 border-t pt-2" style={{ borderColor: "var(--business-border)" }}>
            <AssistantChat mode="campaign" context={context} placeholder="Posso ajudar a planejar ou interpretar uma campanha." />
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-4 space-y-3" style={{ background: "var(--business-surface)", borderColor: "var(--business-border)" }}>
        <p className="text-xs font-bold" style={{ color: "var(--business-text)" }}>Impacto financeiro (recalculado a cada resposta)</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Metric label="Orçamento" value={formatCents(campaignInput.mediaBudget)} />
          <Metric label="Margem por pedido" value={formatCents(projection.contributionMarginPerOrder)} />
          <Metric label="Ponto de equilíbrio" value={projection.ordersToBreakEven !== null ? `${Math.ceil(projection.ordersToBreakEven)} pedidos` : "—"} />
          <Metric label="CAC projetado" value={projection.cac !== null ? formatCents(projection.cac) : "—"} />
          <div className="col-span-2">
            <button type="button" onClick={() => onOpenGlossary("cac")} className="text-[10px] underline" style={{ color: "var(--business-muted)" }}>Risco (ver glossário de CAC)</button>
            <p className="text-xs font-bold" style={{ color: "var(--business-text)" }}>{projection.statusReason}</p>
          </div>
        </div>
        {missingData.length > 0 && (
          <p className="text-[10px] text-amber-700">Dados ausentes: {missingData.join(", ")}</p>
        )}
        {isLast && (
          <div className="pt-2 border-t space-y-2" style={{ borderColor: "var(--business-border)" }}>
            <Link
              href="/admin/contentos/criar?step=brief"
              className="flex items-center justify-center gap-1 text-[11px] font-bold px-3 py-2 rounded-lg text-white"
              style={{ background: "var(--business-accent)" }}
            >
              Gerar briefing no REC OS <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <p className="text-[9px] text-center" style={{ color: "var(--business-muted)" }}>
              Contexto preparado para a próxima integração — nenhuma campanha é salva ou enviada automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold mb-1" style={{ color: "var(--business-muted)" }}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full text-sm rounded-xl px-3 py-2 outline-none border" style={{ borderColor: "var(--business-border)", background: "var(--business-surface)" }} />
    </label>
  );
}
function MoneyField({ label, cents, onChange }: { label: string; cents: number; onChange: (cents: number) => void }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold mb-1" style={{ color: "var(--business-muted)" }}>{label}</span>
      <input
        type="text" inputMode="decimal"
        value={cents ? (cents / 100).toFixed(2) : ""}
        onChange={(e) => onChange(Math.round((Number.parseFloat(e.target.value.replace(",", ".")) || 0) * 100))}
        placeholder="0,00"
        className="w-full text-sm rounded-xl px-3 py-2 outline-none border"
        style={{ borderColor: "var(--business-border)", background: "var(--business-surface)" }}
      />
    </label>
  );
}
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold mb-1" style={{ color: "var(--business-muted)" }}>{label}</span>
      <input
        type="text" inputMode="numeric"
        value={value || ""}
        onChange={(e) => onChange(Number.parseInt(e.target.value.replace(/\D/g, ""), 10) || 0)}
        placeholder="0"
        className="w-full text-sm rounded-xl px-3 py-2 outline-none border"
        style={{ borderColor: "var(--business-border)", background: "var(--business-surface)" }}
      />
    </label>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px]" style={{ color: "var(--business-muted)" }}>{label}</p>
      <p className="text-xs font-bold" style={{ color: "var(--business-text)" }}>{value}</p>
    </div>
  );
}
