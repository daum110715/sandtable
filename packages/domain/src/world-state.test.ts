import { describe, expect, it } from "vitest";
import { asWorldlineId, asSimulationTime, asPersonId, asFactionId } from "./ids.js";
import type { WorldState } from "./world-state.js";

describe("WorldState schema", () => {
  it("supports a minimal structured snapshot", () => {
    const state: WorldState = {
      worldlineId: asWorldlineId("w1"),
      simulationTime: asSimulationTime("t0"),
      persons: { [asPersonId("p1")]: { id: asPersonId("p1"), name: "周瑜" } },
      factions: { [asFactionId("f1")]: { id: asFactionId("f1"), name: "吴" } },
      resources: {},
      locations: {},
      relations: {},
    };
    expect(state.persons[asPersonId("p1")]?.name).toBe("周瑜");
    expect(state.factions[asFactionId("f1")]?.name).toBe("吴");
  });
});
