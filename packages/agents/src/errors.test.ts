import { describe, expect, it } from "vitest";
import { AgentError, isAgentError } from "./errors.js";

describe("AgentError", () => {
  it("sets code, message, and name", () => {
    const err = new AgentError("timeout", "request timed out");
    expect(err.code).toBe("timeout");
    expect(err.message).toBe("request timed out");
    expect(err.name).toBe("AgentError");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AgentError);
  });

  it("supports all error codes", () => {
    const codes = [
      "timeout",
      "rejected",
      "invalid_output",
      "network",
      "config",
    ] as const;
    for (const code of codes) {
      const err = new AgentError(code, "test");
      expect(err.code).toBe(code);
    }
  });

  it("timeout is retryable by default", () => {
    const err = new AgentError("timeout", "slow");
    expect(err.retryable).toBe(true);
  });

  it("network is retryable by default", () => {
    const err = new AgentError("network", "fail");
    expect(err.retryable).toBe(true);
  });

  it("rejected is not retryable by default", () => {
    const err = new AgentError("rejected", "denied");
    expect(err.retryable).toBe(false);
  });

  it("invalid_output is not retryable by default", () => {
    const err = new AgentError("invalid_output", "bad");
    expect(err.retryable).toBe(false);
  });

  it("config is not retryable by default", () => {
    const err = new AgentError("config", "missing key");
    expect(err.retryable).toBe(false);
  });

  it("explicit retryable overrides default", () => {
    const err = new AgentError("timeout", "slow", { retryable: false });
    expect(err.retryable).toBe(false);
  });

  it("chains cause when provided", () => {
    const original = new Error("root");
    const err = new AgentError("network", "wrapped", { cause: original });
    expect(err.cause).toBe(original);
  });

  it("has no cause when omitted", () => {
    const err = new AgentError("config", "no cause");
    expect(err.cause).toBeUndefined();
  });
});

describe("isAgentError", () => {
  it("returns true for AgentError instances", () => {
    expect(isAgentError(new AgentError("timeout", "x"))).toBe(true);
  });

  it("returns false for plain Error", () => {
    expect(isAgentError(new Error("x"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isAgentError(null)).toBe(false);
    expect(isAgentError(undefined)).toBe(false);
    expect(isAgentError("string")).toBe(false);
    expect(isAgentError(42)).toBe(false);
  });
});
