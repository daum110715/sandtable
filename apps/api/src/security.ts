// DEV-029 安全基线：输入校验、速率限制、密钥脱敏（日志侧）。

export const MAX_REWRITE_CHARS = 4_000;
export const MAX_COMMAND_ID_CHARS = 128;
/** 默认：每 IP 每分钟最多 N 次推演类请求。 */
export const DEFAULT_DEDUCE_RATE_LIMIT = 30;
export const RATE_WINDOW_MS = 60_000;

const COMMAND_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

export type ValidationOk = { ok: true; commandId: string; rewriteText: string };
export type ValidationErr = {
  ok: false;
  status: 400;
  payload: { error: string; code: "validation_error" };
};

export const validateDeduceBody = (body: {
  commandId?: string;
  rewriteText?: string;
}): ValidationOk | ValidationErr => {
  const commandId = body.commandId;
  const rewriteText = body.rewriteText;

  if (typeof commandId !== "string" || commandId.length === 0) {
    return {
      ok: false,
      status: 400,
      payload: { error: "commandId is required", code: "validation_error" },
    };
  }
  if (
    commandId.length > MAX_COMMAND_ID_CHARS ||
    !COMMAND_ID_RE.test(commandId)
  ) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: "commandId must be 1–128 chars of [A-Za-z0-9._:-]",
        code: "validation_error",
      },
    };
  }
  if (typeof rewriteText !== "string" || rewriteText.trim().length === 0) {
    return {
      ok: false,
      status: 400,
      payload: { error: "rewriteText is required", code: "validation_error" },
    };
  }
  if (rewriteText.length > MAX_REWRITE_CHARS) {
    return {
      ok: false,
      status: 400,
      payload: {
        error: `rewriteText exceeds ${MAX_REWRITE_CHARS} characters`,
        code: "validation_error",
      },
    };
  }

  return { ok: true, commandId, rewriteText: rewriteText.trim() };
};

/** 日志脱敏：去掉 Bearer / sk- 形态密钥。 */
export const redactSecrets = (text: string): string =>
  text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9]{8,}\b/g, "sk-[REDACTED]")
    .replace(/DEEPSEEK_API_KEY\s*=\s*\S+/gi, "DEEPSEEK_API_KEY=[REDACTED]");

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSec: number;
}

export class SlidingWindowRateLimiter {
  readonly #limit: number;
  readonly #windowMs: number;
  readonly #buckets = new Map<string, number[]>();

  constructor(limit = DEFAULT_DEDUCE_RATE_LIMIT, windowMs = RATE_WINDOW_MS) {
    this.#limit = limit;
    this.#windowMs = windowMs;
  }

  check(key: string, now = Date.now()): RateLimitResult {
    const cutoff = now - this.#windowMs;
    const prev = this.#buckets.get(key) ?? [];
    const recent = prev.filter((t) => t > cutoff);
    if (recent.length >= this.#limit) {
      this.#buckets.set(key, recent);
      const oldest = recent[0] ?? now;
      const retryAfterSec = Math.max(
        1,
        Math.ceil((oldest + this.#windowMs - now) / 1000),
      );
      return { allowed: false, remaining: 0, retryAfterSec };
    }
    recent.push(now);
    this.#buckets.set(key, recent);
    return {
      allowed: true,
      remaining: this.#limit - recent.length,
      retryAfterSec: 0,
    };
  }

  /** 测试用：清空 */
  reset(): void {
    this.#buckets.clear();
  }
}
