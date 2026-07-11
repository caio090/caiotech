// Interpretação estratégica determinística dos insights Meta.
// Sem LLM — regras baseadas em métricas reais do período.

export interface InsightsMetrics {
  reach?: number | null;
  views?: number | null;
  profile_views?: number | null;
  website_clicks?: number | null;
  followers_count?: number | null;
  page_impressions?: number | null;
  page_reach?: number | null;
}

export function generateInterpretation(metrics: InsightsMetrics): string[] {
  const lines: string[] = [];
  if (!metrics) return lines;

  const reach        = metrics.reach        ?? metrics.page_reach       ?? 0;
  const clicks       = metrics.website_clicks ?? 0;
  const profileViews = metrics.profile_views  ?? 0;
  const views        = metrics.views        ?? metrics.page_impressions ?? 0;

  if (reach > 0 && clicks === 0) {
    lines.push(
      `Alcance registrado (${reach.toLocaleString("pt-BR")}) com zero cliques no site — revise o CTA e o link na bio. (reach, website_clicks)`
    );
  } else if (reach > 0 && clicks > 0 && clicks / reach < 0.005) {
    const pct = ((clicks / reach) * 100).toFixed(2);
    lines.push(
      `Taxa de clique: ${pct}% (${clicks}/${reach.toLocaleString("pt-BR")}) — abaixo de 0,5% do alcance. Revise a oferta e o CTA. (website_clicks / reach)`
    );
  }

  if (profileViews > 0 && clicks === 0) {
    lines.push(
      `${profileViews.toLocaleString("pt-BR")} visita${profileViews === 1 ? "" : "s"} ao perfil sem cliques no site — revise o link e a oferta na bio. (profile_views, website_clicks)`
    );
  } else if (profileViews > 0 && clicks > 0 && clicks < profileViews * 0.03) {
    const pct = ((clicks / profileViews) * 100).toFixed(1);
    lines.push(
      `Conversão de visitas ao perfil: ${pct}% (${clicks}/${profileViews.toLocaleString("pt-BR")}) — abaixo de 3%. Revise bio e link de destino. (website_clicks / profile_views)`
    );
  }

  if (views > 0 && profileViews > 0 && profileViews / views > 0.15) {
    const pct = ((profileViews / views) * 100).toFixed(1);
    lines.push(
      `Sinal de interesse: ${pct}% das visualizações geraram visita ao perfil — proporção acima do limite de referência de 15%. (profile_views / views)`
    );
  }

  return lines;
}
