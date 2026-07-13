// 内存桩记录员 Agent：把演员的通用变更意图记录为结构化「世界变化」资源。
// 这不是题材规则，而是无模型时仍可验证状态推进的最小投影。
// 关键：StateChange 只在记录员产出，演员 Agent 无此能力（不变量 1）。

import type {
  RecorderAgent,
  RecorderInput,
  RecorderOutput,
} from "../agents.js";
import type { StateChange } from "../events.js";
import { asAgentId, asResourceId, asSimulationTime } from "../ids.js";

export const stubRecorderAgentId = asAgentId("stub-recorder");

export class StubRecorderAgent implements RecorderAgent {
  readonly id = stubRecorderAgentId;

  record(input: RecorderInput): RecorderOutput {
    const usedNumbers = Object.keys(input.worldState.resources)
      .map((id) => /^resource-effect-(\d+)$/.exec(id)?.[1])
      .filter((n): n is string => n !== undefined)
      .map(Number);
    const sequence =
      (usedNumbers.length === 0 ? 0 : Math.max(...usedNumbers)) + 1;
    const description = input.actorOutput.intendedChanges[0]?.description;
    const stateChanges: StateChange[] =
      description === undefined
        ? []
        : [
            {
              op: "create",
              entity: "resource",
              value: {
                id: asResourceId(`resource-effect-${sequence}`),
                name: `世界变化 ${sequence}`,
                type: "world-effect",
                quantity: 1,
                attributes: {
                  description,
                  source: "stub-recorder",
                },
              },
            },
          ];

    return {
      stateChanges,
      narrative: input.actorOutput.narrative,
      nextSimulationTime: asSimulationTime(`阶段 ${sequence}`),
    };
  }
}
