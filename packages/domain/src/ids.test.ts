import { describe, expect, it } from "vitest";
import {
  asWorldlineId,
  asPersonId,
  asFactionId,
  asResourceId,
  asLocationId,
  asRelationId,
  asEventId,
  asSessionId,
  asAgentId,
  asSimulationTime,
  asCommandId,
} from "./ids.js";

describe("branded ids", () => {
  it("constructors return the underlying string", () => {
    expect(asWorldlineId("w1")).toBe("w1");
    expect(asPersonId("p1")).toBe("p1");
    expect(asFactionId("f1")).toBe("f1");
    expect(asResourceId("r1")).toBe("r1");
    expect(asLocationId("l1")).toBe("l1");
    expect(asRelationId("rel1")).toBe("rel1");
    expect(asEventId("e1")).toBe("e1");
    expect(asSessionId("s1")).toBe("s1");
    expect(asAgentId("a1")).toBe("a1");
    expect(asSimulationTime("t0")).toBe("t0");
    expect(asCommandId("cmd-1")).toBe("cmd-1");
  });

  it("branded ids are strings at runtime", () => {
    expect(typeof asPersonId("p1")).toBe("string");
    expect(typeof asFactionId("f1")).toBe("string");
    expect(typeof asResourceId("r1")).toBe("string");
    expect(typeof asLocationId("l1")).toBe("string");
    expect(typeof asRelationId("rel1")).toBe("string");
  });

  it("empty string is valid", () => {
    expect(asPersonId("")).toBe("");
    expect(asEventId("")).toBe("");
  });
});
