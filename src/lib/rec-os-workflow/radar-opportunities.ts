/**
 * Sprint REC OS 3.0.1.1 (Fase 2) — catálogo demonstrativo de oportunidades
 * do Radar. O Radar ainda não tem detecção real de tendências (auditado:
 * a tela anterior só mostrava "Em breve" estático) — em vez de fingir uma
 * IA que não existe, cada oportunidade aqui é marcada "Demonstração" na UI
 * e serve para exercitar de verdade o fluxo Radar → Criar com contexto
 * preservado (Fase 2/3). Nada aqui é persistido: `seed` na URL é só o `id`
 * abaixo — nunca o objeto inteiro.
 */
import type { ContentSeedSourceType } from "./types";

export interface RadarOpportunity {
  id: string;
  sourceType: ContentSeedSourceType;
  title: string;
  summary: string;
  evidence: string;
  opportunity: string;
  objective: string;
  audience: string;
  suggestedFormat: string | null;
  suggestedChannel: string | null;
}

export const RADAR_DEMO_OPPORTUNITIES: RadarOpportunity[] = [
  {
    id: "tendencia-conteudo-vertical",
    sourceType: "tendencia",
    title: "Formato vertical em alta no segmento",
    summary: "Conteúdos em vídeo vertical (Reels/Stories) têm ganhado mais alcance orgânico no segmento do cliente.",
    evidence: "Padrão observado em benchmarks públicos do setor — não é um dado calculado a partir da conta real do cliente.",
    opportunity: "Testar um Reel esta semana usando o tema do último post de maior engajamento.",
    objective: "Aumentar alcance orgânico",
    audience: "Seguidores atuais e público semelhante",
    suggestedFormat: "reel",
    suggestedChannel: "instagram",
  },
  {
    id: "data-sazonal-proxima",
    sourceType: "data_sazonal",
    title: "Data sazonal se aproximando",
    summary: "Datas comemorativas do calendário geral costumam gerar picos de busca e intenção de compra.",
    evidence: "Calendário de datas sazonais genérico — ainda não considera o histórico real do cliente.",
    opportunity: "Planejar uma peça com antecedência para não perder a janela de relevância.",
    objective: "Aproveitar sazonalidade",
    audience: "Base de clientes e leads recentes",
    suggestedFormat: "arte_estatica",
    suggestedChannel: null,
  },
  {
    id: "concorrencia-gap-formato",
    sourceType: "concorrencia",
    title: "Gap de formato frente à concorrência",
    summary: "Concorrentes diretos publicam com mais frequência em um formato que o cliente ainda não explora.",
    evidence: "Observação qualitativa registrada manualmente — sem coleta automatizada de concorrentes nesta versão.",
    opportunity: "Experimentar o mesmo formato adaptado à voz da marca do cliente.",
    objective: "Reduzir gap competitivo",
    audience: "Público do segmento",
    suggestedFormat: "carrossel",
    suggestedChannel: null,
  },
];

export function findRadarOpportunity(id: string | null | undefined): RadarOpportunity | null {
  if (!id) return null;
  return RADAR_DEMO_OPPORTUNITIES.find((o) => o.id === id) ?? null;
}
