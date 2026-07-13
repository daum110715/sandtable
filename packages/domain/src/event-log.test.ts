import { describe, expect, it } from "vitest";
import { DomainError } from "./errors.js";
import {
  asCommandId,
  asEventId,
  asSimulationTime,
  asWorldlineId,
} from "./ids.js";
import type { DeductionEvent } from "./events.js";
import { InMemoryEventLog } from "./event-log.js";
import { assertAppendOnly } from "./invariants.js";

const makeEvent = (id: string, commandId?: string): DeductionEvent => ({
  id: asEventId(id),
  worldlineId: asWorldlineId("w1"),
  simulationTime: asSimulationTime("t0"),
  recordedAt: "1970-01-01T00:00:00.000Z",
  rewrite: { text: "r", submittedAt: "2026-07-12T00:00:00.000Z" },
  narrative: { text: "n" },
  stateChanges: [],
  causal: { rewrite: { text: "r", submittedAt: "2026-07-12T00:00:00.000Z" } },
  ...(commandId !== undefined ? { commandId: asCommandId(commandId) } : {}),
});

describe("InMemoryEventLog", () => {
  it("appends and reads in order", () => {
    const log = new InMemoryEventLog();
    const e1 = makeEvent("e1");
    const e2 = makeEvent("e2");

    log.append(e1);
    const before = log.all();
    log.append(e2);
    const after = log.all();

    assertAppendOnly(before.slice(0, 1), after);
    expect(log.length).toBe(2);
    expect(log.at(0)).toBe(e1);
    expect(log.at(1)).toBe(e2);
    expect(log.last()).toBe(e2);
  });

  it("finds by commandId", () => {
    const log = new InMemoryEventLog();
    const e = makeEvent("e1", "cmd-1");
    log.append(e);
    expect(log.findByCommandId(asCommandId("cmd-1"))).toBe(e);
    expect(log.findByCommandId(asCommandId("missing"))).toBeUndefined();
  });

  it("rejects duplicate commandId on append", () => {
    const log = new InMemoryEventLog();
    log.append(makeEvent("e1", "cmd-1"));
    expect(() => log.append(makeEvent("e2", "cmd-1"))).toThrow(DomainError);
    expect(log.length).toBe(1);
  });

  it("allows events without commandId", () => {
    const log = new InMemoryEventLog();
    log.append(makeEvent("e1"));
    log.append(makeEvent("e2"));
    expect(log.length).toBe(2);
  });

  it("at returns undefined for out-of-bounds index", () => {
    const log = new InMemoryEventLog();
    expect(log.at(0)).toBeUndefined();
    log.append(makeEvent("e1"));
    expect(log.at(1)).toBeUndefined();
    expect(log.at(-1)).toBeUndefined();
  });

  it("last returns undefined for empty log", () => {
    const log = new InMemoryEventLog();
    expect(log.last()).toBeUndefined();
  });

  it("all returns a copy", () => {
    const log = new InMemoryEventLog();
    log.append(makeEvent("e1"));
    const copy1 = log.all();
    log.append(makeEvent("e2"));
    const copy2 = log.all();
    expect(copy1).toHaveLength(1);
    expect(copy2).toHaveLength(2);
  });

  it("length starts at zero", () => {
    const log = new InMemoryEventLog();
    expect(log.length).toBe(0);
  });
});
