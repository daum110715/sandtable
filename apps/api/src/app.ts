import Fastify, { type FastifyInstance } from "fastify";
import {
  DeductionOrchestrator,
  StubActorAgent,
  StubRecorderAgent,
  asCommandId,
  asEventId,
  chibiInitialState,
  systemIdentity,
  type DeduceResult,
  type WorldState,
} from "@sandtable/domain";
import { openSqlitePersistence, type SqlitePersistence } from "@sandtable/persistence";

export interface BuildAppOptions {
  /** SQLite 路径；`:memory:` 或文件。默认内存，测试与无外部服务可用。 */
  readonly dbPath?: string;
}

export interface AppContext {
  readonly persistence: SqlitePersistence;
  readonly orchestrator: DeductionOrchestrator;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance & {
  readonly context: AppContext;
} {
  const dbPath = options.dbPath ?? ":memory:";
  const persistence = openSqlitePersistence({
    path: dbPath,
    initialState: chibiInitialState,
  });

  let eventSeq = 0;
  const orchestrator = new DeductionOrchestrator({
    store: persistence.store,
    eventLog: persistence.eventLog,
    actor: new StubActorAgent(),
    recorder: new StubRecorderAgent(),
    runInTransaction: persistence.runInTransaction,
    nextEventId: () => {
      eventSeq += 1;
      // 文件库跨重启：时间戳 + 序号，降低 id 冲突（1.0 单会话）
      return asEventId(`event-${Date.now()}-${eventSeq}`);
    },
  });

  const app = Fastify({ logger: false });
  const context: AppContext = { persistence, orchestrator };
  Object.assign(app, { context });

  app.addHook("onClose", async () => {
    persistence.close();
  });

  /** 存活：进程在响应即可，不探测存储。 */
  app.get("/health", async () => ({
    status: "ok",
    system: systemIdentity.name,
    version: systemIdentity.protocolVersion,
  }));

  /** 就绪：存储可读写探测。 */
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
      system: systemIdentity.name,
    };
  });

  app.get("/api/v1", async () => ({
    name: systemIdentity.name,
    stage: "technical-prototype",
    storage: "sqlite",
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
  });

  return app as unknown as FastifyInstance & { readonly context: AppContext };
}
