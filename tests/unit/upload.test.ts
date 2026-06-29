import { describe, expect, it } from "vitest";

import { ValidationError } from "@/lib/errors";
import {
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_BYTES,
  sanitizeFileName,
  validateUploadRequest,
} from "@/lib/upload";
import { findEmailConflict } from "@/server/services/candidate.service";

describe("validateUploadRequest", () => {
  it("accepts a valid PDF within size limit", () => {
    const result = validateUploadRequest({
      mimeType: "application/pdf",
      size: 1024,
    });
    expect(result.mimeType).toBe("application/pdf");
    expect(result.size).toBe(1024);
  });

  it("rejects empty files", () => {
    expect(() =>
      validateUploadRequest({ mimeType: "application/pdf", size: 0 }),
    ).toThrow(ValidationError);
  });

  it("rejects files over the size limit", () => {
    expect(() =>
      validateUploadRequest({
        mimeType: "application/pdf",
        size: MAX_RESUME_BYTES + 1,
      }),
    ).toThrow(ValidationError);
  });

  it("rejects disallowed mime types", () => {
    expect(() =>
      validateUploadRequest({ mimeType: "image/png", size: 1000 }),
    ).toThrow(ValidationError);
  });

  it("allows all resume mime types", () => {
    for (const mimeType of ALLOWED_RESUME_MIME_TYPES) {
      expect(() =>
        validateUploadRequest({ mimeType, size: 1000 }),
      ).not.toThrow();
    }
  });
});

describe("sanitizeFileName", () => {
  it("strips path segments", () => {
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe("passwd.pdf");
  });

  it("falls back when the name is empty after sanitization", () => {
    expect(sanitizeFileName("///")).toBe("resume");
  });
});

describe("findEmailConflict", () => {
  const pool = [
    { id: "c1", email: "alice@example.test" },
    { id: "c2", email: "bob@example.test" },
  ];

  it("returns undefined when email is unique", () => {
    expect(findEmailConflict("new@example.test", undefined, pool)).toBeUndefined();
  });

  it("detects duplicate email case-insensitively", () => {
    expect(findEmailConflict("ALICE@example.test", undefined, pool)).toBe("c1");
  });

  it("ignores the record being updated", () => {
    expect(findEmailConflict("alice@example.test", "c1", pool)).toBeUndefined();
  });
});
