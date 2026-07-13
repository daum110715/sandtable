import { describe, expect, it } from "vitest";
import { ApiError } from "./client.js";

describe("ApiError", () => {
  it("marks 5xx as retryable by default", () => {
    const e = new ApiError(503, { error: "timeout", code: "timeout", retryable: true });
    expect(e.retryable).toBe(true);
    expect(e.code).toBe("timeout");
  });
});
