import { describe, expect, it, vi } from "vitest";
import { ApiError, withRetry } from "./client.js";

describe("ApiError", () => {
  it("marks 5xx as retryable by default", () => {
    const e = new ApiError(503, {
      error: "timeout",
      code: "timeout",
      retryable: true,
    });
    expect(e.retryable).toBe(true);
    expect(e.code).toBe("timeout");
  });
});

describe("withRetry", () => {
  it("retries retryable errors then succeeds", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      n += 1;
      if (n === 1) throw new ApiError(503, { error: "slow", retryable: true });
      return "ok";
    });
    await expect(withRetry(fn, { attempts: 2 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable", async () => {
    const fn = vi.fn(async () => {
      throw new ApiError(422, { error: "bad", retryable: false });
    });
    await expect(withRetry(fn, { attempts: 3 })).rejects.toMatchObject({
      status: 422,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
