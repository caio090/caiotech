"use client";

import { useState } from "react";
import { Building2, Layers, ShieldAlert, Target, FileText, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCents, formatPercent } from "@/lib/motor-lokat/money";
import type {
  BusinessDNA, FourPs, SwotItem, SwotCategory, SalesGoal, SalesGoalMetric, BusinessDataSource,
} from "@/lib/motor-lokat/business-types";
import { DNA_FIELD_ORDER } from "@/lib/motor-lokat/business-types";
import { DnaTextField, BusinessSourceSelect, MoneyInput, NumberInput, generateId } from "./_shared";

type SubTab = "dna" | "four_ps" | "swot" | "goals" | "manual";

const SUB_TABS: Array<{ key: SubTab; label: string; icon: React.ElementType }> = [
  { key: "dna", label: "DNA do Negócio", icon: Building2 },
  { key: "four_ps", label: "4 Ps", icon: Layers },
  { key: "swot", label: "SWOT / FOFA", icon: ShieldAlert },
  { key: "goals", label: "Metas de Vendas", icon: Target },
  { key: "manual", label: "Manual do Negócio", icon: FileText },
];

const SWOT_CATEGORIES: Array<{ key: SwotCategory; label: string; hint: string; color: string }> = [
  { key: "forca", label: "Forças", hint: "Ambiente interno", color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
  { key: "fraqueza", label: "Fraquezas", hint: "Ambiente interno", color: "bg-amber-50 border-amber-100 text-amber-700" },
  { key: "oportunidade", label: "Oportunidades", hint: "Ambiente externo", color: "bg-blue-50 border-blue-100 text-blue-700" },
  { key: "ameaca", label: "Ameaças", hint: "Ambiente externo", color: "bg-red-50 border-red-100 text-red-700" },
];

const SWOT_ENVIRONMENTS: Array<{ label: string; explanation: string; categories: SwotCategory[] }> = [
  { label: "Ambiente interno", explanation: "Fatores mais próximos do controle da empresa.", categories: ["forca", "fraqueza"] },
  { label: "Ambiente externo", explanation: "Fatores do mercado e contexto que afetam o negócio.", categories: ["oportunidade", "ameaca"] },
];

const GOAL_METRIC_LABEL: Record<SalesGoalMetric, string> = {
  unidades: "Unidades", faturamento: "Faturamento", clientes_novos: "Clientes novos",
  recompra: "Recompra (%)", margem_contribuicao: "Margem de contribuição", ticket_medio: "Ticket médio",
};

const isMoneyMetric = (m: SalesGoalMetric) => m === "faturamento" || m === "margem_contribuicao" || m === "ticket_medio";
const isPercentMetric = (m: SalesGoalMetric) => m === "recompra";

interface Props {
  dna: BusinessDNA;
  onDnaChange: (d: BusinessDNA) => void;
  fourPs: FourPs;
  onFourPsChange: (f: FourPs) => void;
  swotItems: SwotItem[];
  onSwotChange: (items: SwotItem[]) => void;
  salesGoals: SalesGoal[];
  onSalesGoalsChange: (goals: SalesGoal[]) => void;
}

export function BusinessTab({ dna, onDnaChange, fourPs, onFourPsChange, swotItems, onSwotChange, salesGoals, onSalesGoalsChange }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("dna");

  function updateDnaField(key: keyof BusinessDNA, value: string) {
    onDnaChange({ ...dna, [key]: { ...dna[key], value } as never });
  }
  function updateDnaSource(key: keyof BusinessDNA, source: BusinessDataSource) {
    onDnaChange({ ...dna, [key]: { ...dna[key], source } as never });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SUB_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            data-testid={`business-subtab-${key}`}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg border whitespace-nowrap transition-colors",
              subTab === key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      {subTab === "dna" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-700 mb-1">DNA do Negócio</p>
          <p className="text-[10px] text-gray-400 mb-4">O contexto central usado pelo Motor LOKAT, REC OS e demais módulos.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {DNA_FIELD_ORDER.map(({ key, label }) => {
              const field = dna[key] as { value: string; source: BusinessDataSource };
              return (
                <DnaTextField
                  key={key}
                  label={label}
                  value={field.value}
                  source={field.source}
                  onChange={(v) => updateDnaField(key, v)}
                  onSourceChange={(s) => updateDnaSource(key, s)}
                  multiline={key === "description" || key === "valueProposition"}
                  dataTestId={key === "companyName" ? "dna-company-name" : undefined}
                />
              );
            })}
          </div>
        </div>
      )}

      {subTab === "four_ps" && <FourPsSection fourPs={fourPs} onChange={onFourPsChange} />}
      {subTab === "swot" && <SwotSection items={swotItems} onChange={onSwotChange} />}
      {subTab === "goals" && <GoalsSection goals={salesGoals} onChange={onSalesGoalsChange} />}
      {subTab === "manual" && <BusinessManual dna={dna} fourPs={fourPs} swotItems={swotItems} salesGoals={salesGoals} />}
    </div>
  );
}

function FourPsSection({ fourPs, onChange }: { fourPs: FourPs; onChange: (f: FourPs) => void }) {
  const sections: Array<{ key: keyof FourPs; label: string; desc: string }> = [
    { key: "product", label: "Produto", desc: "O que a empresa vende e qual necessidade atende." },
    { key: "price", label: "Preço", desc: "Faixa, lógica de precificação e percepção de valor." },
    { key: "place", label: "Praça", desc: "Onde, como e para quem vende." },
    { key: "promotion", label: "Promoção", desc: "Como comunica, apresenta e promove. Promoção não significa necessariamente desconto." },
  ];
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {sections.map(({ key, label, desc }) => (
        <div key={key} className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-bold text-gray-700">{label}</p>
          <p className="text-[10px] text-gray-400 mb-3">{desc}</p>
          <div className="space-y-2.5">
            <label className="block">
              <span className="block text-[10px] font-semibold text-gray-500 mb-1">Descrição</span>
              <textarea
                value={fourPs[key].text}
                onChange={(e) => onChange({ ...fourPs, [key]: { ...fourPs[key], text: e.target.value } })}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400 resize-none"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] font-semibold text-gray-500 mb-1">Evidências</span>
              <input
                value={fourPs[key].evidence}
                onChange={(e) => onChange({ ...fourPs, [key]: { ...fourPs[key], evidence: e.target.value } })}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] font-semibold text-gray-500 mb-1">Observações</span>
              <input
                value={fourPs[key].notes}
                onChange={(e) => onChange({ ...fourPs, [key]: { ...fourPs[key], notes: e.target.value } })}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400"
              />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

function SwotSection({ items, onChange }: { items: SwotItem[]; onChange: (items: SwotItem[]) => void }) {
  function addItem(category: SwotCategory) {
    const newItem: SwotItem = {
      id: generateId("swot"),
      category, text: "", source: "manual", evidence: "", impact: "medio", priority: "media", confirmed: false,
    };
    onChange([...items, newItem]);
  }
  function updateItem(id: string, patch: Partial<SwotItem>) {
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-5">
      {SWOT_ENVIRONMENTS.map((env) => (
        <div key={env.label}>
          <div className="mb-2">
            <p className="text-xs font-black text-gray-800">{env.label}</p>
            <p className="text-[10px] text-gray-400">{env.explanation}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {SWOT_CATEGORIES.filter((c) => env.categories.includes(c.key)).map(({ key, label, hint, color }) => {
              const categoryItems = items.filter((i) => i.category === key);
              return (
                <div key={key} className={cn("rounded-2xl border p-4", color)}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold">{label}</p>
                    <button onClick={() => addItem(key)} className="p-1 rounded-lg hover:bg-white/60 transition-colors" aria-label={`Adicionar ${label}`}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[9px] opacity-70 mb-3">{hint}</p>
                  <div className="space-y-2">
                    {categoryItems.map((item, index) => (
                      <div key={item.id} className="bg-white/70 rounded-xl p-2.5 space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          <label className="flex-1">
                            <span className="sr-only">{`${label} — item ${index + 1}`}</span>
                            <input
                              value={item.text}
                              onChange={(e) => updateItem(item.id, { text: e.target.value })}
                              placeholder={item.isExample ? "Exemplo — edite ou confirme" : "Descreva o item"}
                              aria-label={`${label} — item ${index + 1}`}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-purple-400 bg-white"
                            />
                          </label>
                          <button onClick={() => removeItem(item.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" aria-label={`Remover item ${index + 1} de ${label}`}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <BusinessSourceSelect source={item.source} onChange={(s) => updateItem(item.id, { source: s })} ariaLabel={`Origem do item ${index + 1} de ${label}`} />
                          <label className="flex items-center gap-1">
                            <span className="sr-only">{`Impacto do item ${index + 1} de ${label}`}</span>
                            <select value={item.impact} onChange={(e) => updateItem(item.id, { impact: e.target.value as SwotItem["impact"] })} aria-label={`Impacto do item ${index + 1} de ${label}`} className="text-[9px] border border-gray-200 rounded-full px-1.5 py-0.5 bg-white">
                              <option value="alto">Impacto alto</option>
                              <option value="medio">Impacto médio</option>
                              <option value="baixo">Impacto baixo</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-1">
                            <span className="sr-only">{`Prioridade do item ${index + 1} de ${label}`}</span>
                            <select value={item.priority} onChange={(e) => updateItem(item.id, { priority: e.target.value as SwotItem["priority"] })} aria-label={`Prioridade do item ${index + 1} de ${label}`} className="text-[9px] border border-gray-200 rounded-full px-1.5 py-0.5 bg-white">
                              <option value="alta">Prioridade alta</option>
                              <option value="media">Prioridade média</option>
                              <option value="baixa">Prioridade baixa</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-1 text-[9px] font-bold ml-auto">
                            <input type="checkbox" checked={item.confirmed} onChange={(e) => updateItem(item.id, { confirmed: e.target.checked })} />
                            Confirmado
                          </label>
                        </div>
                        {item.isExample && !item.confirmed && (
                          <p className="text-[9px] text-gray-400 italic">Exemplo de segmento — não confirmado como fato do negócio.</p>
                        )}
                      </div>
                    ))}
                    {categoryItems.length === 0 && <p className="text-[10px] opacity-60 text-center py-2">Nenhum item adicionado.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function GoalsSection({ goals, onChange }: { goals: SalesGoal[]; onChange: (goals: SalesGoal[]) => void }) {
  function addGoal() {
    onChange([...goals, {
      id: generateId("goal"), label: "Nova meta", metric: "faturamento",
      actualValue: 0, goalValue: 0, period: "Mês atual (demonstração)", channel: "Todos", product: "Todos", unit: "un.",
    }]);
  }
  function updateGoal(id: string, patch: Partial<SalesGoal>) {
    onChange(goals.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }
  function removeGoal(id: string) {
    onChange(goals.filter((g) => g.id !== id));
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-700">Metas de vendas</p>
        <button onClick={addGoal} className="flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1.5 rounded-lg hover:bg-purple-100 transition-colors">
          <Plus className="w-3 h-3" /> Nova meta
        </button>
      </div>
      <div className="space-y-3">
        {goals.map((goal) => {
          const diff = goal.actualValue - goal.goalValue;
          const pctReached = goal.goalValue !== 0 ? (goal.actualValue / goal.goalValue) * 100 : null;
          return (
            <div key={goal.id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <label className="flex-1">
                  <span className="sr-only">Nome da meta</span>
                  <input value={goal.label} onChange={(e) => updateGoal(goal.id, { label: e.target.value })} aria-label="Nome da meta" className="w-full text-xs font-bold border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-purple-400" />
                </label>
                <label>
                  <span className="sr-only">Métrica da meta</span>
                  <select value={goal.metric} onChange={(e) => updateGoal(goal.id, { metric: e.target.value as SalesGoalMetric })} aria-label="Métrica da meta" className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                    {(Object.keys(GOAL_METRIC_LABEL) as SalesGoalMetric[]).map((m) => <option key={m} value={m}>{GOAL_METRIC_LABEL[m]}</option>)}
                  </select>
                </label>
                <button onClick={() => removeGoal(goal.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" aria-label="Remover meta">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
                {isMoneyMetric(goal.metric) ? (
                  <>
                    <MoneyInput label="Real atual" valueCents={goal.actualValue} onChange={(v) => updateGoal(goal.id, { actualValue: v })} />
                    <MoneyInput label="Meta" valueCents={goal.goalValue} onChange={(v) => updateGoal(goal.id, { goalValue: v })} />
                  </>
                ) : (
                  <>
                    <NumberInput label="Real atual" value={goal.actualValue} onChange={(v) => updateGoal(goal.id, { actualValue: v })} />
                    <NumberInput label="Meta" value={goal.goalValue} onChange={(v) => updateGoal(goal.id, { goalValue: v })} />
                  </>
                )}
                <label className="block">
                  <span className="block text-[11px] font-semibold text-gray-600 mb-1">Canal</span>
                  <input value={goal.channel} onChange={(e) => updateGoal(goal.id, { channel: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400" />
                </label>
                <label className="block">
                  <span className="block text-[11px] font-semibold text-gray-600 mb-1">Produto</span>
                  <input value={goal.product} onChange={(e) => updateGoal(goal.id, { product: e.target.value })} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-purple-400" />
                </label>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-gray-500">
                <span>Diferença: <strong className={diff >= 0 ? "text-emerald-600" : "text-red-600"}>{isMoneyMetric(goal.metric) ? formatCents(diff) : isPercentMetric(goal.metric) ? formatPercent(diff / 100) : diff.toFixed(0)}</strong></span>
                <span>Atingido: <strong className="text-gray-800">{pctReached !== null ? `${pctReached.toFixed(0)}%` : "—"}</strong></span>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhuma meta cadastrada.</p>}
      </div>
    </div>
  );
}

function BusinessManual({ dna, fourPs, swotItems, salesGoals }: { dna: BusinessDNA; fourPs: FourPs; swotItems: SwotItem[]; salesGoals: SalesGoal[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Manual do Negócio</p>
        <p className="text-sm font-black text-gray-900">{dna.companyName.value || "Empresa sem nome definido"}</p>
        <p className="text-xs text-gray-500 mt-1">{dna.description.value || "Nenhuma descrição informada."}</p>
      </div>

      <section>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1.5">Modelo de negócio</p>
        <p className="text-xs text-gray-700">{dna.businessModel.value || "—"}</p>
      </section>

      <section>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1.5">Proposta de valor</p>
        <p className="text-xs text-gray-700">{dna.valueProposition.value || "—"}</p>
      </section>

      <section>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1.5">Público e posicionamento</p>
        <p className="text-xs text-gray-700">{dna.audiences.value || "—"} · {dna.positioning.value || "Posicionamento não definido"}</p>
      </section>

      <section>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1.5">4 Ps</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {(["product", "price", "place", "promotion"] as const).map((k) => (
            <p key={k} className="text-xs text-gray-700"><strong className="capitalize">{k}:</strong> {fourPs[k].text || "—"}</p>
          ))}
        </div>
      </section>

      <section>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1.5">SWOT / FOFA</p>
        {SWOT_CATEGORIES.map(({ key, label }) => {
          const catItems = swotItems.filter((i) => i.category === key && i.text.trim());
          return (
            <p key={key} className="text-xs text-gray-700 mb-0.5">
              <strong>{label}:</strong> {catItems.length > 0 ? catItems.map((i) => i.text).join("; ") : "—"}
            </p>
          );
        })}
      </section>

      <section>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1.5">Metas</p>
        {salesGoals.length === 0 ? <p className="text-xs text-gray-400">Nenhuma meta cadastrada.</p> : (
          <ul className="text-xs text-gray-700 list-disc list-inside space-y-0.5">
            {salesGoals.map((g) => <li key={g.id}>{g.label} ({GOAL_METRIC_LABEL[g.metric]})</li>)}
          </ul>
        )}
      </section>

      <section>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1.5">Canais e regiões</p>
        <p className="text-xs text-gray-700">{dna.salesChannels.value || "—"} · {dna.regionsServed.value || "—"}</p>
      </section>

      <section>
        <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1.5">Restrições e riscos</p>
        <p className="text-xs text-gray-700">{dna.restrictions.value || "—"}</p>
      </section>

      <p className="text-[10px] text-gray-400 italic pt-2 border-t border-gray-50">
        Este manual é derivado ao vivo do DNA do Negócio, 4 Ps, SWOT e Metas — não é uma cópia separada. Editar qualquer aba acima atualiza este resumo.
      </p>
    </div>
  );
}
