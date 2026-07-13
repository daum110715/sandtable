import type {
  ApiErrorBody,
  DeduceSuccess,
  DeductionEvent,
  Scenario,
  WorldState,
} from "./types.js";

const base = () => (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly retryable: boolean;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error ?? `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.retryable = body.retryable ?? status >= 500;
    if (body.code !== undefined) this.code = body.code;
  }
}

const json = async <T>(res: Response): Promise<T> => {
  const body = (await res.json().catch(() => ({}))) as T & ApiErrorBody;
  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body;
};

export const fetchScenarios = async (): Promise<readonly Scenario[]> => {
  const res = await fetch(`${base()}/api/v1/scenarios`);
  const data = await json<{ scenarios: Scenario[] }>(res);
  return data.scenarios;
};

export const fetchWorldState = async (): Promise<WorldState> => {
  const res = await fetch(`${base()}/api/v1/world-state`);
  const data = await json<{ worldState: WorldState }>(res);
  return data.worldState;
};

export const fetchEvents = async (): Promise<readonly DeductionEvent[]> => {
  const res = await fetch(`${base()}/api/v1/events`);
  const data = await json<{ events: DeductionEvent[] }>(res);
  return data.events;
};

export const resetSession = async (scenarioId: string): Promise<WorldState> => {
  const res = await fetch(`${base()}/api/v1/session/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  });
  const data = await json<{ worldState: WorldState }>(res);
  return data.worldState;
};

export type ProgressPhase = "accepted" | "deducing" | "committed";

export interface StreamHandlers {
  onProgress?: (phase: ProgressPhase, message: string) => void;
  onResult?: (result: DeduceSuccess) => void;
  onError?: (err: ApiError) => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** DEV-027：可重试错误最多再试 attempts 次（含首次），同一 commandId 保证幂等。 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: { attempts?: number; onRetry?: (err: ApiError, attempt: number) => void } = {},
): Promise<T> => {
  const attempts = options.attempts ?? 2;
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!(e instanceof ApiError) || !e.retryable || i === attempts) throw e;
      options.onRetry?.(e, i);
      await sleep(Math.min(1000 * i, 3000));
    }
  }
  throw last;
};

/** DEV-023 SSE 推演；失败时回退普通 POST。 */
export const deduceStreamOnce = async (
  input: { commandId: string; rewriteText: string },
  handlers: StreamHandlers = {},
): Promise<DeduceSuccess> => {
  try {
    const res = await fetch(`${base()}/api/v1/deduce/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(input),
    });

    if (!res.ok || !res.body) {
      return deduceOnce(input);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: DeduceSuccess | undefined;
    let streamError: ApiError | undefined;

    const handleBlock = (block: string) => {
      const lines = block.split("\n");
      let event = "message";
      const dataLines: string[] = [];
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length === 0) return;
      const data = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
      if (event === "progress") {
        handlers.onProgress?.(
          data.phase as ProgressPhase,
          typeof data.message === "string" ? data.message : "",
        );
      } else if (event === "result") {
        result = data as unknown as DeduceSuccess;
        handlers.onResult?.(result);
      } else if (event === "error") {
        const status =
          data.code === "rate_limited" ? 429 : data.code === "validation_error" ? 400 : 503;
        streamError = new ApiError(status, data as ApiErrorBody);
        handlers.onError?.(streamError);
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (part.trim()) handleBlock(part);
      }
    }
    if (buffer.trim()) handleBlock(buffer);

    if (streamError) throw streamError;
    if (!result) throw new ApiError(502, { error: "SSE ended without result", retryable: true });
    return result;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return deduceOnce(input);
  }
};

/** 带一次自动重试的推演（同一 commandId）。 */
export const deduceStream = async (
  input: { commandId: string; rewriteText: string },
  handlers: StreamHandlers = {},
): Promise<DeduceSuccess> =>
  withRetry(() => deduceStreamOnce(input, handlers), {
    attempts: 2,
    onRetry: (_err, attempt) => {
      handlers.onProgress?.("deducing", `网络或模型繁忙，自动重试（${attempt}）…`);
    },
  });

export const deduceOnce = async (input: {
  commandId: string;
  rewriteText: string;
}): Promise<DeduceSuccess> => {
  const res = await fetch(`${base()}/api/v1/deduce`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return json<DeduceSuccess>(res);
};

export const newCommandId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
