import { describe, expect, it } from "vitest";
import {
  asFactionId,
  asLocationId,
  asPersonId,
  asRelationId,
  asResourceId,
  asSimulationTime,
  asWorldlineId,
} from "./ids.js";
import type { WorldState } from "./world-state.js";
import { InMemoryWorldStateStore } from "./world-state-store.js";

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

describe("InMemoryWorldStateStore", () => {
  it("returns initial state and entity getters", () => {
    const personId = asPersonId("p1");
    const factionId = asFactionId("f1");
    const resourceId = asResourceId("r1");
    const locationId = asLocationId("l1");
    const relationId = asRelationId("rel1");

    const initial: WorldState = {
      ...empty(),
      persons: { [personId]: { id: personId, name: "周瑜" } },
      factions: { [factionId]: { id: factionId, name: "孙" } },
      resources: {
        [resourceId]: {
          id: resourceId,
          name: "风",
          type: "weather",
          quantity: 1,
        },
      },
      locations: { [locationId]: { id: locationId, name: "赤壁" } },
      relations: {
        [relationId]: {
          id: relationId,
          from: { kind: "faction", id: factionId },
          to: { kind: "person", id: personId },
          type: "隶属",
        },
      },
    };

    const store = new InMemoryWorldStateStore(initial);
    expect(store.getState()).toBe(initial);
    expect(store.getPerson(personId)?.name).toBe("周瑜");
    expect(store.getFaction(factionId)?.name).toBe("孙");
    expect(store.getResource(resourceId)?.name).toBe("风");
    expect(store.getLocation(locationId)?.name).toBe("赤壁");
    expect(store.getRelation(relationId)?.type).toBe("隶属");
  });

  it("applies create / update / delete for person", () => {
    const store = new InMemoryWorldStateStore(empty());
    const id = asPersonId("p1");

    store.apply([
      { op: "create", entity: "person", value: { id, name: "周瑜" } },
    ]);
    expect(store.getPerson(id)?.name).toBe("周瑜");

    store.apply([
      { op: "update", entity: "person", id, patch: { status: "在世" } },
    ]);
    expect(store.getPerson(id)?.status).toBe("在世");

    store.apply([{ op: "delete", entity: "person", id }]);
    expect(store.getPerson(id)).toBeUndefined();
  });

  it("applies faction resource location relation changes", () => {
    const store = new InMemoryWorldStateStore(empty());
    const factionId = asFactionId("f1");
    const resourceId = asResourceId("r1");
    const locationId = asLocationId("l1");
    const relationId = asRelationId("rel1");
    const personId = asPersonId("p1");

    store.apply([
      { op: "create", entity: "faction", value: { id: factionId, name: "曹" } },
      {
        op: "create",
        entity: "location",
        value: { id: locationId, name: "乌林" },
      },
      {
        op: "create",
        entity: "resource",
        value: { id: resourceId, name: "战船", type: "fleet", quantity: 100 },
      },
      { op: "create", entity: "person", value: { id: personId, name: "曹操" } },
      {
        op: "create",
        entity: "relation",
        value: {
          id: relationId,
          from: { kind: "person", id: personId },
          to: { kind: "faction", id: factionId },
          type: "统帅",
        },
      },
    ]);

    expect(store.getFaction(factionId)?.name).toBe("曹");
    expect(store.getResource(resourceId)?.quantity).toBe(100);
    expect(store.getLocation(locationId)?.name).toBe("乌林");
    expect(store.getRelation(relationId)?.type).toBe("统帅");

    store.apply([
      {
        op: "update",
        entity: "faction",
        id: factionId,
        patch: { strength: 1 },
      },
      {
        op: "update",
        entity: "resource",
        id: resourceId,
        patch: { quantity: 80 },
      },
      {
        op: "update",
        entity: "location",
        id: locationId,
        patch: { type: "驻军" },
      },
      {
        op: "update",
        entity: "relation",
        id: relationId,
        patch: { strength: 9 },
      },
    ]);
    expect(store.getFaction(factionId)?.strength).toBe(1);
    expect(store.getResource(resourceId)?.quantity).toBe(80);
    expect(store.getLocation(locationId)?.type).toBe("驻军");
    expect(store.getRelation(relationId)?.strength).toBe(9);
  });

  it("failed apply leaves authority state unchanged", () => {
    const store = new InMemoryWorldStateStore(empty());
    const before = store.getState();

    expect(() =>
      store.apply([
        {
          op: "update",
          entity: "person",
          id: asPersonId("ghost"),
          patch: { name: "x" },
        },
      ]),
    ).toThrow();

    expect(store.getState()).toBe(before);
    expect(store.getState().persons).toEqual({});
  });

  it("replace sets authority state", () => {
    const store = new InMemoryWorldStateStore(empty());
    const next = {
      ...empty(),
      persons: { [asPersonId("p1")]: { id: asPersonId("p1"), name: "黄盖" } },
    };
    store.replace(next);
    expect(store.getState()).toBe(next);
  });
});
