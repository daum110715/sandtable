import { describe, expect, it } from "vitest";
import { asWorldlineId, asSimulationTime, asPersonId, asEventId } from "./ids.js";
import type { WorldState, Person } from "./world-state.js";
import type { DeductionEvent } from "./events.js";
import { applyStateChange, applyStateChanges, appendEvent, replay, buildEvent } from "./m1-loop.js";

const empty = (): WorldState => ({
  worldlineId: asWorldlineId("w1"),
  simulationTime: asSimulationTime("t0"),
  persons: {},
  factions: {},
  resources: {},
  locations: {},
  relations: {},
});

const zhouYu: Person = { id: asPersonId("p1"), name: "周瑜" };
const createZhouYu = { op: "create", entity: "person", value: zhouYu } as const;

describe("m1-loop", () => {
  it("applies create", () => {
    const s = applyStateChange(empty(), createZhouYu);
    expect(s.persons[asPersonId("p1")]?.name).toBe("周瑜");
  });

  it("applies update", () => {
    const s1 = applyStateChange(empty(), createZhouYu);
    const s2 = applyStateChange(s1, {
      op: "update",
      entity: "person",
      id: asPersonId("p1"),
      patch: { status: "在世" },
    });
    expect(s2.persons[asPersonId("p1")]?.status).toBe("在世");
  });

  it("applies delete", () => {
    const s1 = applyStateChange(empty(), createZhouYu);
    const s2 = applyStateChange(s1, { op: "delete", entity: "person", id: asPersonId("p1") });
    expect(s2.persons[asPersonId("p1")]).toBeUndefined();
  });

  it("update on missing entity throws", () => {
    expect(() =>
      applyStateChange(empty(), { op: "update", entity: "person", id: asPersonId("ghost"), patch: {} }),
    ).toThrow();
  });

  it("appendEvent is append-only", () => {
    const e1 = {} as DeductionEvent;
    const e2 = {} as DeductionEvent;
    const log = appendEvent([e1], e2);
    expect(log).toHaveLength(2);
    expect(log[0]).toBe(e1);
    expect(log[1]).toBe(e2);
  });

  it("applyStateChanges chains changes", () => {
    const s = applyStateChanges(empty(), [
      createZhouYu,
      { op: "update", entity: "person", id: asPersonId("p1"), patch: { role: "都督" } },
    ]);
    expect(s.persons[asPersonId("p1")]?.role).toBe("都督");
  });

  it("replay reproduces applied state", () => {
    const event = buildEvent({
      id: asEventId("e1"),
      worldlineId: asWorldlineId("w1"),
      simulationTime: asSimulationTime("t0"),
      rewrite: { text: "r", submittedAt: "2026-07-12T00:00:00.000Z" },
      narrative: { text: "n" },
      stateChanges: [createZhouYu],
    });
    const replayed = replay(empty(), [event]);
    expect(replayed.persons[asPersonId("p1")]?.name).toBe("周瑜");
  });
});
