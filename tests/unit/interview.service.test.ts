import { Recommendation } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { summarizeScorecards } from "@/lib/interview-summary";

describe("summarizeScorecards", () => {
  it("returns null for an empty list", () => {
    expect(summarizeScorecards([])).toBeNull();
  });

  it("aggregates average overall and dominant recommendation", () => {
    const summary = summarizeScorecards([
      { recommendation: Recommendation.YES, overall: 4 },
      { recommendation: Recommendation.STRONG_YES, overall: 5 },
      { recommendation: Recommendation.YES, overall: 3 },
    ]);

    expect(summary).toEqual({
      total: 3,
      averageOverall: 4,
      recommendationCounts: {
        STRONG_YES: 1,
        YES: 2,
        NO: 0,
        STRONG_NO: 0,
      },
      dominantRecommendation: Recommendation.YES,
    });
  });
});
