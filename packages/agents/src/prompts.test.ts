import { describe, expect, it } from "vitest";
import {
  actorSystemPrompt,
  buildActorUserPrompt,
  recorderSystemPrompt,
  buildRecorderUserPrompt,
} from "./prompts.js";
import {
  asWorldlineId,
  asSimulationTime,
  asPersonId,
  asAgentId,
  type ActorInput,
  type RecorderInput,
  type ActorOutput,
} from "@sandtable/domain";

const worldState = {
  worldlineId: asWorldlineId("w1"),
  simulationTime: asSimulationTime("t0"),
  persons: { [asPersonId("p1")]: { id: asPersonId("p1"), name: "周瑜" } },
  factions: {},
  resources: {},
  locations: {},
  relations: {},
};

describe("actorSystemPrompt", () => {
  it("contains key instructions", () => {
    expect(actorSystemPrompt).toContain("演员 Agent");
    expect(actorSystemPrompt).toContain("intendedChanges");
    expect(actorSystemPrompt).toContain("JSON");
  });
});

describe("recorderSystemPrompt", () => {
  it("contains key instructions", () => {
    expect(recorderSystemPrompt).toContain("记录员 Agent");
    expect(recorderSystemPrompt).toContain("stateChanges");
    expect(recorderSystemPrompt).toContain("JSON");
  });
});

describe("buildActorUserPrompt", () => {
  it("includes simulation time and worldline", () => {
    const input: ActorInput = {
      worldState,
      rewrite: {
        text: "那天江上刮西北风",
        submittedAt: "2026-07-13T00:00:00.000Z",
      },
    };
    const prompt = buildActorUserPrompt(input);
    expect(prompt).toContain("模拟时刻: t0");
    expect(prompt).toContain("世界线: w1");
    expect(prompt).toContain("改写: 那天江上刮西北风");
  });

  it("includes serialized world state", () => {
    const input: ActorInput = {
      worldState,
      rewrite: { text: "test", submittedAt: "2026-07-13T00:00:00.000Z" },
    };
    const prompt = buildActorUserPrompt(input);
    expect(prompt).toContain("当前世界状态 JSON:");
    expect(prompt).toContain("周瑜");
  });
});

describe("buildRecorderUserPrompt", () => {
  it("includes actor narrative and intended changes", () => {
    const actorOutput: ActorOutput = {
      narrative: { text: "西北风起，火船反烧" },
      intendedChanges: [{ description: "风向转为西北" }],
    };
    const input: RecorderInput = {
      worldState,
      rewrite: {
        text: "那天江上刮西北风",
        submittedAt: "2026-07-13T00:00:00.000Z",
      },
      actorOutput,
      simulationTime: asSimulationTime("t1"),
    };
    const prompt = buildRecorderUserPrompt(input);
    expect(prompt).toContain("模拟时刻: t1");
    expect(prompt).toContain("演员叙事: 西北风起，火船反烧");
    expect(prompt).toContain("风向转为西北");
  });
});
