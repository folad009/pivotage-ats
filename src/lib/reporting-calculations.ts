import type { StageType } from "@prisma/client";

/** Canonical stage order for cross-job funnel and conversion metrics. */
export const FUNNEL_STAGE_TYPES: StageType[] = [
  "SOURCED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
  "HIRED",
];

export interface FunnelStageCount {
  stageType: StageType;
  stageName: string;
  count: number;
}

export interface StageConversion {
  fromStageType: StageType;
  toStageType: StageType;
  fromLabel: string;
  toLabel: string;
  fromCount: number;
  toCount: number;
  rate: number;
}

export interface TimeToHireStats {
  count: number;
  averageDays: number | null;
  medianDays: number | null;
}

export interface TimeToHireTrendPoint {
  period: string;
  averageDays: number;
  hireCount: number;
}

export interface HireDurationInput {
  applicationId: string;
  appliedAt: Date;
  hiredAt: Date;
}

export function computeMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

export function daysBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
}

/** Computes avg/median days from application to hire using fixed hire timestamps. */
export function computeTimeToHireStats(
  hires: HireDurationInput[],
): TimeToHireStats {
  if (hires.length === 0) {
    return { count: 0, averageDays: null, medianDays: null };
  }

  const durations = hires.map((hire) =>
    Math.max(0, daysBetween(hire.appliedAt, hire.hiredAt)),
  );
  const sum = durations.reduce((total, value) => total + value, 0);

  return {
    count: hires.length,
    averageDays: Math.round((sum / hires.length) * 10) / 10,
    medianDays: computeMedian(durations),
  };
}

/** Groups applications by their current pipeline stage for funnel visualization. */
export function computeFunnelCounts(
  applications: Array<{
    stageType: StageType;
    stageName: string;
  }>,
): FunnelStageCount[] {
  const counts = new Map<string, FunnelStageCount>();

  for (const application of applications) {
    const key = application.stageType;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        stageType: application.stageType,
        stageName: application.stageName,
        count: 1,
      });
    }
  }

  return FUNNEL_STAGE_TYPES.filter((type) => counts.has(type)).map(
    (type) => counts.get(type)!,
  );
}

/**
 * Computes conversion rates between consecutive funnel stage types based on
 * which stage types each application has reached in history.
 */
export function computeStageConversions(
  reachedByApplication: Map<string, Set<StageType>>,
): StageConversion[] {
  const reachedCounts = new Map<StageType, number>();
  for (const type of FUNNEL_STAGE_TYPES) {
    reachedCounts.set(type, 0);
  }

  for (const types of reachedByApplication.values()) {
    for (const type of FUNNEL_STAGE_TYPES) {
      if (types.has(type)) {
        reachedCounts.set(type, (reachedCounts.get(type) ?? 0) + 1);
      }
    }
  }

  const conversions: StageConversion[] = [];
  for (let i = 0; i < FUNNEL_STAGE_TYPES.length - 1; i++) {
    const fromStageType = FUNNEL_STAGE_TYPES[i]!;
    const toStageType = FUNNEL_STAGE_TYPES[i + 1]!;
    const fromCount = reachedCounts.get(fromStageType) ?? 0;
    const toCount = reachedCounts.get(toStageType) ?? 0;
    const rate = fromCount > 0 ? Math.round((toCount / fromCount) * 1000) / 10 : 0;

    conversions.push({
      fromStageType,
      toStageType,
      fromLabel: formatStageType(fromStageType),
      toLabel: formatStageType(toStageType),
      fromCount,
      toCount,
      rate,
    });
  }

  return conversions;
}

/** Monthly average time-to-hire for trend charts (bucket key = YYYY-MM). */
export function computeTimeToHireTrend(
  hires: HireDurationInput[],
): TimeToHireTrendPoint[] {
  const buckets = new Map<string, { totalDays: number; count: number }>();

  for (const hire of hires) {
    const period = `${hire.hiredAt.getUTCFullYear()}-${String(hire.hiredAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const days = Math.max(0, daysBetween(hire.appliedAt, hire.hiredAt));
    const bucket = buckets.get(period) ?? { totalDays: 0, count: 0 };
    bucket.totalDays += days;
    bucket.count += 1;
    buckets.set(period, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, bucket]) => ({
      period,
      averageDays: Math.round((bucket.totalDays / bucket.count) * 10) / 10,
      hireCount: bucket.count,
    }));
}

function formatStageType(type: StageType): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}
