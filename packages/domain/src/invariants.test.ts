import { describe, expect, it } from "vitest";
import { asEventId, asWorldlineId, asSimulationTime, asPersonId } from "./ids.js";
import type { ActorOutput } from "./agents.js";
import type { DeductionEvent, StateChange } from "./events.js";
import {
  assertActorOutputIsStateless,
  assertAppendOnly,
  assertStateChangesAreValid,
  assertCausalChain,
  assertDeepEqual,
} from "./invariants.js";

const out = (intendedChanges: object[]): ActorOutput => ({
  narrative: { text: "n" },
  intendedChanges: intendedChanges as ActorOutput["intendedChanges"],
});

const rewrite = { text: "r", submittedAt: "2026-07-12T00:00:00.000Z" };

const ev = (id: string, prev?: string): DeductionEvent => ({
  id: asEventId(id),
  worldlineId: asWorldlineId("w1"),
  simulationTime: asSimulationTime("t0"),
  recordedAt: "2026-07-12T00:00:00.000Z",
  rewrite,
  narrative: { text: "n" },
  stateChanges: [],
  causal: prev !== undefined ? { previousEventId: asEventId(prev), rewrite } : { rewrite },
});

describe("invariants", () => {
  it("accepts stateless actor output", () => {
    expect(() => assertActorOutputIsStateless(out([{ description: "d" }]))).not.toThrow();
  });

  it("rejects actor output carrying op/value", () => {
    expect(() => assertActorOutputIsStateless(out([{ description: "d", op: "create" }]))).toThrow();
    expect(() => assertActorOutputIsStateless(out([{ description: "d", value: 1 }]))).toThrow();
  });

  it("append-only allows growth, forbids mutation and shrink", () => {
    const e1 = ev("e1");
    const e2 = ev("e2", "e1");
    expect(() => assertAppendOnly([e1], [e1, e2])).not.toThrow();
    expect(() => assertAppendOnly([e1], [e2])).toThrow();
  });

  it("validates state changes", () => {
    const valid: StateChange = {
      op: "create",
      entity: "person",
      value: { id: asPersonId("p1"), name: "x" },
    };
    expect(() => assertStateChangesAreValid([valid])).not.toThrow();
    const bad = { op: "create", entity: "person" } as unknown as StateChange;
    expect(() => assertStateChangesAreValid([bad])).toThrow();
  });

  it("checks causal chain", () => {
    expect(() => assertCausalChain([ev("e1"), ev("e2", "e1")])).not.toThrow();
    expect(() => assertCausalChain([ev("e1"), ev("e2", "e9")])).toThrow();
    expect(() => assertCausalChain([ev("e1", "e0")])).toThrow();
  });

  it("compares snapshots", () => {
    expect(() => assertDeepEqual({ a: 1 }, { a: 1 })).not.toThrow();
    expect(() => assertDeepEqual({ a: 1 }, { a: 2 })).toThrow();
  });
});
