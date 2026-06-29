import { describe, expect, it } from "vitest";

import { ForbiddenError } from "@/lib/errors";
import { createNoteSchema } from "@/lib/validations/note";
import {
  assertClientNoteType,
  parseMentionTokens,
} from "@/server/services/note.service";

describe("parseMentionTokens", () => {
  it("extracts email and name mentions", () => {
    expect(
      parseMentionTokens("Please review @Riley Recruiter and cc @recruiter@privotage.test"),
    ).toEqual(["Riley Recruiter", "recruiter@privotage.test"]);
  });

  it("deduplicates repeated mentions", () => {
    expect(parseMentionTokens("@Ada Admin ping @Ada Admin")).toEqual([
      "Ada Admin",
    ]);
  });
});

describe("assertClientNoteType", () => {
  it("rejects SYSTEM note type from clients", () => {
    expect(() => assertClientNoteType("SYSTEM")).toThrow(ForbiddenError);
  });

  it("rejects any client-supplied note type", () => {
    expect(() => assertClientNoteType("NOTE")).toThrow(ForbiddenError);
  });

  it("allows undefined type", () => {
    expect(() => assertClientNoteType(undefined)).not.toThrow();
  });
});

describe("createNoteSchema", () => {
  it("rejects forged type fields via strict parsing", () => {
    expect(() =>
      createNoteSchema.parse({
        applicationId: "app-1",
        body: "hello",
        type: "SYSTEM",
      }),
    ).toThrow();
  });
});
