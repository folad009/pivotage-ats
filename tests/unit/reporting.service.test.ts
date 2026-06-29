import { describe, expect, it } from "vitest";

import {
  computeFunnelCounts,
  computeMedian,
  computeStageConversions,
  computeTimeToHireStats,
  computeTimeToHireTrend,
  daysBetween,
} from "@/lib/reporting-calculations";

describe("computeMedian", () => {
  it("returns null for empty input", () => {
    expect(computeMedian([])).toBeNull();
  });

  it("returns the middle value for odd-length arrays", () => {
    expect(computeMedian([10, 30, 20])).toBe(20);
  });

  it("averages the two middle values for even-length arrays", () => {
    expect(computeMedian([10, 20, 30, 40])).toBe(25);
  });
});

describe("computeTimeToHireStats", () => {
  const hires = [
    {
      applicationId: "a1",
      appliedAt: new Date("2024-01-01T00:00:00.000Z"),
      hiredAt: new Date("2024-01-11T00:00:00.000Z"),
    },
    {
      applicationId: "a2",
      appliedAt: new Date("2024-01-01T00:00:00.000Z"),
      hiredAt: new Date("2024-01-21T00:00:00.000Z"),
    },
    {
      applicationId: "a3",
      appliedAt: new Date("2024-01-01T00:00:00.000Z"),
      hiredAt: new Date("2024-01-31T00:00:00.000Z"),
    },
  ];

  it("computes average and median days to hire from fixtures", () => {
    expect(computeTimeToHireStats(hires)).toEqual({
      count: 3,
      averageDays: 20,
      medianDays: 20,
    });
  });

  it("returns null averages when there are no hires", () => {
    expect(computeTimeToHireStats([])).toEqual({
      count: 0,
      averageDays: null,
      medianDays: null,
    });
  });
});

describe("daysBetween", () => {
  it("measures whole-day differences", () => {
    expect(
      daysBetween(
        new Date("2024-01-01T00:00:00.000Z"),
        new Date("2024-01-06T00:00:00.000Z"),
      ),
    ).toBe(5);
  });
});

describe("computeFunnelCounts", () => {
  it("orders funnel stages and aggregates counts", () => {
    const funnel = computeFunnelCounts([
      { stageType: "SCREENING", stageName: "Screening" },
      { stageType: "SOURCED", stageName: "Sourced" },
      { stageType: "SCREENING", stageName: "Screening" },
      { stageType: "INTERVIEW", stageName: "Phone Interview" },
    ]);

    expect(funnel).toEqual([
      { stageType: "SOURCED", stageName: "Sourced", count: 1 },
      { stageType: "SCREENING", stageName: "Screening", count: 2 },
      { stageType: "INTERVIEW", stageName: "Phone Interview", count: 1 },
    ]);
  });
});

describe("computeStageConversions", () => {
  it("computes conversion rates between consecutive stages", () => {
    const reached = new Map([
      ["app-1", new Set(["SOURCED", "SCREENING", "INTERVIEW"] as const)],
      ["app-2", new Set(["SOURCED", "SCREENING"] as const)],
      ["app-3", new Set(["SOURCED"] as const)],
    ]);

    const conversions = computeStageConversions(reached);
    const sourcedToScreening = conversions.find(
      (row) => row.fromStageType === "SOURCED",
    );

    expect(sourcedToScreening).toMatchObject({
      fromCount: 3,
      toCount: 2,
      rate: 66.7,
    });
  });
});

describe("computeTimeToHireTrend", () => {
  it("groups hires by month for trend charts", () => {
    const trend = computeTimeToHireTrend([
      {
        applicationId: "a1",
        appliedAt: new Date("2024-01-01T00:00:00.000Z"),
        hiredAt: new Date("2024-02-01T00:00:00.000Z"),
      },
      {
        applicationId: "a2",
        appliedAt: new Date("2024-01-15T00:00:00.000Z"),
        hiredAt: new Date("2024-02-15T00:00:00.000Z"),
      },
    ]);

    expect(trend).toEqual([
      { period: "2024-02", averageDays: 31, hireCount: 2 },
    ]);
  });
});
