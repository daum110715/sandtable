import { describe, expect, it } from "vitest";
import { assertActorOutputIsStateless } from "../invariants.js";
import { StubActorAgent, stubActorAgentId } from "./stub-actor.js";

describe("StubActorAgent", () => {
  const agent = new StubActorAgent();
  const deduce = (text: string) =>
    agent.deduce({
      worldState: undefined as never,
      rewrite: { text, submittedAt: "2026-07-13T00:00:00.000Z" },
    });

  it("has stable id", () => expect(agent.id).toBe(stubActorAgentId));

  it("accepts arbitrary world changes without embedding a scenario", async () => {
    const out = await deduce("让探险者共享补给");
    expect(out.narrative.text).toContain("让探险者共享补给");
    expect(out.intendedChanges).toEqual([]);
  });

  it("produces stateless output", async () => {
    const out = await deduce("任意变化");
    expect(() => assertActorOutputIsStateless(out)).not.toThrow();
  });
});
