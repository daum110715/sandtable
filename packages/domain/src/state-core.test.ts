import { describe, expect, it } from "vitest";
import { DomainError } from "./errors.js";
import {
  asWorldlineId,
  asSimulationTime,
  asPersonId,
  asEventId,
  asFactionId,
  asResourceId,
  asLocationId,
  asRelationId,
  asSessionId,
  asCommandId,
} from "./ids.js";
import type {
  WorldState,
  Person,
  Faction,
  Resource,
  Location,
  Relation,
} from "./world-state.js";
import type { DeductionEvent } from "./events.js";
import {
  applyStateChange,
  applyStateChanges,
  appendEvent,
  replay,
  buildEvent,
} from "./state-core.js";

const empty = (): WorldState => ({
  worldlineId: asWorldlineId("w1"),
  simulationTime: asSimulationTime("t0"),
  setting: { title: "测试世界", description: "测试设定" },
  persons: {},
  factions: {},
  resources: {},
  locations: {},
  relations: {},
});

const zhouYu: Person = { id: asPersonId("p1"), name: "周瑜" };
const createZhouYu = { op: "create", entity: "person", value: zhouYu } as const;

const sunQuan: Faction = { id: asFactionId("f1"), name: "孙吴" };
const createSunQuan = {
  op: "create",
  entity: "faction",
  value: sunQuan,
} as const;

const arrows: Resource = {
  id: asResourceId("r1"),
  name: "箭矢",
  type: "military",
  quantity: 100000,
};
const createArrows = {
  op: "create",
  entity: "resource",
  value: arrows,
} as const;

const chibi: Location = {
  id: asLocationId("l1"),
  name: "赤壁",
  type: "battlefield",
};
const createChibi = { op: "create", entity: "location", value: chibi } as const;

const alliance: Relation = {
  id: asRelationId("rel1"),
  from: { kind: "faction", id: asFactionId("f1") },
  to: { kind: "faction", id: asFactionId("f2") },
  type: "alliance",
  strength: 80,
};
const createAlliance = {
  op: "create",
  entity: "relation",
  value: alliance,
} as const;

describe("state-core", () => {
  describe("applyStateChange", () => {
    it("creates a person", () => {
      const s = applyStateChange(empty(), createZhouYu);
      expect(s.persons[asPersonId("p1")]?.name).toBe("周瑜");
    });

    it("updates a person", () => {
      const s1 = applyStateChange(empty(), createZhouYu);
      const s2 = applyStateChange(s1, {
        op: "update",
        entity: "person",
        id: asPersonId("p1"),
        patch: { status: "在世" },
      });
      expect(s2.persons[asPersonId("p1")]?.status).toBe("在世");
    });

    it("deletes a person", () => {
      const s1 = applyStateChange(empty(), createZhouYu);
      const s2 = applyStateChange(s1, {
        op: "delete",
        entity: "person",
        id: asPersonId("p1"),
      });
      expect(s2.persons[asPersonId("p1")]).toBeUndefined();
    });

    it("creates a faction", () => {
      const s = applyStateChange(empty(), createSunQuan);
      expect(s.factions[asFactionId("f1")]?.name).toBe("孙吴");
    });

    it("updates a faction", () => {
      const s1 = applyStateChange(empty(), createSunQuan);
      const s2 = applyStateChange(s1, {
        op: "update",
        entity: "faction",
        id: asFactionId("f1"),
        patch: { strength: 5000 },
      });
      expect(s2.factions[asFactionId("f1")]?.strength).toBe(5000);
    });

    it("deletes a faction", () => {
      const s1 = applyStateChange(empty(), createSunQuan);
      const s2 = applyStateChange(s1, {
        op: "delete",
        entity: "faction",
        id: asFactionId("f1"),
      });
      expect(s2.factions[asFactionId("f1")]).toBeUndefined();
    });

    it("creates a resource", () => {
      const s = applyStateChange(empty(), createArrows);
      expect(s.resources[asResourceId("r1")]?.name).toBe("箭矢");
      expect(s.resources[asResourceId("r1")]?.quantity).toBe(100000);
    });

    it("updates a resource", () => {
      const s1 = applyStateChange(empty(), createArrows);
      const s2 = applyStateChange(s1, {
        op: "update",
        entity: "resource",
        id: asResourceId("r1"),
        patch: { quantity: 50000 },
      });
      expect(s2.resources[asResourceId("r1")]?.quantity).toBe(50000);
    });

    it("deletes a resource", () => {
      const s1 = applyStateChange(empty(), createArrows);
      const s2 = applyStateChange(s1, {
        op: "delete",
        entity: "resource",
        id: asResourceId("r1"),
      });
      expect(s2.resources[asResourceId("r1")]).toBeUndefined();
    });

    it("creates a location", () => {
      const s = applyStateChange(empty(), createChibi);
      expect(s.locations[asLocationId("l1")]?.name).toBe("赤壁");
    });

    it("updates a location", () => {
      const s1 = applyStateChange(empty(), createChibi);
      const s2 = applyStateChange(s1, {
        op: "update",
        entity: "location",
        id: asLocationId("l1"),
        patch: { type: "ruins" },
      });
      expect(s2.locations[asLocationId("l1")]?.type).toBe("ruins");
    });

    it("deletes a location", () => {
      const s1 = applyStateChange(empty(), createChibi);
      const s2 = applyStateChange(s1, {
        op: "delete",
        entity: "location",
        id: asLocationId("l1"),
      });
      expect(s2.locations[asLocationId("l1")]).toBeUndefined();
    });

    it("creates a relation", () => {
      const s = applyStateChange(empty(), createAlliance);
      expect(s.relations[asRelationId("rel1")]?.type).toBe("alliance");
    });

    it("updates a relation", () => {
      const s1 = applyStateChange(empty(), createAlliance);
      const s2 = applyStateChange(s1, {
        op: "update",
        entity: "relation",
        id: asRelationId("rel1"),
        patch: { strength: 20 },
      });
      expect(s2.relations[asRelationId("rel1")]?.strength).toBe(20);
    });

    it("deletes a relation", () => {
      const s1 = applyStateChange(empty(), createAlliance);
      const s2 = applyStateChange(s1, {
        op: "delete",
        entity: "relation",
        id: asRelationId("rel1"),
      });
      expect(s2.relations[asRelationId("rel1")]).toBeUndefined();
    });

    it("update on missing entity throws DomainError", () => {
      expect(() =>
        applyStateChange(empty(), {
          op: "update",
          entity: "person",
          id: asPersonId("ghost"),
          patch: {},
        }),
      ).toThrow(DomainError);
    });

    it("delete on missing entity throws DomainError", () => {
      expect(() =>
        applyStateChange(empty(), {
          op: "delete",
          entity: "person",
          id: asPersonId("ghost"),
        }),
      ).toThrow(DomainError);
    });

    it("create on an existing entity throws DomainError", () => {
      const state = applyStateChange(empty(), createZhouYu);
      expect(() => applyStateChange(state, createZhouYu)).toThrow(DomainError);
    });
  });

  describe("applyStateChanges", () => {
    it("chains changes across entity types", () => {
      const s = applyStateChanges(empty(), [
        createZhouYu,
        createSunQuan,
        createArrows,
      ]);
      expect(s.persons[asPersonId("p1")]?.name).toBe("周瑜");
      expect(s.factions[asFactionId("f1")]?.name).toBe("孙吴");
      expect(s.resources[asResourceId("r1")]?.name).toBe("箭矢");
    });
  });

  describe("appendEvent", () => {
    it("appends to existing log", () => {
      const e1 = {} as DeductionEvent;
      const e2 = {} as DeductionEvent;
      const log = appendEvent([e1], e2);
      expect(log).toHaveLength(2);
      expect(log[0]).toBe(e1);
      expect(log[1]).toBe(e2);
    });

    it("creates single-element log from empty", () => {
      const e1 = {} as DeductionEvent;
      const log = appendEvent([], e1);
      expect(log).toHaveLength(1);
      expect(log[0]).toBe(e1);
    });
  });

  describe("buildEvent", () => {
    it("builds event with required fields", () => {
      const ev = buildEvent({
        id: asEventId("e1"),
        worldlineId: asWorldlineId("w1"),
        simulationTime: asSimulationTime("t0"),
        rewrite: { text: "r", submittedAt: "2026-07-12T00:00:00.000Z" },
        narrative: { text: "n" },
        stateChanges: [],
      });
      expect(ev.id).toBe("e1");
      expect(ev.worldlineId).toBe("w1");
      expect(ev.causal.rewrite.text).toBe("r");
      expect(ev.causal.previousEventId).toBeUndefined();
    });

    it("builds event with previousEventId", () => {
      const ev = buildEvent({
        id: asEventId("e2"),
        worldlineId: asWorldlineId("w1"),
        simulationTime: asSimulationTime("t1"),
        rewrite: { text: "r2", submittedAt: "2026-07-12T00:01:00.000Z" },
        narrative: { text: "n2" },
        stateChanges: [],
        previousEventId: asEventId("e1"),
      });
      expect(ev.causal.previousEventId).toBe("e1");
    });

    it("builds event with optional fields", () => {
      const ev = buildEvent({
        id: asEventId("e1"),
        worldlineId: asWorldlineId("w1"),
        simulationTime: asSimulationTime("t0"),
        rewrite: { text: "r", submittedAt: "2026-07-12T00:00:00.000Z" },
        narrative: { text: "n" },
        stateChanges: [],
        sessionId: asSessionId("s1"),
        commandId: asCommandId("cmd-1"),
        agentVersion: "v1",
        recordedAt: "2026-07-12T00:00:01.000Z",
      });
      expect(ev.sessionId).toBe("s1");
      expect(ev.commandId).toBe("cmd-1");
      expect(ev.agentVersion).toBe("v1");
      expect(ev.recordedAt).toBe("2026-07-12T00:00:01.000Z");
    });
  });

  describe("replay", () => {
    it("reproduces applied state", () => {
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

    it("returns initial state for empty log", () => {
      const state = empty();
      expect(replay(state, [])).toEqual(state);
    });
  });
});
