import { describe, expect, it } from "vitest";
import { DomainError, isDomainError } from "./errors.js";

describe("DomainError", () => {
  it("sets code, message, and name", () => {
    const err = new DomainError("not_found", "entity missing");
    expect(err.code).toBe("not_found");
    expect(err.message).toBe("entity missing");
    expect(err.name).toBe("DomainError");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DomainError);
  });

  it("supports all error codes", () => {
    const codes = [
      "invariant_violation",
      "not_found",
      "duplicate",
      "invalid_state",
    ] as const;
    for (const code of codes) {
      const err = new DomainError(code, "test");
      expect(err.code).toBe(code);
    }
  });

  it("chains cause when provided", () => {
    const original = new Error("root cause");
    const err = new DomainError("invalid_state", "wrapped", {
      cause: original,
    });
    expect(err.cause).toBe(original);
  });

  it("has no cause when omitted", () => {
    const err = new DomainError("duplicate", "no cause");
    expect(err.cause).toBeUndefined();
  });
});

describe("isDomainError", () => {
  it("returns true for DomainError instances", () => {
    expect(isDomainError(new DomainError("not_found", "x"))).toBe(true);
  });

  it("returns false for plain Error", () => {
    expect(isDomainError(new Error("x"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isDomainError(null)).toBe(false);
    expect(isDomainError(undefined)).toBe(false);
    expect(isDomainError("string")).toBe(false);
    expect(isDomainError(42)).toBe(false);
  });
});
