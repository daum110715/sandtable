import { describe, expect, it, vi } from "vitest";
import type { ActorAgent, ActorOutput, RecorderAgent, RecorderOutput } from "./agents.js";
import { asAgentId, asCommandId, asEventId, asResourceId } from "./ids.js";
import {
  assertCausalChain,
  assertDeepEqual,
} from "./invariants.js";
import { replay } from "./m1-loop.js";
import { DeductionOrchestrator } from "./orchestrator.js";
import { InMemoryEventLog } from "./event-log.js";
import { InMemoryWorldStateStore } from "./world-state-store.js";
import { chibiInitialState, chibiRewrites } from "./scenarios/chibi.js";
import { StubActorAgent } from "./stubs/stub-actor.js";
import { StubRecorderAgent } from "./stubs/stub-recorder.js";

const setup = (opts?: {
  actor?: ActorAgent;
  recorder?: RecorderAgent;
}) => {
  const store = new InMemoryWorldStateStore(chibiInitialState);
  const eventLog = new InMemoryEventLog();
  const actor = opts?.actor ?? new StubActorAgent();
  const recorder = opts?.recorder ?? new StubRecorderAgent();
  let seq = 0;
  const orchestrator = new DeductionOrchestrator({
    store,
    eventLog,
    actor,
    recorder,
    nextEventId: () => {
      seq += 1;
      return asEventId(`e${seq}`);
    },
    now: () => "2026-07-13T00:00:00.000Z",
  });
  return { store, eventLog, actor, recorder, orchestrator };
};

describe("DeductionOrchestrator", () => {
  it("runs one deduction cycle: rewrite -> deduce -> record -> write", async () => {
    const { store, eventLog, orchestrator } = setup();

    const result = await orchestrator.deduce({
      commandId: asCommandId("cmd-nw-wind"),
      rewrite: chibiRewrites.fine,
    });

    expect(result.outcome).toBe("applied");
    expect(result.event.commandId).toBe("cmd-nw-wind");
    expect(result.event.rewrite).toEqual(chibiRewrites.fine);
    expect(result.event.stateChanges.length).toBeGreaterThan(0);
    expect(result.worldState.resources[asResourceId("resource-wind")]?.attributes?.direction).toBe(
      "西北风",
    );
    expect(store.getState()).toBe(result.worldState);
    expect(eventLog.length).toBe(1);
    expect(eventLog.last()?.id).toBe("e1");
    expect(result.event.causal.previousEventId).toBeUndefined();
  });

  it("idempotent: same commandId does not re-run agents or append events", async () => {
    const deduce = vi.fn((): ActorOutput => ({
      narrative: { text: "once", actorAgentId: asAgentId("a") },
      intendedChanges: [],
    }));
    const record = vi.fn((): RecorderOutput => ({
      stateChanges: [],
      narrative: { text: "once" },
    }));
    const actor: ActorAgent = { id: asAgentId("a"), deduce };
    const recorder: RecorderAgent = { id: asAgentId("r"), record };

    const { eventLog, orchestrator, store } = setup({ actor, recorder });
    const cmd = {
      commandId: asCommandId("cmd-dup"),
      rewrite: chibiRewrites.fine,
    };

    const first = await orchestrator.deduce(cmd);
    const stateAfterFirst = store.getState();
    const second = await orchestrator.deduce(cmd);

    expect(first.outcome).toBe("applied");
    expect(second.outcome).toBe("duplicate");
    expect(second.event).toBe(first.event);
    expect(eventLog.length).toBe(1);
    expect(store.getState()).toBe(stateAfterFirst);
    expect(deduce).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledTimes(1);
  });

  it("agent failure leaves store and log unchanged", async () => {
    const actor: ActorAgent = {
      id: asAgentId("a"),
      deduce: () => {
        throw new Error("model down");
      },
    };
    const { store, eventLog, orchestrator } = setup({ actor });
    const before = store.getState();

    await expect(
      orchestrator.deduce({
        commandId: asCommandId("cmd-fail"),
        rewrite: chibiRewrites.fine,
      }),
    ).rejects.toThrow("model down");

    expect(store.getState()).toBe(before);
    expect(eventLog.length).toBe(0);
  });

  it("recorder failure leaves store and log unchanged", async () => {
    const recorder: RecorderAgent = {
      id: asAgentId("r"),
      record: () => {
        throw new Error("record failed");
      },
    };
    const { store, eventLog, orchestrator } = setup({ recorder });
    const before = store.getState();

    await expect(
      orchestrator.deduce({
        commandId: asCommandId("cmd-rec-fail"),
        rewrite: chibiRewrites.fine,
      }),
    ).rejects.toThrow("record failed");

    expect(store.getState()).toBe(before);
    expect(eventLog.length).toBe(0);
  });

  it("two cycles keep causal chain and replay consistency", async () => {
    const { store, eventLog, orchestrator } = setup();

    await orchestrator.deduce({
      commandId: asCommandId("cmd-1"),
      rewrite: chibiRewrites.fine,
    });
    await orchestrator.deduce({
      commandId: asCommandId("cmd-2"),
      rewrite: chibiRewrites.medium,
    });

    expect(eventLog.length).toBe(2);
    assertCausalChain(eventLog.all());
    expect(eventLog.at(1)?.causal.previousEventId).toBe(eventLog.at(0)?.id);

    const replayed = replay(chibiInitialState, eventLog.all());
    assertDeepEqual(replayed, store.getState());
  });

  it("different commandIds with same rewrite text both apply", async () => {
    const { eventLog, orchestrator } = setup();

    await orchestrator.deduce({
      commandId: asCommandId("cmd-a"),
      rewrite: chibiRewrites.fine,
    });
    await orchestrator.deduce({
      commandId: asCommandId("cmd-b"),
      rewrite: chibiRewrites.fine,
    });

    expect(eventLog.length).toBe(2);
  });
});
