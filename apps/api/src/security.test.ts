import { describe, expect, it } from "vitest";
import {
  SlidingWindowRateLimiter,
  redactSecrets,
  validateDeduceBody,
  MAX_REWRITE_CHARS,
  MAX_COMMAND_ID_CHARS,
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

  it("accepts commandId at max length", () => {
    const r = validateDeduceBody({
      commandId: "a".repeat(MAX_COMMAND_ID_CHARS),
      rewriteText: "ok",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects missing commandId", () => {
    const r = validateDeduceBody({ rewriteText: "ok" });
    expect(r.ok).toBe(false);
  });

  it("rejects empty commandId", () => {
    const r = validateDeduceBody({ commandId: "", rewriteText: "ok" });
    expect(r.ok).toBe(false);
  });

  it("rejects missing rewriteText", () => {
    const r = validateDeduceBody({ commandId: "cmd-1" });
    expect(r.ok).toBe(false);
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

  it("rejects commandId exceeding max length", () => {
    const r = validateDeduceBody({
      commandId: "a".repeat(MAX_COMMAND_ID_CHARS + 1),
      rewriteText: "ok",
    });
    expect(r.ok).toBe(false);
  });
});

describe("redactSecrets", () => {
  it("redacts bearer tokens", () => {
    const s = redactSecrets("Authorization: Bearer sk-abcdefghijklmnop");
    expect(s).not.toContain("sk-abcdefghijklmnop");
    expect(s).toContain("[REDACTED]");
  });

  it("redacts DEEPSEEK_API_KEY", () => {
    const s = redactSecrets("DEEPSEEK_API_KEY=secret123");
    expect(s).not.toContain("secret123");
    expect(s).toContain("[REDACTED]");
  });

  it("redacts sk- tokens", () => {
    const s = redactSecrets("using sk-abcdefgh12345678 for auth");
    expect(s).not.toContain("sk-abcdefgh12345678");
    expect(s).toContain("[REDACTED]");
  });

  it("leaves non-secret text unchanged", () => {
    const s = redactSecrets("normal text without secrets");
    expect(s).toBe("normal text without secrets");
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

  it("tracks different keys independently", () => {
    const lim = new SlidingWindowRateLimiter(1, 60_000);
    expect(lim.check("ip1").allowed).toBe(true);
    expect(lim.check("ip2").allowed).toBe(true);
    expect(lim.check("ip1").allowed).toBe(false);
  });

  it("resets all buckets", () => {
    const lim = new SlidingWindowRateLimiter(1, 60_000);
    lim.check("ip");
    expect(lim.check("ip").allowed).toBe(false);
    lim.reset();
    expect(lim.check("ip").allowed).toBe(true);
  });

  it("reports remaining count", () => {
    const lim = new SlidingWindowRateLimiter(3, 60_000);
    expect(lim.check("ip").remaining).toBe(2);
    expect(lim.check("ip").remaining).toBe(1);
    expect(lim.check("ip").remaining).toBe(0);
  });
});
