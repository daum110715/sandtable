import { describe, expect, it } from "vitest";
import type { DeductionEvent } from "./events.js";
import { asEventId, asResourceId } from "./ids.js";
import { chibiInitialState, chibiRewrites } from "./scenarios/chibi.js";
import { StubActorAgent } from "./stubs/stub-actor.js";
import { StubRecorderAgent } from "./stubs/stub-recorder.js";
import {
  applyStateChanges,
  appendEvent,
  replay,
  buildEvent,
} from "./state-core.js";
import {
  assertActorOutputIsStateless,
  assertAppendOnly,
  assertStateChangesAreValid,
  assertCausalChain,
  assertDeepEqual,
} from "./invariants.js";

describe("domain closed loop: rewrite -> deduce -> record -> write -> replay", () => {
  it("runs one deduction cycle over chibi with northwest wind", async () => {
    const actor = new StubActorAgent();
    const recorder = new StubRecorderAgent();

    let state = chibiInitialState;
    let log: readonly DeductionEvent[] = [];

    // 不变量 1：演员 Agent 输出无写世界状态能力
    const actorOutput = await actor.deduce({
      worldState: state,
      rewrite: chibiRewrites.fine,
    });
    assertActorOutputIsStateless(actorOutput);

    // 不变量 3：StateChange 只来自记录员
    const recorderOutput = await recorder.record({
      worldState: state,
      rewrite: chibiRewrites.fine,
      actorOutput,
      simulationTime: state.simulationTime,
    });
    assertStateChangesAreValid(recorderOutput.stateChanges);

    // 写回世界状态
    state = applyStateChanges(state, recorderOutput.stateChanges);
    expect(
      state.resources[asResourceId("resource-wind")]?.attributes?.direction,
    ).toBe("西北风");

    // 追加事件（不变量 2：仅追加）
    const previousEventId =
      log.length > 0 ? log[log.length - 1]?.id : undefined;
    const event = buildEvent({
      id: asEventId("e1"),
      worldlineId: state.worldlineId,
      simulationTime: recorderOutput.nextSimulationTime ?? state.simulationTime,
      rewrite: chibiRewrites.fine,
      narrative: recorderOutput.narrative,
      stateChanges: recorderOutput.stateChanges,
      ...(previousEventId !== undefined ? { previousEventId } : {}),
    });
    const newLog = appendEvent(log, event);
    assertAppendOnly(log, newLog);
    log = newLog;

    // 不变量 4：因果链可追溯
    assertCausalChain(log);

    // 不变量 6：replay 还原与逐步写回一致
    const replayed = replay(chibiInitialState, log);
    assertDeepEqual(replayed, state);
    expect(
      replayed.resources[asResourceId("resource-wind")]?.attributes?.direction,
    ).toBe("西北风");
  });

  it("runs two cycles keeping causal chain and replay consistent", async () => {
    const actor = new StubActorAgent();
    const recorder = new StubRecorderAgent();
    let state = chibiInitialState;
    let log: readonly DeductionEvent[] = [];

    for (let i = 0; i < 2; i++) {
      const actorOutput = await actor.deduce({
        worldState: state,
        rewrite: chibiRewrites.fine,
      });
      const recorderOutput = await recorder.record({
        worldState: state,
        rewrite: chibiRewrites.fine,
        actorOutput,
        simulationTime: state.simulationTime,
      });
      state = applyStateChanges(state, recorderOutput.stateChanges);
      const previousEventId =
        log.length > 0 ? log[log.length - 1]?.id : undefined;
      log = appendEvent(
        log,
        buildEvent({
          id: asEventId(`e${i + 1}`),
          worldlineId: state.worldlineId,
          simulationTime: state.simulationTime,
          rewrite: chibiRewrites.fine,
          narrative: recorderOutput.narrative,
          stateChanges: recorderOutput.stateChanges,
          ...(previousEventId !== undefined ? { previousEventId } : {}),
        }),
      );
    }

    assertCausalChain(log);
    assertDeepEqual(replay(chibiInitialState, log), state);
    expect(log).toHaveLength(2);
  });
});
