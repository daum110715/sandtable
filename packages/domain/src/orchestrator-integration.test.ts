// 编排验收：以 DeductionOrchestrator 为入口的改写-推演-写回-回溯链路。
// integration.test.ts 保留为协议/内核回归；本文件覆盖事务、幂等与编排语义。

import { describe, expect, it } from "vitest";
import { asCommandId, asEventId, asResourceId } from "./ids.js";
import {
  assertActorOutputIsStateless,
  assertAppendOnly,
  assertCausalChain,
  assertDeepEqual,
  assertStateChangesAreValid,
} from "./invariants.js";
import { replay } from "./state-core.js";
import { DeductionOrchestrator } from "./orchestrator.js";
import { InMemoryEventLog } from "./event-log.js";
import { InMemoryWorldStateStore } from "./world-state-store.js";
import {
  createCustomInitialState,
  sampleRewrites,
} from "./scenarios/custom.js";
import { StubActorAgent } from "./stubs/stub-actor.js";
import { StubRecorderAgent } from "./stubs/stub-recorder.js";

const chibiInitialState = createCustomInitialState({
  title: "编排集成测试世界",
  description: "仅用于通用推演编排集成测试。",
});
const chibiRewrites = { fine: sampleRewrites.first };

describe("orchestrator closed loop: rewrite -> deduce -> write -> replay", () => {
  it("satisfies exit criteria: full path, transaction, idempotency, invariants", async () => {
    const store = new InMemoryWorldStateStore(chibiInitialState);
    const eventLog = new InMemoryEventLog();
    let seq = 0;
    const orchestrator = new DeductionOrchestrator({
      store,
      eventLog,
      actor: new StubActorAgent(),
      recorder: new StubRecorderAgent(),
      nextEventId: () => {
        seq += 1;
        return asEventId(`m2-e${seq}`);
      },
      now: () => "2026-07-13T12:00:00.000Z",
    });

    const first = await orchestrator.deduce({
      commandId: asCommandId("m2-cmd-1"),
      rewrite: chibiRewrites.fine,
    });
    expect(first.outcome).toBe("applied");
    expect(first.actorOutput).toBeDefined();
    assertActorOutputIsStateless(first.actorOutput!);
    assertStateChangesAreValid(first.recorderOutput!.stateChanges);

    const afterOne = eventLog.all();
    expect(afterOne).toHaveLength(1);

    // 幂等
    const dup = await orchestrator.deduce({
      commandId: asCommandId("m2-cmd-1"),
      rewrite: chibiRewrites.fine,
    });
    expect(dup.outcome).toBe("duplicate");
    expect(eventLog.length).toBe(1);

    // 第二轮不同 commandId
    const second = await orchestrator.deduce({
      commandId: asCommandId("m2-cmd-2"),
      rewrite: {
        text: "调整资源分配规则",
        submittedAt: "2026-07-13T12:01:00.000Z",
      },
    });
    expect(second.outcome).toBe("applied");
    expect(eventLog.length).toBe(2);
    assertAppendOnly(afterOne, eventLog.all());
    assertCausalChain(eventLog.all());

    // 世界状态权威与 replay 一致
    const replayed = replay(chibiInitialState, eventLog.all());
    assertDeepEqual(replayed, store.getState());
    expect(store.getState()).toEqual(replayed);
  });
});
