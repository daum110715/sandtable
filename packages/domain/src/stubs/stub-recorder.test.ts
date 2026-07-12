import { describe, expect, it } from "vitest";
import type { IntendedChange } from "../agents.js";
import { asResourceId } from "../ids.js";
import { StubRecorderAgent } from "./stub-recorder.js";

const agent = new StubRecorderAgent();
const record = async (intendedChanges: readonly IntendedChange[]) =>
  agent.record({
    worldState: undefined as never,
    rewrite: { text: "r", submittedAt: "2026-07-12T00:00:00.000Z" },
    actorOutput: { narrative: { text: "n" }, intendedChanges },
    simulationTime: undefined as never,
  });

describe("StubRecorderAgent", () => {
  it("turns wind intent into an update change", async () => {
    const out = await record([{ description: "风向变化", entity: "resource", targetId: "resource-wind" }]);
    expect(out.stateChanges).toHaveLength(1);
    expect(out.stateChanges[0]?.op).toBe("update");
  });

  it("turns northwest wind intents into two changes", async () => {
    const out = await record([
      { description: "风向", entity: "resource", targetId: "resource-wind" },
      { description: "水寨", entity: "resource", targetId: "resource-sun-fleet" },
    ]);
    expect(out.stateChanges).toHaveLength(2);
    const first = out.stateChanges[0];
    if (first && (first.op === "update" || first.op === "delete")) {
      expect(first.id).toBe(asResourceId("resource-wind"));
    } else {
      throw new Error("expected update/delete change");
    }
  });

  it("passes through narrative", async () => {
    const out = await record([]);
    expect(out.narrative.text).toBe("n");
    expect(out.stateChanges).toEqual([]);
  });
});
