import { describe, expect, it } from "vitest";
import { getWorkerStatus } from "./status.js";

describe("worker framework", () => {
  it("is ready without starting a model session", () => {
    expect(getWorkerStatus()).toEqual({
      name: "sandtable-worker",
      status: "ready",
      protocolVersion: "v1"
    });
  });
});

