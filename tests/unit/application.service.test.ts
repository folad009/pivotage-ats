import { ApplicationStatus } from "@/lib/prisma";
import { describe, expect, it } from "vitest";

import { ForbiddenError, ValidationError } from "@/lib/errors";
import {
  assertApplicationMutable,
  computeMoveSideEffects,
  formatStageMoveNote,
} from "@/server/services/application.service";

describe("computeMoveSideEffects", () => {
  it("requires a reason when moving to REJECTED", () => {
    expect(() => computeMoveSideEffects("REJECTED")).toThrow(ValidationError);
    expect(() => computeMoveSideEffects("REJECTED", "   ")).toThrow(
      ValidationError,
    );
  });

  it("sets status REJECTED with trimmed reason", () => {
    expect(computeMoveSideEffects("REJECTED", "  Not a fit  ")).toEqual({
      status: ApplicationStatus.REJECTED,
      reason: "Not a fit",
    });
  });

  it("sets status HIRED when moving to a HIRED stage", () => {
    expect(computeMoveSideEffects("HIRED")).toEqual({
      status: ApplicationStatus.HIRED,
    });
  });

  it("keeps status ACTIVE for non-terminal stage types", () => {
    expect(computeMoveSideEffects("SCREENING")).toEqual({
      status: ApplicationStatus.ACTIVE,
    });
    expect(computeMoveSideEffects("INTERVIEW")).toEqual({
      status: ApplicationStatus.ACTIVE,
    });
  });
});

describe("assertApplicationMutable", () => {
  it("blocks moves on archived applications", () => {
    expect(() =>
      assertApplicationMutable(ApplicationStatus.ARCHIVED),
    ).toThrow(ForbiddenError);
  });

  it("allows active applications", () => {
    expect(() =>
      assertApplicationMutable(ApplicationStatus.ACTIVE),
    ).not.toThrow();
  });
});

describe("formatStageMoveNote", () => {
  it("formats a system note with optional reason", () => {
    expect(
      formatStageMoveNote({
        fromStageName: "Screening",
        toStageName: "Rejected",
        reason: "Skills mismatch",
      }),
    ).toBe("Moved from Screening to Rejected. Reason: Skills mismatch");
  });

  it("uses New when there is no from stage", () => {
    expect(
      formatStageMoveNote({
        fromStageName: null,
        toStageName: "Sourced",
      }),
    ).toBe("Moved from New to Sourced.");
  });
});
