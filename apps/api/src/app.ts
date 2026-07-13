import cors from "@fastify/cors";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import {
  DeductionOrchestrator,
  asCommandId,
  asEventId,
  createCustomInitialState,
  systemIdentity,
  type ActorAgent,
  type DeduceResult,
  type RecorderAgent,
  type WorldState,
} from "@sandtable/domain";
import { isAgentError, resolveAgents } from "@sandtable/agents";
import {
  openSqlitePersistence,
  type SqlitePersistence,
} from "@sandtable/persistence";
import { logStructured } from "./log.js";
import { ApiMetrics } from "./metrics.js";
import {
  DEFAULT_DEDUCE_RATE_LIMIT,
  SlidingWindowRateLimiter,
  validateDeduceBody,
} from "./security.js";

export interface BuildAppOptions {
  readonly dbPath?: string;
  readonly actor?: ActorAgent;
  readonly recorder?: RecorderAgent;
  readonly agentMode?: "stub" | "model";
  readonly corsOrigin?: boolean | string | string[];
  /** 推演速率限制；测试可调低。0 表示关闭。 */
  readonly deduceRateLimit?: number;
  /** 关闭结构化日志（测试安静）。 */
  readonly silentLog?: boolean;
}

export interface AppContext {
  readonly persistence: SqlitePersistence;
  readonly orchestrator: DeductionOrchestrator;
  readonly agentMode: "stub" | "model";
  readonly metrics: ApiMetrics;
  readonly rateLimiter: SlidingWindowRateLimiter;
}

const DEFAULT_SETTING = {
  title: "未命名世界",
  description: "这是一个等待用户定义的通用推演世界。",
} as const;

const validateSetting = (
  setting: { title?: unknown; description?: unknown } | undefined,
):
  | { ok: true; value: { title?: string; description: string } }
  | {
      ok: false;
      error: string;
    } => {
  if (typeof setting?.description !== "string" || !setting.description.trim()) {
    return { ok: false, error: "setting.description is required" };
  }
  if (setting.description.trim().length > 4000) {
    return {
      ok: false,
      error: "setting.description must be at most 4000 characters",
    };
  }
  if (setting.title !== undefined && typeof setting.title !== "string") {
    return { ok: false, error: "setting.title must be a string" };
  }
  if (typeof setting.title === "string" && setting.title.trim().length > 120) {
    return { ok: false, error: "setting.title must be at most 120 characters" };
  }
  return {
    ok: true,
    value: {
      ...(typeof setting.title === "string" && setting.title.trim()
        ? { title: setting.title.trim() }
        : {}),
      description: setting.description.trim(),
    },
  };
};

const clientKey = (req: FastifyRequest): string => {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0]!.trim();
  }
  return req.ip || "unknown";
};

export async function buildApp(options: BuildAppOptions = {}): Promise<
  FastifyInstance & {
    readonly context: AppContext;
  }
> {
  const dbPath = options.dbPath ?? ":memory:";
  const persistence = openSqlitePersistence({
    path: dbPath,
    initialState: createCustomInitialState(DEFAULT_SETTING),
  });

  const resolved =
    options.actor !== undefined && options.recorder !== undefined
      ? {
          mode: options.agentMode ?? ("stub" as const),
          actor: options.actor,
          recorder: options.recorder,
        }
      : resolveAgents({
          ...(options.agentMode !== undefined
            ? { mode: options.agentMode }
            : {}),
        });

  let eventSeq = 0;
  const orchestrator = new DeductionOrchestrator({
    store: persistence.store,
    eventLog: persistence.eventLog,
    actor: resolved.actor,
    recorder: resolved.recorder,
    runInTransaction: persistence.runInTransaction,
    nextEventId: () => {
      eventSeq += 1;
      return asEventId(`event-${Date.now()}-${eventSeq}`);
    },
  });

  const metrics = new ApiMetrics();
  const rateLimit = options.deduceRateLimit ?? DEFAULT_DEDUCE_RATE_LIMIT;
  const rateLimiter = new SlidingWindowRateLimiter(
    rateLimit === 0 ? 1_000_000 : rateLimit,
  );

  const app = Fastify({
    logger: false,
    bodyLimit: 48 * 1024,
    requestIdHeader: "x-request-id",
    genReqId: () =>
      `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  });

  await app.register(cors, {
    origin: options.corsOrigin ?? true,
  });

  const log = (
    level: "info" | "warn" | "error",
    msg: string,
    extra?: Record<string, unknown>,
  ) => {
    if (options.silentLog) return;
    logStructured({ level, msg, ...extra });
  };

  // 安全响应头（CSP 最小：API 主要返回 JSON）
  app.addHook("onSend", async (_req, reply, payload) => {
    void reply.header("X-Content-Type-Options", "nosniff");
    void reply.header("X-Frame-Options", "DENY");
    void reply.header("Referrer-Policy", "no-referrer");
    void reply.header("Cache-Control", "no-store");
    return payload;
  });

  const context: AppContext = {
    persistence,
    orchestrator,
    agentMode: resolved.mode,
    metrics,
    rateLimiter,
  };
  Object.assign(app, { context });

  app.addHook("onClose", async () => {
    persistence.close();
  });

  app.get("/health", async () => ({
    status: "ok",
    system: systemIdentity.name,
    version: systemIdentity.protocolVersion,
  }));

  app.get("/ready", async (_req, reply) => {
    const storageOk = persistence.ping();
    if (!storageOk) {
      return reply.code(503).send({
        status: "not_ready",
        storage: "unavailable",
      });
    }
    return {
      status: "ready",
      storage: "ok",
      agentMode: context.agentMode,
      system: systemIdentity.name,
    };
  });

  app.get("/api/v1", async () => ({
    name: systemIdentity.name,
    stage: "technical-prototype",
    storage: "sqlite",
    agentMode: context.agentMode,
  }));

  app.get("/api/v1/metrics", async () => ({
    metrics: metrics.snapshot(),
  }));

  app.post<{
    Body: { setting?: { title?: unknown; description?: unknown } };
  }>("/api/v1/session/reset", async (req, reply) => {
    const validated = validateSetting(req.body?.setting);
    if (!validated.ok) {
      return reply.code(400).send({
        error: validated.error,
        code: "validation_error",
        retryable: false,
      });
    }
    const worldState = createCustomInitialState(validated.value);
    persistence.store.replace(worldState);
    persistence.db.exec("DELETE FROM events");
    log("info", "session_reset", {
      requestId: req.id,
      settingTitle: worldState.setting?.title ?? "未命名世界",
    });
    return {
      ok: true,
      worldState,
      events: [] as const,
    };
  });

  app.get(
    "/api/v1/world-state",
    async (): Promise<{ worldState: WorldState }> => ({
      worldState: persistence.store.getState(),
    }),
  );

  app.get("/api/v1/events", async () => ({
    events: persistence.eventLog.all(),
    length: persistence.eventLog.length,
  }));

  const enforceRateLimit = (
    req: FastifyRequest,
  ):
    | { ok: true }
    | { ok: false; status: 429; payload: Record<string, unknown> } => {
    if (rateLimit === 0) return { ok: true };
    const rl = rateLimiter.check(clientKey(req));
    if (!rl.allowed) {
      metrics.increment("deduceRateLimited");
      return {
        ok: false,
        status: 429,
        payload: {
          error: "rate limit exceeded for deduce",
          code: "rate_limited",
          retryable: true,
          retryAfterSec: rl.retryAfterSec,
        },
      };
    }
    return { ok: true };
  };

  const runDeduce = async (
    body: { commandId?: string; rewriteText?: string; submittedAt?: string },
    meta: { requestId: string },
  ): Promise<
    | { ok: true; result: DeduceResult }
    | { ok: false; status: number; payload: Record<string, unknown> }
  > => {
    metrics.increment("deduceTotal");

    const validated = validateDeduceBody(body ?? {});
    if (!validated.ok) {
      metrics.increment("deduceValidationError");
      return {
        ok: false,
        status: validated.status,
        payload: validated.payload,
      };
    }

    try {
      const result = await orchestrator.deduce({
        commandId: asCommandId(validated.commandId),
        rewrite: {
          text: validated.rewriteText,
          submittedAt: body.submittedAt ?? new Date().toISOString(),
        },
      });
      if (result.outcome === "applied") metrics.increment("deduceApplied");
      else metrics.increment("deduceDuplicate");
      log("info", "deduce_ok", {
        requestId: meta.requestId,
        outcome: result.outcome,
        commandId: validated.commandId,
        // 不记录 rewrite 全文，避免日志膨胀与注入内容外泄
        rewriteLen: validated.rewriteText.length,
      });
      return { ok: true, result };
    } catch (err: unknown) {
      metrics.increment("deduceFailed");
      if (isAgentError(err)) {
        log("warn", "deduce_agent_error", {
          requestId: meta.requestId,
          code: err.code,
          retryable: err.retryable,
          msg: err.message,
        });
        return {
          ok: false,
          status: err.retryable ? 503 : 422,
          payload: {
            error: err.message,
            code: err.code,
            retryable: err.retryable,
          },
        };
      }
      log("error", "deduce_unexpected", {
        requestId: meta.requestId,
        msg: err instanceof Error ? err.message : "unknown",
      });
      throw err;
    }
  };

  app.post<{
    Body: { commandId?: string; rewriteText?: string; submittedAt?: string };
  }>("/api/v1/deduce", async (req, reply) => {
    const rl = enforceRateLimit(req);
    if (!rl.ok) {
      void reply.header("Retry-After", String(rl.payload.retryAfterSec ?? 60));
      return reply.code(rl.status).send(rl.payload);
    }

    const out = await runDeduce(req.body ?? {}, { requestId: req.id });
    if (!out.ok) {
      return reply.code(out.status).send(out.payload);
    }
    return {
      outcome: out.result.outcome,
      event: out.result.event,
      worldState: out.result.worldState,
    };
  });

  app.post<{
    Body: { commandId?: string; rewriteText?: string; submittedAt?: string };
  }>("/api/v1/deduce/stream", async (req, reply) => {
    const rl = enforceRateLimit(req);
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    });

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    if (!rl.ok) {
      send("error", rl.payload);
      res.end();
      return;
    }

    send("progress", { phase: "accepted", message: "已接收改写" });
    send("progress", { phase: "deducing", message: "演员/记录员推演中…" });

    try {
      const out = await runDeduce(req.body ?? {}, { requestId: req.id });
      if (!out.ok) {
        send("error", out.payload);
        res.end();
        return;
      }
      send("progress", { phase: "committed", message: "已写回世界状态" });
      send("result", {
        outcome: out.result.outcome,
        event: out.result.event,
        worldState: out.result.worldState,
      });
    } catch (err: unknown) {
      send("error", {
        error: err instanceof Error ? err.message : "unknown error",
        retryable: true,
      });
    }
    res.end();
  });

  return app as unknown as FastifyInstance & { readonly context: AppContext };
}
