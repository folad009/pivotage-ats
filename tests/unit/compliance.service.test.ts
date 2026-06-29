import { ApplicationStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  deriveStatusOnRestore,
  EXCLUDE_ARCHIVED_FILTER,
} from "@/lib/compliance-rules";
import { buildReportApplicationWhere } from "@/server/services/reporting.service";

describe("deriveStatusOnRestore", () => {
  it("maps stage types to application status", () => {
    expect(deriveStatusOnRestore("HIRED")).toBe(ApplicationStatus.HIRED);
    expect(deriveStatusOnRestore("REJECTED")).toBe(ApplicationStatus.REJECTED);
    expect(deriveStatusOnRestore("SCREENING")).toBe(ApplicationStatus.ACTIVE);
    expect(deriveStatusOnRestore("INTERVIEW")).toBe(ApplicationStatus.ACTIVE);
  });
});

describe("EXCLUDE_ARCHIVED_FILTER", () => {
  it("excludes archived applications from active queries", () => {
    expect(EXCLUDE_ARCHIVED_FILTER).toEqual({
      status: { not: ApplicationStatus.ARCHIVED },
    });
  });
});

describe("buildReportApplicationWhere archived filter", () => {
  const actor = { id: "u1", role: "ADMIN" as const };
  const range = {
    from: new Date("2024-01-01"),
    to: new Date("2024-12-31"),
    includeArchived: false,
  };

  it("excludes archived applications by default", () => {
    const where = buildReportApplicationWhere(actor, range);
    expect(where.AND).toEqual(
      expect.arrayContaining([
        { status: { not: ApplicationStatus.ARCHIVED } },
      ]),
    );
  });

  it("includes archived applications when requested", () => {
    const excluded = buildReportApplicationWhere(actor, range);
    const included = buildReportApplicationWhere(actor, {
      ...range,
      includeArchived: true,
    });
    expect(JSON.stringify(excluded)).toContain('"not":"ARCHIVED"');
    expect(JSON.stringify(included)).not.toContain('"not":"ARCHIVED"');
  });
});
