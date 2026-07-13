import { describe, expect, it } from "vitest";
import { ApiMetrics } from "./metrics.js";

describe("ApiMetrics", () => {
  it("starts with all counters at zero", () => {
    const m = new ApiMetrics();
    expect(m.snapshot()).toEqual({
      deduceTotal: 0,
      deduceApplied: 0,
      deduceDuplicate: 0,
      deduceFailed: 0,
      deduceRateLimited: 0,
      deduceValidationError: 0,
    });
  });

  it("increments individual fields", () => {
    const m = new ApiMetrics();
    m.increment("deduceTotal");
    m.increment("deduceApplied");
    m.increment("deduceApplied");
    const snap = m.snapshot();
    expect(snap.deduceTotal).toBe(1);
    expect(snap.deduceApplied).toBe(2);
    expect(snap.deduceDuplicate).toBe(0);
  });

  it("increments all fields independently", () => {
    const m = new ApiMetrics();
    m.increment("deduceTotal");
    m.increment("deduceApplied");
    m.increment("deduceDuplicate");
    m.increment("deduceFailed");
    m.increment("deduceRateLimited");
    m.increment("deduceValidationError");
    const snap = m.snapshot();
    expect(snap.deduceTotal).toBe(1);
    expect(snap.deduceApplied).toBe(1);
    expect(snap.deduceDuplicate).toBe(1);
    expect(snap.deduceFailed).toBe(1);
    expect(snap.deduceRateLimited).toBe(1);
    expect(snap.deduceValidationError).toBe(1);
  });

  it("snapshot returns a copy", () => {
    const m = new ApiMetrics();
    m.increment("deduceTotal");
    const snap1 = m.snapshot();
    m.increment("deduceTotal");
    const snap2 = m.snapshot();
    expect(snap1.deduceTotal).toBe(1);
    expect(snap2.deduceTotal).toBe(2);
  });
});
