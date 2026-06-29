import { describe, expect, it } from "vitest";

import { ForbiddenError } from "@/lib/errors";
import { assertPanelMember } from "@/server/services/scorecard.service";

describe("assertPanelMember", () => {
  it("allows a panel member", () => {
    expect(() =>
      assertPanelMember({ id: "user-1", role: "HIRING_MANAGER" }, [
        "user-1",
        "user-2",
      ]),
    ).not.toThrow();
  });

  it("rejects a user not on the panel", () => {
    expect(() =>
      assertPanelMember({ id: "user-3", role: "HIRING_MANAGER" }, [
        "user-1",
        "user-2",
      ]),
    ).toThrow(ForbiddenError);
  });
});
