import { describe, expect, it } from "vitest";
import { asPersonId, asEventId, asWorldlineId, asAgentId, asCommandId } from "./ids.js";

describe("branded ids", () => {
  it("constructors return the underlying string", () => {
    expect(asPersonId("p1")).toBe("p1");
    expect(asEventId("e1")).toBe("e1");
    expect(asWorldlineId("w1")).toBe("w1");
    expect(asAgentId("a1")).toBe("a1");
    expect(asCommandId("cmd-1")).toBe("cmd-1");
  });

  it("branded ids are strings at runtime", () => {
    expect(typeof asPersonId("p1")).toBe("string");
  });
});
