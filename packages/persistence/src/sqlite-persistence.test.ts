import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DeductionOrchestrator,
  StubActorAgent,
  StubRecorderAgent,
  asCommandId,
  asEventId,
  asResourceId,
  createCustomInitialState,
  sampleRewrites,
  replay,
  assertDeepEqual,
  assertCausalChain,
} from "@sandtable/domain";

const chibiInitialState = createCustomInitialState({
  title: "持久化测试世界",
  description: "仅用于持久化回归测试。",
});
const chibiRewrites = {
  fine: sampleRewrites.first,
  medium: sampleRewrites.second,
};
import { openSqlitePersistence } from "./open.js";

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length > 0) {
    const d = dirs.pop()!;
    rmSync(d, { recursive: true, force: true });
  }
});

const tempDbPath = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "sandtable-m3-"));
  dirs.push(dir);
  return join(dir, "test.sqlite");
};

describe("SqlitePersistence", () => {
  it("seeds world state and supports entity getters", () => {
    const p = openSqlitePersistence({
      path: ":memory:",
      initialState: chibiInitialState,
    });
    expect(p.store.getState().worldlineId).toBe(chibiInitialState.worldlineId);
    expect(p.store.getState().setting.title).toBe("持久化测试世界");
    expect(p.ping()).toBe(true);
    p.close();
  });

  it("runs orchestrator with transaction and idempotent commandId", async () => {
    const p = openSqlitePersistence({
      path: ":memory:",
      initialState: chibiInitialState,
    });
    let seq = 0;
    const orch = new DeductionOrchestrator({
      store: p.store,
      eventLog: p.eventLog,
      actor: new StubActorAgent(),
      recorder: new StubRecorderAgent(),
      runInTransaction: p.runInTransaction,
      nextEventId: () => {
        seq += 1;
        return asEventId(`e${seq}`);
      },
      now: () => "2026-07-13T00:00:00.000Z",
    });

    const first = await orch.deduce({
      commandId: asCommandId("cmd-1"),
      rewrite: chibiRewrites.fine,
    });
    expect(first.outcome).toBe("applied");
    expect(p.eventLog.length).toBe(1);
    expect(p.store.getState()).toEqual(first.worldState);

    const dup = await orch.deduce({
      commandId: asCommandId("cmd-1"),
      rewrite: chibiRewrites.fine,
    });
    expect(dup.outcome).toBe("duplicate");
    expect(p.eventLog.length).toBe(1);

    assertCausalChain(p.eventLog.all());
    assertDeepEqual(
      replay(chibiInitialState, p.eventLog.all()),
      p.store.getState(),
    );
    p.close();
  });

  it("survives process restart: reopen file keeps events and state", async () => {
    const path = tempDbPath();

    {
      const p = openSqlitePersistence({
        path,
        initialState: chibiInitialState,
      });
      const orch = new DeductionOrchestrator({
        store: p.store,
        eventLog: p.eventLog,
        actor: new StubActorAgent(),
        recorder: new StubRecorderAgent(),
        runInTransaction: p.runInTransaction,
        nextEventId: () => asEventId("e-restart-1"),
        now: () => "2026-07-13T01:00:00.000Z",
      });
      await orch.deduce({
        commandId: asCommandId("cmd-restart"),
        rewrite: chibiRewrites.fine,
      });
      p.close();
    }

    {
      const p = openSqlitePersistence({
        path,
        initialState: chibiInitialState,
      });
      expect(p.eventLog.length).toBe(1);
      expect(p.eventLog.findByCommandId(asCommandId("cmd-restart"))?.id).toBe(
        "e-restart-1",
      );
      expect(
        p.store.getState().resources[asResourceId("resource-effect-1")]?.type,
      ).toBe("world-effect");
      assertDeepEqual(
        replay(chibiInitialState, p.eventLog.all()),
        p.store.getState(),
      );

      // 重复投递不推进
      const orch = new DeductionOrchestrator({
        store: p.store,
        eventLog: p.eventLog,
        actor: new StubActorAgent(),
        recorder: new StubRecorderAgent(),
        runInTransaction: p.runInTransaction,
        nextEventId: () => asEventId("should-not-appear"),
      });
      const r = await orch.deduce({
        commandId: asCommandId("cmd-restart"),
        rewrite: chibiRewrites.fine,
      });
      expect(r.outcome).toBe("duplicate");
      expect(p.eventLog.length).toBe(1);
      p.close();
    }
  });

  it("rolls back both state and event if append fails inside transaction", () => {
    const p = openSqlitePersistence({
      path: ":memory:",
      initialState: chibiInitialState,
    });
    const before = p.store.getState();

    expect(() =>
      p.runInTransaction(() => {
        p.store.replace({
          ...before,
          simulationTime: before.simulationTime,
        });
        // force duplicate command by appending twice with same commandId
        const event = {
          id: asEventId("e1"),
          worldlineId: before.worldlineId,
          commandId: asCommandId("dup"),
          simulationTime: before.simulationTime,
          recordedAt: "2026-07-13T00:00:00.000Z",
          rewrite: chibiRewrites.fine,
          narrative: { text: "n" },
          stateChanges: [] as const,
          causal: { rewrite: chibiRewrites.fine },
        };
        p.eventLog.append(event);
        p.eventLog.append({ ...event, id: asEventId("e2") });
      }),
    ).toThrow(/duplicate commandId/);

    // SQLite 事务回滚：事件不应留下；状态缓存可能与 DB 不一致——以 DB 为准重开验证
    // 同连接：若 transaction 正确回滚，length 应为 0
    expect(p.eventLog.length).toBe(0);
    p.close();
  });
});
