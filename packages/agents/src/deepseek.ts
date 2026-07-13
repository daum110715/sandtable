// DeepSeek OpenAI 兼容客户端（D014）。仅服务端使用密钥。

import { AgentError } from "./errors.js";
import type {
  LlmClient,
  LlmCompleteRequest,
  LlmCompleteResult,
} from "./llm.js";

export interface DeepSeekClientOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly model?: string;
  readonly defaultTimeoutMs?: number;
  /** 可注入 fetch（测试）。 */
  readonly fetchImpl?: typeof fetch;
}

/** OpenAI 兼容根路径须含 `/v1`，否则部分网关会 403。 */
const DEFAULT_BASE = "https://api.deepseek.com/v1";
const DEFAULT_MODEL = "deepseek-v4-flash";

/**
 * 规范化 base URL：去尾斜杠。
 * OpenAI 兼容网关（含 api.b.ai、api.deepseek.com）必须带 `/v1`，
 * 否则会 403：仅允许 /v1/chat/completions 等推理路径。
 * 已含 `/vN` 或 `/anthropic` 的自定义网关原样保留。
 */
export const normalizeDeepSeekBaseUrl = (raw: string): string => {
  const base = raw.trim().replace(/\/+$/, "");
  if (!base) return DEFAULT_BASE;
  if (/\/v\d+(?:\/|$)/i.test(base) || /\/anthropic$/i.test(base)) {
    return base;
  }
  return `${base}/v1`;
};

export class DeepSeekClient implements LlmClient {
  readonly provider = "deepseek";
  readonly model: string;
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #defaultTimeoutMs: number;
  readonly #fetch: typeof fetch;

  constructor(options: DeepSeekClientOptions) {
    if (!options.apiKey) {
      throw new AgentError("config", "DEEPSEEK_API_KEY is empty");
    }
    this.#apiKey = options.apiKey;
    this.#baseUrl = normalizeDeepSeekBaseUrl(options.baseUrl ?? DEFAULT_BASE);
    this.model = options.model ?? DEFAULT_MODEL;
    this.#defaultTimeoutMs = options.defaultTimeoutMs ?? 60_000;
    this.#fetch = options.fetchImpl ?? fetch;
  }

  async complete(req: LlmCompleteRequest): Promise<LlmCompleteResult> {
    const timeoutMs = req.timeoutMs ?? this.#defaultTimeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const body: Record<string, unknown> = {
        model: this.model,
        messages: req.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      };
      if (req.json) {
        body.response_format = { type: "json_object" };
      }

      const res = await this.#fetch(`${this.#baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.#apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const retryable = res.status === 429 || res.status >= 500;
        throw new AgentError(
          res.status === 401 || res.status === 403 ? "rejected" : "network",
          `DeepSeek HTTP ${res.status}: ${errText.slice(0, 200)}`,
          { retryable },
        );
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
        model?: string;
      };
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== "string" || text.length === 0) {
        throw new AgentError(
          "invalid_output",
          "DeepSeek returned empty content",
          {
            retryable: true,
          },
        );
      }
      return { text, model: data.model ?? this.model };
    } catch (e) {
      if (e instanceof AgentError) throw e;
      if (e instanceof Error && e.name === "AbortError") {
        throw new AgentError(
          "timeout",
          `DeepSeek timed out after ${timeoutMs}ms`,
          {
            retryable: true,
            cause: e,
          },
        );
      }
      throw new AgentError(
        "network",
        e instanceof Error ? e.message : "DeepSeek request failed",
        {
          retryable: true,
          cause: e,
        },
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

export const createDeepSeekClientFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
  overrides?: Partial<DeepSeekClientOptions>,
): DeepSeekClient | undefined => {
  const apiKey = env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return undefined;
  return new DeepSeekClient({
    apiKey,
    ...(env.DEEPSEEK_BASE_URL !== undefined
      ? { baseUrl: env.DEEPSEEK_BASE_URL }
      : {}),
    ...(env.DEEPSEEK_MODEL !== undefined ? { model: env.DEEPSEEK_MODEL } : {}),
    ...(env.SANDTABLE_LLM_TIMEOUT_MS !== undefined
      ? { defaultTimeoutMs: Number(env.SANDTABLE_LLM_TIMEOUT_MS) }
      : {}),
    ...overrides,
  });
};
