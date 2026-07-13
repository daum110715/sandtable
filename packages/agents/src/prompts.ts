import type { ActorInput, RecorderInput } from "@sandtable/domain";

export const actorSystemPrompt = `你是通用推演沙盘中的「演员 Agent」。
根据当前结构化世界状态与用户改写，生成合理的推演叙事，以及拟议的状态变更意图（自然语言，不是最终结构化变更）。
规则：
- 只输出一个 JSON 对象，不要 Markdown 说明。
- 不得把推演叙事伪装成事实；这是基于用户设定的假设演绎。
- intendedChanges 只描述意图，不要包含 op/value 等 StateChange 字段。
JSON 形状：
{
  "narrative": "推演叙事文本",
  "intendedChanges": [
    { "description": "…", "entity": "person|faction|resource|location|relation", "targetId": "可选已有 id" }
  ]
}`;

export const buildActorUserPrompt = (input: ActorInput): string => {
  const ws = input.worldState;
  return [
    `世界设定: ${ws.setting?.title ?? "未命名世界"}`,
    `设定说明: ${ws.setting?.description ?? "未提供设定说明"}`,
    `模拟时刻: ${ws.simulationTime}`,
    `世界线: ${ws.worldlineId}`,
    `改写: ${input.rewrite.text}`,
    `当前世界状态 JSON:`,
    JSON.stringify(
      {
        persons: ws.persons,
        factions: ws.factions,
        resources: ws.resources,
        locations: ws.locations,
        relations: ws.relations,
      },
      null,
      0,
    ),
  ].join("\n");
};

export const recorderSystemPrompt = `你是通用推演沙盘中的「记录员 Agent」。
把演员 Agent 的叙事与意图拆解为可应用的结构化 StateChange 列表。
规则：
- 只输出一个 JSON 对象。
- stateChanges 必须可应用到给定世界状态：update/delete 的 id 必须已存在；create 的 value 必须含 id。
- entity 只能是 person|faction|resource|location|relation。
- op 只能是 create|update|delete。
- update 的 patch 为浅层字段补丁；attributes 若出现应是对象。
- 不要编造与意图无关的大规模删除。
JSON 形状：
{
  "narrative": "可沿用或精炼演员叙事",
  "stateChanges": [
    { "op": "update", "entity": "resource", "id": "…", "patch": { } }
    | { "op": "create", "entity": "person", "value": { "id": "…", "name": "…" } }
    | { "op": "delete", "entity": "relation", "id": "…" }
  ],
  "nextSimulationTime": "可选"
}`;

export const buildRecorderUserPrompt = (input: RecorderInput): string => {
  return [
    `世界设定: ${input.worldState.setting?.title ?? "未命名世界"}`,
    `设定说明: ${input.worldState.setting?.description ?? "未提供设定说明"}`,
    `模拟时刻: ${input.simulationTime}`,
    `改写: ${input.rewrite.text}`,
    `演员叙事: ${input.actorOutput.narrative.text}`,
    `演员意图: ${JSON.stringify(input.actorOutput.intendedChanges)}`,
    `当前世界状态 JSON:`,
    JSON.stringify(
      {
        persons: input.worldState.persons,
        factions: input.worldState.factions,
        resources: input.worldState.resources,
        locations: input.worldState.locations,
        relations: input.worldState.relations,
      },
      null,
      0,
    ),
  ].join("\n");
};
