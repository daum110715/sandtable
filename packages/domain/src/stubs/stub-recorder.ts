// 内存桩记录员 Agent：把演员 Agent 的意图拆解为结构化 StateChange 写回。
// 仅用于 M1 验证协议闭环；M4 将由真实模型实现同一 RecorderAgent 接口。
// 关键：StateChange 只在记录员产出，演员 Agent 无此能力（不变量 1）。

import type {
  RecorderAgent,
  RecorderInput,
  RecorderOutput,
} from "../agents.js";
import { asAgentId } from "../ids.js";

export const stubRecorderAgentId = asAgentId("stub-recorder");

export class StubRecorderAgent implements RecorderAgent {
  readonly id = stubRecorderAgentId;

  record(input: RecorderInput): RecorderOutput {
    return {
      stateChanges: [],
      narrative: input.actorOutput.narrative,
    };
  }
}
