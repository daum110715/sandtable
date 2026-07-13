import { describe, expect, it } from "vitest";
import type { ActorOutput } from "../agents.js";
import { StubActorAgent, stubActorAgentId } from "./stub-actor.js";
import { assertActorOutputIsStateless } from "../invariants.js";

const agent = new StubActorAgent();
const deduce = async (text: string): Promise<ActorOutput> =>
  agent.deduce({
    worldState: undefined as never,
    rewrite: { text, submittedAt: "2026-07-12T00:00:00.000Z" },
  });

describe("StubActorAgent", () => {
  it("has stable id", () => {
    expect(agent.id).toBe(stubActorAgentId);
  });

  it("narrates northwest wind branch with two intentions", async () => {
    const out = await deduce("那天江上刮西北风");
    expect(out.narrative.text).toContain("西北风");
    expect(out.intendedChanges).toHaveLength(2);
  });

  it("narrates retreat branch", async () => {
    const out = await deduce("曹操采纳贾诩建议，退守许都");
    expect(out.narrative.text).toContain("许都");
    expect(out.intendedChanges).toHaveLength(1);
  });

  it("falls back for unknown rewrite", async () => {
    const out = await deduce("什么都没发生");
    expect(out.intendedChanges).toHaveLength(0);
  });

  it("produces stateless output (invariant 1)", async () => {
    const out = await deduce("那天江上刮西北风");
    expect(() => assertActorOutputIsStateless(out)).not.toThrow();
  });
});
