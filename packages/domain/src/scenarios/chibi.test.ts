import { describe, expect, it } from "vitest";
import { asPersonId, asResourceId } from "../ids.js";
import { chibiInitialState, chibiRewrites } from "./chibi.js";

describe("chibi scenario", () => {
  it("has three factions", () => {
    expect(Object.keys(chibiInitialState.factions)).toHaveLength(3);
  });

  it("includes key persons", () => {
    expect(chibiInitialState.persons[asPersonId("person-caocao")]?.name).toBe("曹操");
    expect(chibiInitialState.persons[asPersonId("person-zhouyu")]?.name).toBe("周瑜");
    expect(chibiInitialState.persons[asPersonId("person-zhugeliang")]?.name).toBe("诸葛亮");
  });

  it("cao fleet is chained at Wulin", () => {
    const fleet = chibiInitialState.resources[asResourceId("resource-cao-fleet")];
    expect(fleet?.attributes?.chained).toBe(true);
  });

  it("wind starts as southeast", () => {
    expect(chibiInitialState.resources[asResourceId("resource-wind")]?.attributes?.direction).toBe("东南风");
  });

  it("has three granularities of rewrites", () => {
    expect(chibiRewrites.fine.text).toContain("西北风");
    expect(chibiRewrites.medium.text).toContain("火攻失效");
    expect(chibiRewrites.coarse.text).toContain("退守许都");
  });
});
