import { describe, expect, it } from "vitest";
import { navigationSections } from "./App.js";

describe("mobile navigation framework", () => {
  it("keeps the four primary destinations in thumb navigation", () => {
    expect(navigationSections.map(({ path }) => path)).toEqual([
      "/",
      "/actions",
      "/timeline",
      "/archive"
    ]);
  });
});
