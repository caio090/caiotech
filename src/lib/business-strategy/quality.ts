import type { SwotItem, SalesGoal } from "@/lib/motor-lokat/business-types";
import type {
  BusinessDnaProfile, EightPs, CompetitorProfile, BusinessSeasonalEvent,
  StrategyAreaQuality, StrategyDataQualitySummary, StrategyField,
} from "./types";

function pct(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

function summarizeFields(fields: Array<StrategyField<unknown>>): Omit<StrategyAreaQuality, "area"> {
  const total = fields.length;
  const confirmedCount = fields.filter((f) => f.confirmed).length;
  const missingCount = fields.filter((f) => f.source === "missing").length;
  const estimatedCount = fields.filter((f) => f.confidence === "estimated").length;
  const outdatedCount = 0;
  const divergentCount = fields.filter((f) => f.confidence === "divergent").length;
  return { completenessPct: pct(confirmedCount, total), confirmedCount, missingCount, estimatedCount, outdatedCount, divergentCount, totalCount: total };
}

export function computeStrategyDataQuality(
  dna: BusinessDnaProfile,
  eightPs: EightPs,
  swotItems: SwotItem[],
  competitors: CompetitorProfile[],
  goals: SalesGoal[],
  seasonality: BusinessSeasonalEvent[]
): StrategyDataQualitySummary {
  const dnaFields = Object.values(dna) as Array<StrategyField<unknown>>;
  const dnaQuality: StrategyAreaQuality = { area: "dna", ...summarizeFields(dnaFields) };

  const eightPValues = Object.values(eightPs);
  const eightPsFilled = eightPValues.filter((p) => p.text.trim() !== "").length;
  const eightPsQuality: StrategyAreaQuality = {
    area: "eight_ps",
    completenessPct: pct(eightPsFilled, eightPValues.length),
    confirmedCount: eightPsFilled,
    missingCount: eightPValues.length - eightPsFilled,
    estimatedCount: eightPValues.filter((p) => p.confidence === "estimated").length,
    outdatedCount: 0,
    divergentCount: eightPValues.filter((p) => p.confidence === "divergent").length,
    totalCount: eightPValues.length,
  };

  const realSwot = swotItems.filter((item) => !item.isExample);
  const swotConfirmed = realSwot.filter((item) => item.confirmed).length;
  const swotQuality: StrategyAreaQuality = {
    area: "swot",
    completenessPct: pct(swotConfirmed, Math.max(realSwot.length, 1)),
    confirmedCount: swotConfirmed,
    missingCount: 0,
    estimatedCount: realSwot.filter((item) => item.source === "estimated").length,
    outdatedCount: realSwot.filter((item) => item.status === "outdated").length,
    divergentCount: 0,
    totalCount: realSwot.length,
  };

  const realCompetitors = competitors.filter((c) => !c.isExample);
  const competitorsConfirmed = realCompetitors.filter((c) => c.status === "confirmed").length;
  const competitorsQuality: StrategyAreaQuality = {
    area: "competitors",
    completenessPct: pct(competitorsConfirmed, Math.max(realCompetitors.length, 1)),
    confirmedCount: competitorsConfirmed,
    missingCount: 0,
    estimatedCount: realCompetitors.filter((c) => c.confidence === "estimated").length,
    outdatedCount: realCompetitors.filter((c) => c.status === "outdated").length,
    divergentCount: realCompetitors.filter((c) => c.confidence === "divergent").length,
    totalCount: realCompetitors.length,
  };

  const positioningQuality: StrategyAreaQuality = {
    area: "positioning",
    completenessPct: dna.positioning.confirmed ? 100 : 0,
    confirmedCount: dna.positioning.confirmed ? 1 : 0,
    missingCount: dna.positioning.confirmed ? 0 : 1,
    estimatedCount: 0, outdatedCount: 0, divergentCount: 0, totalCount: 1,
  };

  const goalsConfigured = goals.filter((g) => g.goalValue !== 0).length;
  const goalsQuality: StrategyAreaQuality = {
    area: "goals",
    completenessPct: pct(goalsConfigured, Math.max(goals.length, 1)),
    confirmedCount: goalsConfigured,
    missingCount: goals.length - goalsConfigured,
    estimatedCount: 0, outdatedCount: 0, divergentCount: 0, totalCount: goals.length,
  };

  const seasonalityConfirmed = seasonality.filter((s) => s.confirmed).length;
  const seasonalityQuality: StrategyAreaQuality = {
    area: "seasonality",
    completenessPct: pct(seasonalityConfirmed, Math.max(seasonality.length, 1)),
    confirmedCount: seasonalityConfirmed,
    missingCount: seasonality.length - seasonalityConfirmed,
    estimatedCount: 0, outdatedCount: 0, divergentCount: 0, totalCount: seasonality.length,
  };

  const areas = [dnaQuality, eightPsQuality, swotQuality, competitorsQuality, positioningQuality, goalsQuality, seasonalityQuality];
  const overallCompletenessPct = Math.round(areas.reduce((sum, a) => sum + a.completenessPct, 0) / areas.length);
  const exampleItemsNotConfirmed = swotItems.filter((i) => i.isExample && !i.confirmed).length + competitors.filter((c) => c.isExample).length;

  return { overallCompletenessPct, areas, exampleItemsNotConfirmed };
}
