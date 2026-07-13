import { describe, expect, it } from "vitest";
import {
  asPersonId,
  asResourceId,
  asFactionId,
  asSimulationTime,
  asWorldlineId,
  type WorldState,
  type Person,
} from "@sandtable/domain";
import { AgentError } from "./errors.js";
import { assertStateChangesConsistent } from "./validate.js";

const empty = (): WorldState => ({
  worldlineId: asWorldlineId("w"),
  simulationTime: asSimulationTime("t0"),
  setting: { title: "校验测试世界", description: "用于状态变更校验。" },
  persons: {
    [asPersonId("p1")]: { id: asPersonId("p1"), name: "周瑜" },
  },
  factions: {},
  resources: {
    [asResourceId("r1")]: {
      id: asResourceId("r1"),
      name: "风",
      type: "weather",
      quantity: 1,
    },
  },
  locations: {},
  relations: {},
});

describe("assertStateChangesConsistent", () => {
  it("accepts valid create", () => {
    expect(() =>
      assertStateChangesConsistent(empty(), [
        {
          op: "create",
          entity: "faction",
          value: { id: asFactionId("f-new"), name: "新势力" },
        },
      ]),
    ).not.toThrow();
  });

  it("accepts valid update", () => {
    expect(() =>
      assertStateChangesConsistent(empty(), [
        {
          op: "update",
          entity: "resource",
          id: asResourceId("r1"),
          patch: { quantity: 2 },
        },
      ]),
    ).not.toThrow();
  });

  it("accepts valid delete", () => {
    expect(() =>
      assertStateChangesConsistent(empty(), [
        {
          op: "delete",
          entity: "person",
          id: asPersonId("p1"),
        },
      ]),
    ).not.toThrow();
  });

  it("rejects update on missing id", () => {
    expect(() =>
      assertStateChangesConsistent(empty(), [
        {
          op: "update",
          entity: "person",
          id: asPersonId("ghost"),
          patch: { name: "x" },
        },
      ]),
    ).toThrow(AgentError);
  });

  it("rejects delete on missing id", () => {
    expect(() =>
      assertStateChangesConsistent(empty(), [
        {
          op: "delete",
          entity: "person",
          id: asPersonId("ghost"),
        },
      ]),
    ).toThrow(AgentError);
  });

  it("rejects create when id exists", () => {
    expect(() =>
      assertStateChangesConsistent(empty(), [
        {
          op: "create",
          entity: "person",
          value: { id: asPersonId("p1"), name: "dup" },
        },
      ]),
    ).toThrow(AgentError);
  });

  it("rejects create with missing value.id", () => {
    expect(() =>
      assertStateChangesConsistent(empty(), [
        {
          op: "create",
          entity: "person",
          value: { name: "no id" } as unknown as Person,
        },
      ]),
    ).toThrow(AgentError);
  });

  it("rejects unknown op", () => {
    expect(() =>
      assertStateChangesConsistent(empty(), [
        {
          op: "unknown" as "create",
          entity: "person",
          value: { id: asPersonId("p2"), name: "x" },
        },
      ]),
    ).toThrow(AgentError);
  });

  it("allows create then update same id in one batch", () => {
    expect(() =>
      assertStateChangesConsistent(empty(), [
        {
          op: "create",
          entity: "faction",
          value: { id: asFactionId("f-new"), name: "新" },
        },
        {
          op: "update",
          entity: "faction",
          id: asFactionId("f-new"),
          patch: { strength: 100 },
        },
      ]),
    ).not.toThrow();
  });

  it("allows delete then create same id in one batch", () => {
    expect(() =>
      assertStateChangesConsistent(empty(), [
        {
          op: "delete",
          entity: "person",
          id: asPersonId("p1"),
        },
        {
          op: "create",
          entity: "person",
          value: { id: asPersonId("p1"), name: "重生" },
        },
      ]),
    ).not.toThrow();
  });
});
