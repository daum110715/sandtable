import type { Rewrite } from "../events.js";
import { asSimulationTime, asWorldlineId } from "../ids.js";
import type { WorldState } from "../world-state.js";

/**
 * 根据用户输入创建通用推演起点。
 * 不内置人物、势力或情节；这些要素由用户设定和后续推演建立。
 */
export const createCustomInitialState = (input: {
  readonly title?: string;
  readonly description: string;
}): WorldState => ({
  worldlineId: asWorldlineId("custom-world"),
  simulationTime: asSimulationTime("起始时刻"),
  setting: {
    title: input.title?.trim() || "未命名世界",
    description: input.description.trim(),
  },
  persons: {},
  factions: {},
  resources: {},
  locations: {},
  relations: {},
});

/** 通用测试样例，不代表产品内置场景。 */
export const sampleRewrites: Record<"first" | "second", Rewrite> = {
  first: {
    text: "让第一批探索者建立补给站",
    submittedAt: "2026-07-13T00:00:00.000Z",
  },
  second: {
    text: "各方同意共享发现",
    submittedAt: "2026-07-13T00:01:00.000Z",
  },
};
