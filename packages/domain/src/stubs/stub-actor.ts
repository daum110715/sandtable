// 内存桩演员 Agent：不调用模型，按改写关键词返回固定叙事 + 自然语言意图。
// 仅用于 M1 验证协议闭环；M4 将由真实模型实现同一 ActorAgent 接口。

import type { ActorAgent, ActorInput, ActorOutput } from "../agents.js";
import { asAgentId } from "../ids.js";

export const stubActorAgentId = asAgentId("stub-actor");

export class StubActorAgent implements ActorAgent {
  readonly id = stubActorAgentId;

  deduce(input: ActorInput): ActorOutput {
    const text = input.rewrite.text;

    if (text.includes("西北风")) {
      return {
        narrative: {
          text: "西北风起，火船反烧吴军水寨，周瑜火攻失效，孙刘联军被迫退守夏口。",
          actorAgentId: this.id,
        },
        intendedChanges: [
          { description: "风向由东南风转为西北风", entity: "resource", targetId: "resource-wind" },
          { description: "吴军水寨受损", entity: "resource", targetId: "resource-sun-fleet" },
        ],
      };
    }

    if (text.includes("退守许都")) {
      return {
        narrative: {
          text: "曹操采纳贾诩建议放弃水战，全军北撤退守许都，南方暂归平静。",
          actorAgentId: this.id,
        },
        intendedChanges: [
          { description: "曹操撤离乌林，退守许昌", entity: "person", targetId: "person-caocao" },
        ],
      };
    }

    return {
      narrative: {
        text: "推演：改写未触发已知分支，世界状态维持不变。",
        actorAgentId: this.id,
      },
      intendedChanges: [],
    };
  }
}
