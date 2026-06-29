import { describe, expect, it } from "vitest";

import { loginSchema } from "@/lib/validations/auth";
import {
  createApplicationSchema,
  rejectApplicationSchema,
} from "@/lib/validations/application";
import { createCandidateSchema } from "@/lib/validations/candidate";
import { createClientSchema } from "@/lib/validations/client";
import { gdprEraseCandidateSchema } from "@/lib/validations/compliance";
import { scheduleInterviewSchema } from "@/lib/validations/interview";
import { reportFiltersSchema } from "@/lib/validations/report";
import { upsertScorecardSchema } from "@/lib/validations/scorecard";

describe("loginSchema", () => {
  it("normalizes email and requires password", () => {
    expect(
      loginSchema.parse({ email: "Admin@Privotage.TEST", password: "x" }),
    ).toEqual({
      email: "admin@privotage.test",
      password: "x",
    });
  });

  it("rejects invalid email", () => {
    expect(() =>
      loginSchema.parse({ email: "not-an-email", password: "x" }),
    ).toThrow();
  });
});

describe("createCandidateSchema", () => {
  it("lowercases email and trims names", () => {
    expect(
      createCandidateSchema.parse({
        firstName: "  Jane ",
        lastName: " Doe ",
        email: "Jane@Example.COM",
      }),
    ).toMatchObject({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    });
  });

  it("rejects invalid linkedin URL", () => {
    expect(() =>
      createCandidateSchema.parse({
        firstName: "A",
        lastName: "B",
        email: "a@test.com",
        linkedinUrl: "not-a-url",
      }),
    ).toThrow();
  });
});

describe("createApplicationSchema", () => {
  it("requires candidate and job ids", () => {
    expect(() => createApplicationSchema.parse({ candidateId: "", jobId: "j1" })).toThrow();
  });

  it("coerces optional rating", () => {
    expect(
      createApplicationSchema.parse({
        candidateId: "c1",
        jobId: "j1",
        rating: "4",
      }),
    ).toMatchObject({ rating: 4 });
  });
});

describe("rejectApplicationSchema", () => {
  it("requires a non-empty reason", () => {
    expect(() =>
      rejectApplicationSchema.parse({
        applicationId: "a1",
        toStageId: "s1",
        reason: "   ",
      }),
    ).toThrow();
  });
});

describe("createClientSchema", () => {
  it("requires client name", () => {
    expect(() =>
      createClientSchema.parse({
        name: "",
        contactEmail: "talent@acme.test",
        status: "ACTIVE",
      }),
    ).toThrow();
  });
});

describe("scheduleInterviewSchema", () => {
  it("requires panel members and scheduled time", () => {
    expect(() =>
      scheduleInterviewSchema.parse({
        applicationId: "a1",
        type: "PHONE",
        scheduledAt: new Date(),
        durationMins: 60,
        panelUserIds: [],
      }),
    ).toThrow();
  });
});

describe("upsertScorecardSchema", () => {
  it("validates overall rating bounds", () => {
    expect(() =>
      upsertScorecardSchema.parse({
        interviewId: "i1",
        overall: 6,
        recommendation: "YES",
        criteria: { communication: 3 },
      }),
    ).toThrow();
  });
});

describe("reportFiltersSchema", () => {
  it("rejects inverted date ranges", () => {
    expect(() =>
      reportFiltersSchema.parse({
        from: new Date("2024-06-01"),
        to: new Date("2024-01-01"),
      }),
    ).toThrow();
  });

  it("defaults includeArchived to false", () => {
    expect(
      reportFiltersSchema.parse({
        from: new Date("2024-01-01"),
        to: new Date("2024-06-01"),
      }).includeArchived,
    ).toBe(false);
  });
});

describe("gdprEraseCandidateSchema", () => {
  it("requires exact ERASE confirmation", () => {
    expect(() =>
      gdprEraseCandidateSchema.parse({
        candidateId: "c1",
        confirmation: "erase",
      }),
    ).toThrow();

    expect(
      gdprEraseCandidateSchema.parse({
        candidateId: "c1",
        confirmation: "ERASE",
      }).confirmation,
    ).toBe("ERASE");
  });
});
