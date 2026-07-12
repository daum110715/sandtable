// DEV-003 / DEV-004 Agent 协议。
// 关键不变量（类型层面）：ActorAgent 的输入输出都不含写世界状态的能力——
// 输出只有叙事 + 自然语言意图（IntendedChange），不是 StateChange。
// 只有 RecorderAgent 输出 StateChange。这从契约上保证“演员 Agent 没有直接写世界状态的路径”。
//
// 协议为接口（seam）：M4 的真实模型实现同一接口，领域模块不认识供应商特有类型，
// 满足 D021“替换模型或 Agent 框架不改变世界状态的数据语义”。

import type { AgentId, SimulationTime } from "./ids.js";
import type { Narrative, Rewrite, StateChange, EntityKind } from "./events.js";
import type { WorldState } from "./world-state.js";

export interface ActorInput {
  readonly worldState: WorldState;
  readonly rewrite: Rewrite;
}

// 意图：自然语言描述，非权威状态变更。演员 Agent 只表达“想改什么”，不产出 StateChange。
export interface IntendedChange {
  readonly description: string;
  readonly entity?: EntityKind;
  readonly targetId?: string;
}

export interface ActorOutput {
  readonly narrative: Narrative;
  readonly intendedChanges: readonly IntendedChange[];
}

export interface ActorAgent {
  readonly id: AgentId;
  deduce(input: ActorInput): Promise<ActorOutput> | ActorOutput;
}

export interface RecorderInput {
  readonly worldState: WorldState;
  readonly rewrite: Rewrite;
  readonly actorOutput: ActorOutput;
  readonly simulationTime: SimulationTime;
}

export interface RecorderOutput {
  readonly stateChanges: readonly StateChange[];
  readonly narrative: Narrative;
  readonly nextSimulationTime?: SimulationTime;
}

export interface RecorderAgent {
  readonly id: AgentId;
  record(input: RecorderInput): Promise<RecorderOutput> | RecorderOutput;
}
