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
}

export interface AppContext {
  readonly persistence: SqlitePersistence;
  readonly orchestrator: DeductionOrchestrator;
  readonly agentMode: "stub" | "model";
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance & {
  readonly context: AppContext;
} {
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

  app.get("/api/v1/world-state", async (): Promise<{ worldState: WorldState }> => ({
    worldState: persistence.store.getState(),
  }));

  app.get("/api/v1/events", async () => ({
    events: persistence.eventLog.all(),
    length: persistence.eventLog.length,
  }));

  app.post<{
    Body: { commandId?: string; rewriteText?: string; submittedAt?: string };
  }>("/api/v1/deduce", async (req, reply) => {
    const commandId = req.body?.commandId;
    const rewriteText = req.body?.rewriteText;
    if (typeof commandId !== "string" || commandId.length === 0) {
      return reply.code(400).send({ error: "commandId is required" });
    }
    if (typeof rewriteText !== "string" || rewriteText.length === 0) {
      return reply.code(400).send({ error: "rewriteText is required" });
    }

    try {
      const result: DeduceResult = await orchestrator.deduce({
        commandId: asCommandId(commandId),
        rewrite: {
          text: rewriteText,
          submittedAt: req.body.submittedAt ?? new Date().toISOString(),
        },
      });

      return {
        outcome: result.outcome,
        event: result.event,
        worldState: result.worldState,
      };
    } catch (err: unknown) {
      if (isAgentError(err)) {
        return reply.code(err.retryable ? 503 : 422).send({
          error: err.message,
          code: err.code,
          retryable: err.retryable,
        });
      }
      throw err;
    }
  });

  return app as unknown as FastifyInstance & { readonly context: AppContext };
}
