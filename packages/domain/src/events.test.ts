import { describe, expect, it } from "vitest";
import { asEventId, asWorldlineId, asSimulationTime, asPersonId } from "./ids.js";
import type { StateChange, DeductionEvent } from "./events.js";

describe("event log schema", () => {
  it("StateChange is a discriminated union by op", () => {
    const create: StateChange = {
      op: "create",
      entity: "person",
      value: { id: asPersonId("p1"), name: "周瑜" },
    };
    const update: StateChange = {
      op: "update",
      entity: "person",
      id: asPersonId("p1"),
      patch: { status: "在世" },
    };
    expect(create.op).toBe("create");
    expect(update.op).toBe("update");
  });

  it("builds a DeductionEvent with causal rewrite", () => {
    const rewrite = { text: "改写", submittedAt: "2026-07-12T00:00:00.000Z" };
    const ev: DeductionEvent = {
      id: asEventId("e1"),
      worldlineId: asWorldlineId("w1"),
      simulationTime: asSimulationTime("t0"),
      recordedAt: "2026-07-12T00:00:00.000Z",
      rewrite,
      narrative: { text: "推演" },
      stateChanges: [],
      causal: { rewrite },
    };
    expect(ev.causal.rewrite.text).toBe("改写");
    expect(ev.stateChanges).toHaveLength(0);
  });
});
