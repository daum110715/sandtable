import { describe, expect, it } from "vitest";
import { createCustomInitialState } from "../scenarios/custom.js";
import { assertActorOutputIsStateless } from "../invariants.js";
import { StubActorAgent, stubActorAgentId } from "./stub-actor.js";

describe("StubActorAgent", () => {
  const agent = new StubActorAgent();
  const deduce = (text: string) =>
    agent.deduce({
      worldState: createCustomInitialState({
        title: "桩测试世界",
        description: "用于验证通用改写。",
      }),
      rewrite: { text, submittedAt: "2026-07-13T00:00:00.000Z" },
    });

  it("has stable id", () => expect(agent.id).toBe(stubActorAgentId));

  it("turns an arbitrary rewrite into a generic change intent", async () => {
    const out = await deduce("让探险者共享补给");
    expect(out.narrative.text).toContain("桩测试世界");
    expect(out.intendedChanges).toEqual([
      { description: "让探险者共享补给", entity: "resource" },
    ]);
  });

  it("produces stateless output", async () => {
    const out = await deduce("任意变化");
    expect(() => assertActorOutputIsStateless(out)).not.toThrow();
  });
});
