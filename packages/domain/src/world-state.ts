// DEV-001 世界状态最小 schema。
// 世界状态是某个推演时刻的结构化快照，包含人物、势力、资源、地理、关系等关键要素。
// 世界状态以世界状态数据库为唯一权威（M1 用内存对象表示），不依赖对话上下文记忆。

import type {
  FactionId,
  LocationId,
  PersonId,
  RelationId,
  ResourceId,
  SimulationTime,
  WorldlineId,
} from "./ids.js";

export interface Person {
  readonly id: PersonId;
  readonly name: string;
  readonly factionId?: FactionId;
  readonly role?: string;
  readonly locationId?: LocationId;
  readonly status?: string;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

export interface Faction {
  readonly id: FactionId;
  readonly name: string;
  readonly leaderId?: PersonId;
  readonly strength?: number;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

// 资源归属：用判别式联合区分势力与人物，避免裸 ID 无法分辨归属类型。
export type ResourceOwner =
  | { readonly kind: "faction"; readonly id: FactionId }
  | { readonly kind: "person"; readonly id: PersonId };

export interface Resource {
  readonly id: ResourceId;
  readonly name: string;
  readonly type: string;
  readonly quantity: number;
  readonly owner?: ResourceOwner;
  readonly locationId?: LocationId;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

export interface Location {
  readonly id: LocationId;
  readonly name: string;
  readonly type?: string;
  readonly parentId?: LocationId;
}

// 关系端点：同样用判别式联合区分势力与人物。
export type RelationEndpoint =
  | { readonly kind: "faction"; readonly id: FactionId }
  | { readonly kind: "person"; readonly id: PersonId };

export interface Relation {
  readonly id: RelationId;
  readonly from: RelationEndpoint;
  readonly to: RelationEndpoint;
  readonly type: string;
  readonly strength?: number;
}

export interface WorldState {
  readonly worldlineId: WorldlineId;
  readonly simulationTime: SimulationTime;
  readonly persons: Readonly<Record<PersonId, Person>>;
  readonly factions: Readonly<Record<FactionId, Faction>>;
  readonly resources: Readonly<Record<ResourceId, Resource>>;
  readonly locations: Readonly<Record<LocationId, Location>>;
  readonly relations: Readonly<Record<RelationId, Relation>>;
}
