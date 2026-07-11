export const systemIdentity = {
  name: "sandtable",
  protocolVersion: "v1"
} as const;

export interface WorkerStatus {
  readonly name: string;
  readonly status: "ready" | "degraded" | "stopping";
  readonly protocolVersion: typeof systemIdentity.protocolVersion;
}

export type WorldlineId = string & { readonly __brand: "WorldlineId" };
export type ActorId = string & { readonly __brand: "ActorId" };
export type EventId = string & { readonly __brand: "EventId" };

