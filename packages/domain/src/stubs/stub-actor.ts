// 内存桩演员 Agent：不调用模型，返回与具体题材无关的最小推演结果。
// 仅用于 M1 验证协议闭环；M4 将由真实模型实现同一 ActorAgent 接口。

import type { ActorAgent, ActorInput, ActorOutput } from "../agents.js";
import { asAgentId } from "../ids.js";

export const stubActorAgentId = asAgentId("stub-actor");

export class StubActorAgent implements ActorAgent {
  readonly id = stubActorAgentId;

  deduce(input: ActorInput): ActorOutput {
    return {
      narrative: {
        text: `桩模式已接收改写：“${input.rewrite.text}”。配置模型后将生成并写回具体的世界变化。`,
        actorAgentId: this.id,
      },
      intendedChanges: [],
    };
  }
}
