import { describe, expect, it } from "vitest";

import { buildReportJobWhere } from "@/server/services/reporting.service";

describe("buildReportJobWhere", () => {
  it("scopes hiring managers to assigned jobs only", () => {
    const where = buildReportJobWhere(
      { id: "hm-1", role: "HIRING_MANAGER" },
      {},
    );

    expect(where).toHaveProperty("AND");
    const clauses = (where as { AND: unknown[] }).AND;
    expect(clauses.length).toBeGreaterThan(0);
  });

  it("does not add scope for admins", () => {
    const where = buildReportJobWhere({ id: "admin-1", role: "ADMIN" }, {});
    expect(where).toEqual({});
  });

  it("applies client and job filters", () => {
    const where = buildReportJobWhere(
      { id: "rec-1", role: "RECRUITER" },
      { clientId: "client-1", jobId: "job-1" },
    );

    expect(where).toEqual({
      AND: [{ clientId: "client-1" }, { id: "job-1" }],
    });
  });
});
