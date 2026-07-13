import { describe, expect, it } from "vitest";
import { createCustomInitialState } from "./custom.js";

describe("custom world setting", () => {
  it("creates an empty initial state from the user setting", () => {
    const state = createCustomInitialState({
      title: "浮岛联盟",
      description: "漂浮岛屿之间依靠有限水源维系贸易。",
    });
    expect(state.setting).toEqual({
      title: "浮岛联盟",
      description: "漂浮岛屿之间依靠有限水源维系贸易。",
    });
    expect(Object.values(state.persons)).toEqual([]);
    expect(Object.values(state.resources)).toEqual([]);
  });
});
