import { describe, expect, it } from "vitest";
import { navigationSections } from "./App.js";
import { newCommandId } from "./api/client.js";

describe("M5 navigation", () => {
  it("exposes scene entry and play destinations", () => {
    expect(navigationSections.map(({ path }) => path)).toEqual(["/", "/play"]);
  });
});

describe("command id", () => {
  it("generates non-empty idempotency keys", () => {
    const a = newCommandId();
    const b = newCommandId();
    expect(a.length).toBeGreaterThan(8);
    expect(a).not.toBe(b);
  });
});
