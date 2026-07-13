import { describe, expect, it } from "vitest";
import { asResourceId } from "../ids.js";
import { createCustomInitialState } from "../scenarios/custom.js";
import { StubRecorderAgent } from "./stub-recorder.js";

describe("StubRecorderAgent", () => {
  it("records a generic effect as a structured resource", async () => {
    const initial = createCustomInitialState({
      title: "记录测试世界",
      description: "用于验证桩记录员。",
    });
    const out = await new StubRecorderAgent().record({
      worldState: initial,
      rewrite: { text: "任意变化", submittedAt: "2026-07-13T00:00:00.000Z" },
      actorOutput: {
        narrative: { text: "推演叙事" },
        intendedChanges: [{ description: "任意变化", entity: "resource" }],
      },
      simulationTime: initial.simulationTime,
    });
    expect(out.narrative.text).toBe("推演叙事");
    expect(out.nextSimulationTime).toBe("阶段 1");
    expect(out.stateChanges).toEqual([
      {
        op: "create",
        entity: "resource",
        value: expect.objectContaining({
          id: asResourceId("resource-effect-1"),
          type: "world-effect",
          attributes: {
            description: "任意变化",
            source: "stub-recorder",
          },
        }),
      },
    ]);
  });
});
