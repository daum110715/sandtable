// 品牌化标识类型。所有 ID 为 branded string，避免与普通字符串互相赋值。
// 构造助手用于在场景数据与测试中安全地把字符串打上品牌。

export type WorldlineId = string & { readonly __brand: "WorldlineId" };
export type PersonId = string & { readonly __brand: "PersonId" };
export type FactionId = string & { readonly __brand: "FactionId" };
export type ResourceId = string & { readonly __brand: "ResourceId" };
export type LocationId = string & { readonly __brand: "LocationId" };
export type RelationId = string & { readonly __brand: "RelationId" };
export type EventId = string & { readonly __brand: "EventId" };
export type SessionId = string & { readonly __brand: "SessionId" };
export type AgentId = string & { readonly __brand: "AgentId" };
export type SimulationTime = string & { readonly __brand: "SimulationTime" };
/** 改写提交幂等键（docs/data.md）；相同 commandId 不重复产生事件。 */
export type CommandId = string & { readonly __brand: "CommandId" };

// 旧概念 ActorId 保留（历史行动者标识）。
// 新方向下：“演员 Agent”用 AgentId，“世界状态人物”用 PersonId，避免概念混淆。
export type ActorId = string & { readonly __brand: "ActorId" };

export const asWorldlineId = (s: string): WorldlineId => s as WorldlineId;
export const asPersonId = (s: string): PersonId => s as PersonId;
export const asFactionId = (s: string): FactionId => s as FactionId;
export const asResourceId = (s: string): ResourceId => s as ResourceId;
export const asLocationId = (s: string): LocationId => s as LocationId;
export const asRelationId = (s: string): RelationId => s as RelationId;
export const asEventId = (s: string): EventId => s as EventId;
export const asSessionId = (s: string): SessionId => s as SessionId;
export const asAgentId = (s: string): AgentId => s as AgentId;
export const asSimulationTime = (s: string): SimulationTime =>
  s as SimulationTime;
export const asCommandId = (s: string): CommandId => s as CommandId;
