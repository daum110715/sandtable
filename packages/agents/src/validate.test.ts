import { describe, expect, it } from "vitest";
import {
  asPersonId,
  asResourceId,
  asSimulationTime,
  asWorldlineId,
  type WorldState,
} from "@sandtable/domain";
import { AgentError } from "./errors.js";
import { assertStateChangesConsistent } from "./validate.js";

const empty = (): WorldState => ({
  worldlineId: asWorldlineId("w"),
  simulationTime: asSimulationTime("t0"),
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
});
