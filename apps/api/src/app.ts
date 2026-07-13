import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import {
  DeductionOrchestrator,
  asCommandId,
  asEventId,
  chibiInitialState,
  systemIdentity,
  type ActorAgent,
  type DeduceResult,
  type RecorderAgent,
  type WorldState,
} from "@sandtable/domain";
import { isAgentError, resolveAgents } from "@sandtable/agents";
import { openSqlitePersistence, type SqlitePersistence } from "@sandtable/persistence";

export interface BuildAppOptions {
  /** SQLite 路径；`:memory:` 或文件。默认内存，测试与无外部服务可用。 */
  readonly dbPath?: string;
  /** 覆盖 Agent（测试注入）；默认 resolveAgents()。 */
  readonly actor?: ActorAgent;
  readonly recorder?: RecorderAgent;
  readonly agentMode?: "stub" | "model";
  /** CORS origin；默认 true（开发）。 */
  readonly corsOrigin?: boolean | string | string[];
}

export interface AppContext {
  readonly persistence: SqlitePersistence;
  readonly orchestrator: DeductionOrchestrator;
  readonly agentMode: "stub" | "model";
}

const SCENARIOS = [
  {
    id: "chibi",
    title: "赤壁之战",
    period: "建安十三年 · 公元 208 年冬",
    summary: "曹军南下，孙刘联军于赤壁对峙。自由改写风向、战局与人物去向。",
    kind: "preset" as const,
  },
  {
    id: "custom",
    title: "自定义背景",
    period: "由你指定",
    summary: "1.0 最小：以赤壁世界状态模板起步，自定义文字记入会话说明（非独立史料库）。",
    kind: "custom" as const,
  },
] as const;

export async function buildApp(options: BuildAppOptions = {}): Promise<
  FastifyInstance & {
    readonly context: AppContext;
  }
> {
  const dbPath = options.dbPath ?? ":memory:";
  const persistence = openSqlitePersistence({
    path: dbPath,
    initialState: chibiInitialState,
  });

  const resolved =
    options.actor !== undefined && options.recorder !== undefined
      ? {
          mode: options.agentMode ?? ("stub" as const),
          actor: options.actor,
          recorder: options.recorder,
        }
      : resolveAgents({
          ...(options.agentMode !== undefined ? { mode: options.agentMode } : {}),
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

  const app = Fastify({ logger: false });
  await app.register(cors, {
    origin: options.corsOrigin ?? true,
  });

  const context: AppContext = {
    persistence,
    orchestrator,
    agentMode: resolved.mode,
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

  app.get("/api/v1/scenarios", async () => ({
    scenarios: SCENARIOS,
  }));

  /** 重置为场景初始世界状态并清空事件（1.0 单会话重新开始）。 */
  app.post<{ Body: { scenarioId?: string } }>("/api/v1/session/reset", async (req) => {
    const scenarioId = req.body?.scenarioId ?? "chibi";
    // 1.0 仅赤壁有完整初始状态；custom 仍用赤壁模板
    void scenarioId;
    persistence.store.replace(chibiInitialState);
    // 清空事件：关闭后不支持；用新 persistence 不现实。直接删表行。
    persistence.db.exec("DELETE FROM events");
    return {
      ok: true,
      scenarioId: scenarioId === "custom" ? "custom" : "chibi",
      worldState: persistence.store.getState(),
      events: [] as const,
    };
  });

  app.get("/api/v1/world-state", async (): Promise<{ worldState: WorldState }> => ({
    worldState: persistence.store.getState(),
  }));

  app.get("/api/v1/events", async () => ({
    events: persistence.eventLog.all(),
    length: persistence.eventLog.length,
  }));

  const runDeduce = async (body: {
    commandId?: string;
    rewriteText?: string;
    submittedAt?: string;
  }): Promise<
    | { ok: true; result: DeduceResult }
    | { ok: false; status: number; payload: Record<string, unknown> }
  > => {
    const commandId = body.commandId;
    const rewriteText = body.rewriteText;
    if (typeof commandId !== "string" || commandId.length === 0) {
      return { ok: false, status: 400, payload: { error: "commandId is required" } };
    }
    if (typeof rewriteText !== "string" || rewriteText.length === 0) {
      return { ok: false, status: 400, payload: { error: "rewriteText is required" } };
    }

    try {
      const result = await orchestrator.deduce({
        commandId: asCommandId(commandId),
        rewrite: {
          text: rewriteText,
          submittedAt: body.submittedAt ?? new Date().toISOString(),
        },
      });
      return { ok: true, result };
    } catch (err: unknown) {
      if (isAgentError(err)) {
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
      throw err;
    }
  };

  app.post<{
    Body: { commandId?: string; rewriteText?: string; submittedAt?: string };
  }>("/api/v1/deduce", async (req, reply) => {
    const out = await runDeduce(req.body ?? {});
    if (!out.ok) {
      return reply.code(out.status).send(out.payload);
    }
    return {
      outcome: out.result.outcome,
      event: out.result.event,
      worldState: out.result.worldState,
    };
  });

  /**
   * DEV-023 最小 SSE：推演阶段进度 + 最终结果。
   * Content-Type: text/event-stream
   */
  app.post<{
    Body: { commandId?: string; rewriteText?: string; submittedAt?: string };
  }>("/api/v1/deduce/stream", async (req, reply) => {
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    send("progress", { phase: "accepted", message: "已接收改写" });
    send("progress", { phase: "deducing", message: "演员/记录员推演中…" });

    try {
      const out = await runDeduce(req.body ?? {});
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
