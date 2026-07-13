import { describe, expect, it, vi } from "vitest";
import {
  DeductionOrchestrator,
  InMemoryEventLog,
  InMemoryWorldStateStore,
  asCommandId,
  asEventId,
  asResourceId,
  chibiInitialState,
  chibiRewrites,
} from "@sandtable/domain";
import { AgentError } from "./errors.js";
import type { LlmClient } from "./llm.js";
import { ModelActorAgent } from "./model-actor.js";
import { ModelRecorderAgent } from "./model-recorder.js";
import { resolveAgents } from "./factory.js";

const mockLlm = (responses: string[]): LlmClient => {
  let i = 0;
  return {
    provider: "mock",
    model: "mock-model",
    complete: vi.fn(async () => {
      const text = responses[i] ?? responses[responses.length - 1]!;
      i += 1;
      return { text, model: "mock-model" };
    }),
  };
};

describe("ModelActorAgent / ModelRecorderAgent", () => {
  it("parses actor and recorder output and commits via orchestrator", async () => {
    const llm = mockLlm([
      JSON.stringify({
        narrative: "西北风起，火攻受挫。",
        intendedChanges: [
          {
            description: "风向转西北",
            entity: "resource",
            targetId: "resource-wind",
          },
        ],
      }),
      JSON.stringify({
        narrative: "西北风起，火攻受挫。",
        stateChanges: [
          {
            op: "update",
            entity: "resource",
            id: "resource-wind",
            patch: { attributes: { direction: "西北风" } },
          },
        ],
      }),
    ]);

    const store = new InMemoryWorldStateStore(chibiInitialState);
    const eventLog = new InMemoryEventLog();
    const orch = new DeductionOrchestrator({
      store,
      eventLog,
      actor: new ModelActorAgent(llm),
      recorder: new ModelRecorderAgent(llm),
      nextEventId: () => asEventId("e1"),
      now: () => "2026-07-13T00:00:00.000Z",
    });

    const result = await orch.deduce({
      commandId: asCommandId("m4-1"),
      rewrite: chibiRewrites.fine,
    });

    expect(result.outcome).toBe("applied");
    expect(
      store.getResource(asResourceId("resource-wind"))?.attributes?.direction,
    ).toBe("西北风");
    expect(eventLog.length).toBe(1);
    expect(llm.complete).toHaveBeenCalledTimes(2);
  });

  it("does not write state when recorder output is inconsistent", async () => {
    const llm = mockLlm([
      JSON.stringify({
        narrative: "x",
        intendedChanges: [],
      }),
      JSON.stringify({
        narrative: "x",
        stateChanges: [
          {
            op: "update",
            entity: "person",
            id: "person-does-not-exist",
            patch: { name: "ghost" },
          },
        ],
      }),
    ]);

    const store = new InMemoryWorldStateStore(chibiInitialState);
    const eventLog = new InMemoryEventLog();
    const before = store.getState();
    const orch = new DeductionOrchestrator({
      store,
      eventLog,
      actor: new ModelActorAgent(llm),
      recorder: new ModelRecorderAgent(llm),
      nextEventId: () => asEventId("e-fail"),
    });

    await expect(
      orch.deduce({
        commandId: asCommandId("m4-fail"),
        rewrite: chibiRewrites.fine,
      }),
    ).rejects.toThrow(AgentError);

    expect(store.getState()).toBe(before);
    expect(eventLog.length).toBe(0);
  });

  it("does not write when llm times out on actor", async () => {
    const llm: LlmClient = {
      provider: "mock",
      model: "m",
      complete: async () => {
        throw new AgentError("timeout", "slow", { retryable: true });
      },
    };
    const store = new InMemoryWorldStateStore(chibiInitialState);
    const eventLog = new InMemoryEventLog();
    const orch = new DeductionOrchestrator({
      store,
      eventLog,
      actor: new ModelActorAgent(llm),
      recorder: new ModelRecorderAgent(llm),
    });

    await expect(
      orch.deduce({
        commandId: asCommandId("m4-timeout"),
        rewrite: chibiRewrites.fine,
      }),
    ).rejects.toMatchObject({ code: "timeout", retryable: true });
    expect(eventLog.length).toBe(0);
  });
});

describe("resolveAgents", () => {
  it("defaults to stub without key", () => {
    const r = resolveAgents({ env: {} });
    expect(r.mode).toBe("stub");
  });

  it("uses model when llm injected", () => {
    const r = resolveAgents({
      env: {},
      llm: mockLlm(["{}"]),
    });
    expect(r.mode).toBe("model");
    expect(r.provider).toBe("mock");
  });

  it("forces stub even if key present", () => {
    const r = resolveAgents({
      env: { DEEPSEEK_API_KEY: "sk-test", SANDTABLE_AGENT_MODE: "stub" },
    });
    expect(r.mode).toBe("stub");
  });
});
