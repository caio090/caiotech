/** "Analisar e preencher" — proposta em memória, nunca aplicada automaticamente. */

export interface AnalysisProposalField {
  id: string;
  field: string;
  currentValue: string;
  suggestedValue: string;
  origin: string;
  reason: string;
  confidence: "alta" | "media" | "baixa";
}

export type AnalysisStage = "idle" | "reading" | "organizing" | "identifying_gaps" | "calculating" | "preparing" | "ready";

export const ANALYSIS_STAGE_LABEL: Record<AnalysisStage, string> = {
  idle: "",
  reading: "Lendo diagnóstico...",
  organizing: "Organizando dados...",
  identifying_gaps: "Identificando lacunas...",
  calculating: "Calculando indicadores...",
  preparing: "Preparando recomendações...",
  ready: "Pronto",
};

export const ANALYSIS_STAGE_ORDER: AnalysisStage[] = ["reading", "organizing", "identifying_gaps", "calculating", "preparing", "ready"];

export const ANALYSIS_PROPOSAL_FIXTURES: AnalysisProposalField[] = [
  { id: "prop-1", field: "Embalagem — Smash de Exemplo", currentValue: "Não preenchida", suggestedValue: "R$ 0,60 (exemplo)", origin: "Média de fichas semelhantes (simulado)", reason: "Nenhuma ficha técnica ativa deveria ficar sem custo de embalagem", confidence: "media" },
  { id: "prop-2", field: "Consumo médio diário — Queijo cheddar fatiado", currentValue: "3,2 kg/dia", suggestedValue: "3,6 kg/dia (exemplo)", origin: "Média das últimas movimentações simuladas", reason: "Consumo real recente ficou acima da média cadastrada", confidence: "alta" },
  { id: "prop-3", field: "Estoque de segurança — Refrigerante lata", currentValue: "80 unidades", suggestedValue: "100 unidades (exemplo)", origin: "Variação de consumo em dias de pico (simulado)", reason: "Cobertura ficou abaixo de 2 dias em picos de venda simulados", confidence: "baixa" },
];
