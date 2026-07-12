// Marketing Intelligence — deterministic analysis engine.
// Provider pattern for future ELR replacement.
// No external AI calls in this version.

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface MetricSet {
  reach?:           number | null;
  views?:           number | null;
  profile_views?:   number | null;
  website_clicks?:  number | null;
  followers_count?: number | null;
  page_impressions?: number | null;
  page_reach?:      number | null;
}

export interface MarketingContext {
  currentMetrics:   MetricSet;
  previousMetrics?: MetricSet | null;
  period:           string;
  clientName?:      string;
  assetType?:       "instagram_business" | "facebook_page";
}

export interface MarketingSuggestion {
  title:          string;
  category:       "content" | "frequency" | "format" | "timing" | "engagement" | "approval" | "campaign";
  reason:         string;
  action:         string;
  expectedImpact: string;
  /** Deterministic confidence: "high" = both periods + relevant delta; "medium" = current only or partial; "low" = single metric or short period */
  confidence:     "high" | "medium" | "low";
}

export interface MarketingReportInsights {
  highlights:         string[];
  warnings:           string[];
  opportunities:      string[];
  recommendedActions: string[];
  suggestions:        MarketingSuggestion[];
  disclaimer:         string;
}

export interface MarketingIntelligenceProvider {
  generateSuggestions(context: MarketingContext): Promise<MarketingReportInsights>;
}

// ── Comparison helpers ─────────────────────────────────────────────────────────

export interface MetricComparison {
  current:    number | null;
  previous:   number | null;
  delta:      number | null;
  pctChange:  number | null;
  direction:  "up" | "down" | "stable" | "unavailable";
  fromZero:   boolean;
}

export function compareMetric(current: number | null | undefined, previous: number | null | undefined): MetricComparison {
  const cur = current ?? null;
  const prev = previous ?? null;

  if (cur === null || prev === null) {
    return { current: cur, previous: prev, delta: null, pctChange: null, direction: "unavailable", fromZero: false };
  }
  if (prev === 0 && cur > 0) {
    return { current: cur, previous: 0, delta: cur, pctChange: null, direction: "up", fromZero: true };
  }
  if (prev === 0 && cur === 0) {
    return { current: 0, previous: 0, delta: 0, pctChange: 0, direction: "stable", fromZero: false };
  }
  if (cur === 0 && prev > 0) {
    return { current: 0, previous: prev, delta: -prev, pctChange: -100, direction: "down", fromZero: false };
  }
  const pct = ((cur - prev) / prev) * 100;
  return {
    current: cur, previous: prev,
    delta: cur - prev,
    pctChange: Math.round(pct * 10) / 10,
    direction: pct > 1 ? "up" : pct < -1 ? "down" : "stable",
    fromZero: false,
  };
}

export function fmtPct(c: MetricComparison): string {
  if (c.direction === "unavailable") return "—";
  if (c.fromZero) return "Novo";
  if (c.pctChange === null) return "—";
  const sign = c.pctChange >= 0 ? "+" : "";
  return `${sign}${c.pctChange.toFixed(1)}%`;
}

// ── Deterministic engine ───────────────────────────────────────────────────────

export function generateMarketingReportInsights(context: MarketingContext): MarketingReportInsights {
  const { currentMetrics: cur, previousMetrics: prev, period } = context;

  const highlights:         string[] = [];
  const warnings:           string[] = [];
  const opportunities:      string[] = [];
  const recommendedActions: string[] = [];
  const suggestions:        MarketingSuggestion[] = [];

  const reach       = cur.reach       ?? cur.page_reach       ?? null;
  const views       = cur.views       ?? cur.page_impressions  ?? null;
  const clicks      = cur.website_clicks ?? null;
  const profileViews = cur.profile_views ?? null;
  const followers   = cur.followers_count ?? null;

  // ── Comparison values ──────────────────────────────────────────────────────
  const prevReach   = prev?.reach       ?? prev?.page_reach       ?? null;
  const prevViews   = prev?.views       ?? prev?.page_impressions  ?? null;
  const prevClicks  = prev?.website_clicks ?? null;
  const prevFollow  = prev?.followers_count ?? null;

  const reachCmp   = compareMetric(reach,   prevReach);
  const viewsCmp   = compareMetric(views,   prevViews);
  const clicksCmp  = compareMetric(clicks,  prevClicks);
  const followCmp  = compareMetric(followers, prevFollow);

  // ── Highlights ─────────────────────────────────────────────────────────────

  if (reach !== null && reach > 0) {
    if (reachCmp.direction === "up" && reachCmp.pctChange !== null) {
      highlights.push(`O alcance cresceu ${reachCmp.pctChange.toFixed(1)}% em relação ao período anterior (${(reach).toLocaleString("pt-BR")} pessoas).`);
    } else if (reachCmp.direction === "unavailable" || !prev) {
      highlights.push(`Alcance registrado: ${reach.toLocaleString("pt-BR")} pessoas no período de ${period === "7d" ? "7 dias" : period === "15d" ? "15 dias" : period === "30d" ? "30 dias" : period}.`);
    }
  }

  if (followers !== null && followers > 0) {
    if (followCmp.direction === "up" && followCmp.pctChange !== null) {
      highlights.push(`Seguidores cresceram ${followCmp.pctChange.toFixed(1)}% (${(followers).toLocaleString("pt-BR")} total).`);
    }
  }

  if (views !== null && views > 0) {
    if (viewsCmp.direction === "up" && viewsCmp.pctChange !== null && viewsCmp.pctChange > 10) {
      highlights.push(`Impressões/visualizações cresceram ${viewsCmp.pctChange.toFixed(1)}% — conteúdo com maior distribuição orgânica.`);
    }
  }

  if (clicks !== null && clicks > 0 && clicksCmp.direction === "up") {
    highlights.push(`Cliques no site aumentaram — sinal de intenção de conversão em crescimento.`);
  }

  // ── Warnings ──────────────────────────────────────────────────────────────

  if (reachCmp.direction === "down" && reachCmp.pctChange !== null && reachCmp.pctChange < -10) {
    warnings.push(`Alcance caiu ${Math.abs(reachCmp.pctChange).toFixed(1)}% em relação ao período anterior. Verifique frequência de publicação e engajamento nos posts recentes.`);
  }

  if (views !== null && views > 0 && (profileViews ?? 0) === 0 && reach !== null && reach > 500) {
    warnings.push(`Alto alcance sem visitas ao perfil — o conteúdo não está gerando interesse suficiente para que o público explore o perfil.`);
  }

  if (viewsCmp.direction === "up" && viewsCmp.pctChange !== null && reachCmp.direction === "down") {
    warnings.push(`Impressões cresceram, mas o alcance caiu — os mesmos seguidores estão vendo o conteúdo repetidas vezes. Atraia novos públicos.`);
  }

  if (reach !== null && reach > 0 && clicks === 0 && profileViews !== null && profileViews > 0) {
    warnings.push(`${profileViews.toLocaleString("pt-BR")} visita${profileViews === 1 ? "" : "s"} ao perfil, mas zero cliques no site — revise o link da bio e o CTA.`);
  }

  // ── Opportunities ─────────────────────────────────────────────────────────

  if (profileViews !== null && profileViews > 0 && clicks !== null && clicks / profileViews < 0.03) {
    const convRate = ((clicks / profileViews) * 100).toFixed(1);
    opportunities.push(`Taxa de conversão perfil→site: ${convRate}% — abaixo de 3%. Uma oferta clara na bio pode dobrar os cliques.`);
  }

  if (reach !== null && reach > 0 && views !== null && views > 0) {
    const freqEstimate = views / reach;
    if (freqEstimate < 1.5) {
      opportunities.push(`Frequência estimada baixa (${freqEstimate.toFixed(1)}x). Aumentar cadência de publicação pode ampliar impressões sem custo.`);
    }
  }

  if (followCmp.direction !== "unavailable" && followCmp.pctChange !== null && followCmp.pctChange >= 0 && reach !== null && reach > (followers ?? 0) * 3) {
    opportunities.push(`Alcance ${followers ? String(Math.round(reach / followers)) + "x" : ""} maior que a base de seguidores — conteúdo está atingindo novos públicos. Hora de converter em seguidores.`);
  }

  // ── Recommended actions ────────────────────────────────────────────────────

  if (reach === null || reach === 0) {
    recommendedActions.push("Verifique se a Página ou conta Instagram está vinculada corretamente em Conexões.");
  }

  if (clicks === 0 && reach !== null && reach > 0) {
    recommendedActions.push("Adicione um CTA claro com link rastreável para medir conversão de conteúdo.");
  }

  if (reachCmp.direction === "down") {
    recommendedActions.push("Revise a frequência e o horário de publicação. Teste novos formatos (Reels/Carrossel) para recuperar alcance.");
  }

  if (highlights.length === 0 && warnings.length === 0) {
    recommendedActions.push("Continue monitorando os dados a cada período para identificar tendências de crescimento.");
  }

  // ── Suggestions ───────────────────────────────────────────────────────────

  if (reach !== null && reach > 0 && clicks === 0) {
    // High: current metric confirmed, recommendation directly tied to observed gap
    suggestions.push({
      title: "Adicionar CTA rastreável",
      category: "engagement",
      reason: `Alcance de ${reach.toLocaleString("pt-BR")} pessoas sem nenhum clique no site registrado.`,
      action: "Inclua um link com UTM na bio e adicione CTAs diretos nos posts para direcionar tráfego.",
      expectedImpact: "Início de rastreamento de conversões orgânicas.",
      confidence: "high",
    });
  }

  if (reachCmp.direction !== "unavailable") {
    // Medium: general best-practice, not tied to a specific observed delta
    suggestions.push({
      title: "Priorizar Reels no próximo ciclo",
      category: "format",
      reason: "Reels tendem a ter maior distribuição orgânica no algoritmo atual do Instagram.",
      action: "Produza 2 Reels curtos (15-30s) com foco em alcance orgânico no próximo período.",
      expectedImpact: "Aumento estimado de 20-40% no alcance sem custo adicional.",
      confidence: "medium",
    });
  }

  if (profileViews !== null && profileViews > 100) {
    // High: metric confirmed + conversion bottleneck identified
    suggestions.push({
      title: "Otimizar bio para conversão",
      category: "engagement",
      reason: `${profileViews.toLocaleString("pt-BR")} visitas ao perfil no período — a bio é o ponto crítico de conversão.`,
      action: "Atualize a bio com uma oferta clara, link de WhatsApp ou página de destino e CTA direto.",
      expectedImpact: "Aumento na taxa de conversão perfil→ação.",
      confidence: "high",
    });
  }

  if (viewsCmp.direction === "up" || reachCmp.direction === "up") {
    // High: two-period comparison confirmed upward trend
    suggestions.push({
      title: "Manter cadência de publicação",
      category: "frequency",
      reason: "Métricas de distribuição em crescimento — consistência é o principal fator de manutenção.",
      action: "Mantenha pelo menos 3-5 publicações semanais para preservar o momento atual.",
      expectedImpact: "Manutenção ou aceleração da curva de crescimento.",
      confidence: "high",
    });
  }

  return {
    highlights:   highlights.length   > 0 ? highlights   : ["Dados coletados para o período selecionado."],
    warnings:     warnings.length     > 0 ? warnings      : [],
    opportunities: opportunities.length > 0 ? opportunities : [],
    recommendedActions: recommendedActions.length > 0 ? recommendedActions : ["Acompanhe os dados no próximo período."],
    suggestions,
    disclaimer: "Análise baseada nos dados disponíveis. Atribuição direta exige cupom, UTM ou link rastreável.",
  };
}

// ── DeterministicMarketingProvider ────────────────────────────────────────────

export class DeterministicMarketingProvider implements MarketingIntelligenceProvider {
  async generateSuggestions(context: MarketingContext): Promise<MarketingReportInsights> {
    return generateMarketingReportInsights(context);
  }
}

// ── ElrMarketingProvider (stub — future ELR integration) ──────────────────────

export class ElrMarketingProvider implements MarketingIntelligenceProvider {
  // Future: call ELR marketing intelligence API
  // Not implemented — no API key required, returns unavailable
  async generateSuggestions(_context: MarketingContext): Promise<MarketingReportInsights> {
    return {
      highlights: [],
      warnings: [],
      opportunities: [],
      recommendedActions: [],
      suggestions: [],
      disclaimer: "Análise baseada nos dados disponíveis.",
    };
  }
}

// Active provider
export const marketingProvider: MarketingIntelligenceProvider = new DeterministicMarketingProvider();

// ── BusinessInsightProvider — extension point for commercial ELR ───────────────

export interface BusinessInsightProvider {
  // Future: integrate OlaClick sales data with marketing for attribution
  generateBusinessInsights(salesContext: unknown): Promise<{ insights: string[]; disclaimer: string }>;
}

export class StubBusinessInsightProvider implements BusinessInsightProvider {
  async generateBusinessInsights(_salesContext: unknown) {
    return {
      insights: [],
      disclaimer: "Os dados de conteúdo e vendas representam o mesmo período. Atribuição direta exige cupom, UTM ou link rastreável.",
    };
  }
}
