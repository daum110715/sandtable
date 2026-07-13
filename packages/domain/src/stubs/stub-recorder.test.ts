import { describe, expect, it } from "vitest";
import { StubRecorderAgent } from "./stub-recorder.js";

describe("StubRecorderAgent", () => {
  it("preserves the narrative and emits no scenario-specific changes", async () => {
    const out = await new StubRecorderAgent().record({
      worldState: undefined as never,
      rewrite: { text: "任意变化", submittedAt: "2026-07-13T00:00:00.000Z" },
      actorOutput: { narrative: { text: "推演叙事" }, intendedChanges: [] },
      simulationTime: undefined as never,
    });
    expect(out.narrative.text).toBe("推演叙事");
    expect(out.stateChanges).toEqual([]);
  });
});
