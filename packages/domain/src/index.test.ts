import { describe, expect, it } from "vitest";
import { systemIdentity } from "./index.js";

describe("shared domain protocol", () => {
  it("has a stable initial protocol identity", () => {
    expect(systemIdentity).toEqual({
      name: "sandtable",
      protocolVersion: "v1",
    });
  });
});
