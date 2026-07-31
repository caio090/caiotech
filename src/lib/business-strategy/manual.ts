import type { SwotItem, SalesGoal } from "@/lib/motor-lokat/business-types";
import { COMPETITOR_TYPE_LABEL, EIGHT_P_ORDER, type BusinessDnaProfile, type EightPs, type CompetitorProfile, type BusinessSeasonalEvent, type LivingManual, type LivingManualSection } from "./types";
import { buildPositioningSummary } from "./positioning";

const FALLBACK = "Não informado.";

function section(id: string, title: string, content: string, pending: boolean): LivingManualSection {
  return { id, title, content: content.trim() || FALLBACK, pending: pending || content.trim() === "" };
}

/**
 * Manual Vivo (Fase 4): montado ao vivo a partir do DNA, 8Ps, SWOT,
 * concorrentes confirmados, posicionamento, metas e sazonalidade — nunca
 * uma cópia separada. Se um campo do DNA mudar, chamar esta função de novo
 * já reflete a mudança porque ela lê o estado atual, não um snapshot salvo.
 * Informação não confirmada aparece marcada como pendente, nunca como
 * verdade (isExample/confirmed nunca viram "fato" aqui).
 */
export function buildLivingManual(
  companyName: string,
  dna: BusinessDnaProfile,
  eightPs: EightPs,
  swotItems: SwotItem[],
  competitors: CompetitorProfile[],
  goals: SalesGoal[],
  seasonality: BusinessSeasonalEvent[],
  generatedAtIso: string
): LivingManual {
  const confirmedSwot = swotItems.filter((i) => i.confirmed && !i.isExample && i.text.trim() !== "");
  const confirmedCompetitors = competitors.filter((c) => !c.isExample && c.status === "confirmed");
  const positioningSummary = buildPositioningSummary(dna, eightPs);

  const swotByCategory = (category: SwotItem["category"]) =>
    confirmedSwot.filter((i) => i.category === category).map((i) => i.text).join("; ");

  const sections: LivingManualSection[] = [
    section("quem_somos", "Quem somos", dna.description.value, !dna.description.confirmed),
    section("o_que_vendemos", "O que vendemos", dna.mainProducts.value || eightPs.product.text, !dna.mainProducts.confirmed),
    section("para_quem_vendemos", "Para quem vendemos", dna.audiences.value || eightPs.audience.text, !dna.audiences.confirmed),
    section("por_que_escolher", "Por que escolher a empresa", dna.differentiators.value, !dna.differentiators.confirmed),
    section("como_ganha_dinheiro", "Como a empresa ganha dinheiro", dna.businessModel.value, !dna.businessModel.confirmed),
    section("como_vende", "Como vende", dna.salesChannels.value || eightPs.place.text, !dna.salesChannels.confirmed),
    section("como_entrega", "Como entrega", eightPs.process.text, eightPs.process.text.trim() === ""),
    section("como_comunica", "Como se comunica", eightPs.promotion.text, eightPs.promotion.text.trim() === ""),
    section("como_se_posiciona", "Como se posiciona", positioningSummary ?? dna.positioning.value, !positioningSummary),
    section(
      "oito_ps",
      "8Ps",
      EIGHT_P_ORDER.map(({ key, label }) => `${label}: ${eightPs[key].text || FALLBACK}`).join("\n"),
      EIGHT_P_ORDER.every(({ key }) => eightPs[key].text.trim() === "")
    ),
    section(
      "swot",
      "SWOT",
      ["Forças", "Fraquezas", "Oportunidades", "Ameaças"]
        .map((label, idx) => `${label}: ${swotByCategory((["forca", "fraqueza", "oportunidade", "ameaca"] as const)[idx]) || "—"}`)
        .join("\n"),
      confirmedSwot.length === 0
    ),
    section(
      "concorrencia",
      "Concorrência",
      confirmedCompetitors.map((c) => `${c.name} (${COMPETITOR_TYPE_LABEL[c.type]})`).join("; "),
      confirmedCompetitors.length === 0
    ),
    section("metas", "Metas", goals.map((g) => g.label).join("; "), goals.length === 0),
    section(
      "sazonalidade",
      "Sazonalidade",
      seasonality.filter((s) => s.confirmed).map((s) => s.name).join("; "),
      seasonality.filter((s) => s.confirmed).length === 0
    ),
    section("indicadores", "Indicadores", eightPs.performance.text, eightPs.performance.text.trim() === ""),
    section("riscos", "Riscos", dna.restrictions.value, !dna.restrictions.confirmed),
    section(
      "oportunidades",
      "Oportunidades",
      swotByCategory("oportunidade"),
      confirmedSwot.filter((i) => i.category === "oportunidade").length === 0
    ),
  ];

  const missingFieldLabels = Object.entries(dna)
    .filter(([, field]) => field.source === "missing")
    .map(([key]) => key);
  sections.push(section("informacoes_ausentes", "Informações ausentes", missingFieldLabels.join(", "), missingFieldLabels.length > 0));

  return { companyName, sections, generatedAt: generatedAtIso };
}
