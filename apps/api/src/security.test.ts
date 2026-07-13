import { describe, expect, it } from "vitest";
import {
  SlidingWindowRateLimiter,
  redactSecrets,
  validateDeduceBody,
  MAX_REWRITE_CHARS,
} from "./security.js";

describe("validateDeduceBody", () => {
  it("accepts normal input", () => {
    const r = validateDeduceBody({
      commandId: "cmd-1",
      rewriteText: "  那天江上刮西北风  ",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rewriteText).toBe("那天江上刮西北风");
  });

  it("rejects empty rewrite", () => {
    const r = validateDeduceBody({ commandId: "a", rewriteText: "   " });
    expect(r.ok).toBe(false);
  });

  it("rejects oversize rewrite", () => {
    const r = validateDeduceBody({
      commandId: "a",
      rewriteText: "x".repeat(MAX_REWRITE_CHARS + 1),
    });
    expect(r.ok).toBe(false);
  });

  it("rejects bad commandId", () => {
    const r = validateDeduceBody({ commandId: "bad id!", rewriteText: "ok" });
    expect(r.ok).toBe(false);
  });
});

describe("redactSecrets", () => {
  it("redacts bearer and sk tokens", () => {
    const s = redactSecrets("Authorization: Bearer sk-abcdefghijklmnop and DEEPSEEK_API_KEY=secret123");
    expect(s).not.toContain("sk-abcdefghijklmnop");
    expect(s).not.toContain("secret123");
    expect(s).toContain("[REDACTED]");
  });
});

describe("SlidingWindowRateLimiter", () => {
  it("blocks after limit", () => {
    const lim = new SlidingWindowRateLimiter(2, 60_000);
    expect(lim.check("ip").allowed).toBe(true);
    expect(lim.check("ip").allowed).toBe(true);
    const third = lim.check("ip");
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });
});
