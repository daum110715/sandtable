// 内存桩演员 Agent：不调用模型，但仍产出通用变更意图，保证本地默认路径
// 可以验证「改写 → 推演 → 状态写回 → 事件回溯」的完整业务闭环。

import type { ActorAgent, ActorInput, ActorOutput } from "../agents.js";
import { asAgentId } from "../ids.js";

export const stubActorAgentId = asAgentId("stub-actor");

export class StubActorAgent implements ActorAgent {
  readonly id = stubActorAgentId;

  deduce(input: ActorInput): ActorOutput {
    const world = input.worldState.setting.title;
    return {
      narrative: {
        text: `在「${world}」中，改写“${input.rewrite.text}”已形成一项待记录的世界变化。桩模式以通用状态条目保存其影响；配置模型后可进一步拆解为人物、势力、资源、地点与关系的具体变化。`,
        actorAgentId: this.id,
      },
      intendedChanges: [
        {
          description: input.rewrite.text,
          entity: "resource",
        },
      ],
    };
  }
}
