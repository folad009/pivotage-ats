import type { Recommendation } from "@prisma/client";

export interface ScorecardSummary {
  total: number;
  averageOverall: number;
  recommendationCounts: Record<Recommendation, number>;
  dominantRecommendation: Recommendation | null;
}

/** Aggregates scorecard recommendations for display on an application. */
export function summarizeScorecards(
  scorecards: Array<{ recommendation: Recommendation; overall: number }>,
): ScorecardSummary | null {
  if (scorecards.length === 0) return null;

  const recommendationCounts: Record<Recommendation, number> = {
    STRONG_YES: 0,
    YES: 0,
    NO: 0,
    STRONG_NO: 0,
  };

  let overallSum = 0;
  for (const scorecard of scorecards) {
    recommendationCounts[scorecard.recommendation]++;
    overallSum += scorecard.overall;
  }

  const dominantRecommendation = (
    Object.entries(recommendationCounts) as Array<[Recommendation, number]>
  ).reduce<[Recommendation | null, number]>(
    (best, [rec, count]) => (count > best[1] ? [rec, count] : best),
    [null, 0],
  )[0];

  return {
    total: scorecards.length,
    averageOverall: Math.round((overallSum / scorecards.length) * 10) / 10,
    recommendationCounts,
    dominantRecommendation,
  };
}
