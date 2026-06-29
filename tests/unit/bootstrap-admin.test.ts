import { describe, expect, it } from "vitest";

import {
  bootstrapAdminSchema,
  parseBootstrapAdminEnv,
} from "@/lib/validations/bootstrap";

describe("bootstrapAdminSchema", () => {
  it("normalizes email and enforces minimum password length", () => {
    const result = bootstrapAdminSchema.parse({
      email: " Admin@Company.COM ",
      password: "twelve-chars",
      name: "Ada",
    });

    expect(result.email).toBe("admin@company.com");
    expect(result.name).toBe("Ada");
  });

  it("rejects short passwords", () => {
    expect(() =>
      bootstrapAdminSchema.parse({
        email: "admin@company.com",
        password: "short",
      }),
    ).toThrow();
  });
});

describe("parseBootstrapAdminEnv", () => {
  it("reads bootstrap vars from process env", () => {
    const result = parseBootstrapAdminEnv({
      BOOTSTRAP_ADMIN_EMAIL: "ops@privotage.test",
      BOOTSTRAP_ADMIN_PASSWORD: "secure-password-1",
    });

    expect(result.email).toBe("ops@privotage.test");
    expect(result.name).toBe("Administrator");
  });
});
