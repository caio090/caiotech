"use client";

/**
 * Guided entry for payment reconciliation. Visão Essencial and Visão
 * Analítica are two RENDERINGS of the same ReconciliationInput state — no
 * second schema, no second engine. Essencial shows the minimal fields
 * (Fase "Modos de preenchimento"); Analítica exposes every technical field.
 * Editing a field in either view updates the same object reconcile() reads.
 */

import { useState } from "react";
import type { ReconciliationInput, FinancialField, FinancialFieldSource } from "@/lib/reports/reconciliation-types";
import { financialField } from "@/lib/reports/reconciliation-types";
import { parseCentsInput, formatCents } from "@/lib/motor-lokat/money";
import type { ReportViewMode } from "@/lib/reports/reconciliation-types";

const EMPTY_FIELD = financialField(null, "manual", "incomplete");

export function emptyReconciliationInput(): ReconciliationInput {
  return {
    grossSales: EMPTY_FIELD,
    merchantFundedDiscounts: EMPTY_FIELD,
    platformFundedDiscounts: EMPTY_FIELD,
    customerPaidAmount: EMPTY_FIELD,
    processorPercentageFee: EMPTY_FIELD,
    processorFixedFee: EMPTY_FIELD,
    installmentFee: EMPTY_FIELD,
    anticipationFee: EMPTY_FIELD,
    platformCommission: EMPTY_FIELD,
    splitAllocationsTotal: EMPTY_FIELD,
    retentions: EMPTY_FIELD,
    refunds: EMPTY_FIELD,
    chargebacks: EMPTY_FIELD,
    informedTaxes: EMPTY_FIELD,
    otherDeductions: EMPTY_FIELD,
    actualSettledAmount: EMPTY_FIELD,
  };
}

type FieldKey = keyof ReconciliationInput;

interface FieldSpec { key: FieldKey; label: string; help: string }

const ESSENTIAL_FIELDS: FieldSpec[] = [
  { key: "customerPaidAmount", label: "Valor vendido", help: "Quanto o cliente pagou no total." },
  { key: "actualSettledAmount", label: "Valor recebido", help: "Quanto efetivamente caiu na conta da empresa." },
  { key: "merchantFundedDiscounts", label: "Desconto dado pela empresa", help: "Desconto que saiu do seu bolso, não da plataforma." },
];

const ANALYTICAL_FIELDS: FieldSpec[] = [
  { key: "customerPaidAmount", label: "Valor pago pelo cliente", help: "Base para todo o cálculo de conciliação." },
  { key: "grossSales", label: "Vendas brutas", help: "Faturamento antes de qualquer desconto." },
  { key: "merchantFundedDiscounts", label: "Desconto financiado pela loja", help: "Desconto que reduz o quanto a empresa recebe." },
  { key: "platformFundedDiscounts", label: "Desconto financiado pela plataforma", help: "Desconto que NÃO reduz o quanto a empresa recebe." },
  { key: "processorPercentageFee", label: "Taxa percentual do processador", help: "Ex.: taxa da adquirente sobre o valor da venda." },
  { key: "processorFixedFee", label: "Taxa fixa do processador", help: "Valor fixo cobrado por transação." },
  { key: "installmentFee", label: "Taxa de parcelamento", help: "Custo extra por vender parcelado." },
  { key: "anticipationFee", label: "Taxa de antecipação", help: "Custo de receber antes do prazo padrão." },
  { key: "platformCommission", label: "Comissão da plataforma", help: "Percentual ou valor retido pela plataforma/marketplace." },
  { key: "splitAllocationsTotal", label: "Total de split/repasses", help: "Soma de tudo repassado a terceiros nesta venda." },
  { key: "retentions", label: "Retenções", help: "Valores retidos temporária ou definitivamente." },
  { key: "refunds", label: "Estornos", help: "Valor devolvido ao cliente." },
  { key: "chargebacks", label: "Chargebacks", help: "Contestações de cartão." },
  { key: "informedTaxes", label: "Impostos informados", help: "Nunca calculado automaticamente — só o que foi informado." },
  { key: "otherDeductions", label: "Outras deduções", help: "Qualquer dedução que não se encaixe acima." },
  { key: "actualSettledAmount", label: "Valor liquidado/recebido", help: "O que realmente chegou na conta." },
];

const SOURCE_LABELS: Record<FinancialFieldSource, string> = {
  api: "API", file: "Arquivo", bank_statement: "Extrato bancário", manual: "Manual",
  system_calculation: "Cálculo do sistema", official_documentation: "Documentação oficial", inference: "Inferência",
};

function FieldRow({ spec, field, onChange }: { spec: FieldSpec; field: FinancialField; onChange: (f: FinancialField) => void }) {
  const [raw, setRaw] = useState(field.value !== null ? formatCents(field.value).replace("R$", "").trim() : "");
  return (
    <div className="grid grid-cols-[1fr_140px_120px] gap-2 items-start py-2 border-b border-gray-50 last:border-0">
      <div>
        <label className="text-xs font-bold text-gray-700 block">{spec.label}</label>
        <p className="text-[10px] text-gray-400">{spec.help}</p>
      </div>
      <input
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const cents = e.target.value.trim() === "" ? null : parseCentsInput(e.target.value);
          onChange({ ...field, value: cents, source: "manual", confidence: cents === null ? "incomplete" : "confirmed" });
        }}
        placeholder="0,00"
        aria-label={spec.label}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
      />
      <span className="text-[10px] text-gray-400 pt-2">{field.value === null ? "Não informado" : SOURCE_LABELS[field.source]}</span>
    </div>
  );
}

export function ReconciliationEntryForm({
  viewMode, value, onChange,
}: {
  viewMode: ReportViewMode;
  value: ReconciliationInput;
  onChange: (next: ReconciliationInput) => void;
}) {
  const fields = viewMode === "essencial" ? ESSENTIAL_FIELDS : ANALYTICAL_FIELDS;
  return (
    <div>
      {fields.map((spec) => (
        <FieldRow
          key={spec.key}
          spec={spec}
          field={value[spec.key]}
          onChange={(f) => onChange({ ...value, [spec.key]: f })}
        />
      ))}
    </div>
  );
}
