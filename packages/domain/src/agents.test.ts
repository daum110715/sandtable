import { describe, expect, it } from "vitest";
import { asAgentId } from "./ids.js";
import type { ActorOutput, ActorAgent, RecorderAgent, ActorInput } from "./agents.js";

const stubInput = (text: string) => ({
  worldState: undefined as never,
  rewrite: { text, submittedAt: "2026-07-12T00:00:00.000Z" },
});

describe("agent protocol", () => {
  it("ActorOutput carries narrative and intentions only", () => {
    const out: ActorOutput = {
      narrative: { text: "n", actorAgentId: asAgentId("a1") },
      intendedChanges: [{ description: "d", entity: "resource", targetId: "r1" }],
    };
    expect(out.intendedChanges[0]?.description).toBe("d");
    // 类型契约：ActorOutput 结构上无 op/value/id 字段（编译期保证演员 Agent 无写状态路径）。
  });

  it("an ActorAgent can return synchronous output", async () => {
    const agent: ActorAgent = {
      id: asAgentId("a1"),
      deduce: (input: ActorInput) => ({ narrative: { text: input.rewrite.text }, intendedChanges: [] }),
    };
    const out = await agent.deduce(stubInput("x"));
    expect(out.narrative.text).toBe("x");
    expect(out.intendedChanges).toHaveLength(0);
  });

  it("a RecorderAgent produces StateChange (only recorder writes state)", async () => {
    const agent: RecorderAgent = {
      id: asAgentId("r1"),
      record: () => ({ stateChanges: [], narrative: { text: "n" } }),
    };
    const out = await agent.record({
      worldState: undefined as never,
      rewrite: { text: "x", submittedAt: "2026-07-12T00:00:00.000Z" },
      actorOutput: { narrative: { text: "n" }, intendedChanges: [] },
      simulationTime: undefined as never,
    });
    expect(out.stateChanges).toEqual([]);
  });
});
