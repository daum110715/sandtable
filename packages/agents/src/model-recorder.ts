import {
  asAgentId,
  asFactionId,
  asLocationId,
  asPersonId,
  asRelationId,
  asResourceId,
  asSimulationTime,
  assertStateChangesAreValid,
  type EntityKind,
  type Faction,
  type Location,
  type Person,
  type RecorderAgent,
  type RecorderInput,
  type RecorderOutput,
  type Relation,
  type Resource,
  type StateChange,
} from "@sandtable/domain";
import { AgentError } from "./errors.js";
import { parseJsonObject } from "./json.js";
import type { LlmClient } from "./llm.js";
import { buildRecorderUserPrompt, recorderSystemPrompt } from "./prompts.js";
import { assertStateChangesConsistent } from "./validate.js";

const ENTITY_KINDS = new Set<EntityKind>([
  "person",
  "faction",
  "resource",
  "location",
  "relation",
]);

type EntityValue = Person | Faction | Resource | Location | Relation;

const brandId = (
  entity: EntityKind,
  id: string,
):
  | Person["id"]
  | Faction["id"]
  | Resource["id"]
  | Location["id"]
  | Relation["id"] => {
  switch (entity) {
    case "person":
      return asPersonId(id);
    case "faction":
      return asFactionId(id);
    case "resource":
      return asResourceId(id);
    case "location":
      return asLocationId(id);
    case "relation":
      return asRelationId(id);
  }
};

const parseStateChange = (raw: unknown): StateChange => {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AgentError("invalid_output", "stateChange must be object");
  }
  const o = raw as Record<string, unknown>;
  const op = o.op;
  const entity = o.entity;
  if (op !== "create" && op !== "update" && op !== "delete") {
    throw new AgentError("invalid_output", `invalid op: ${String(op)}`);
  }
  if (typeof entity !== "string" || !ENTITY_KINDS.has(entity as EntityKind)) {
    throw new AgentError("invalid_output", `invalid entity: ${String(entity)}`);
  }
  const kind = entity as EntityKind;

  if (op === "create") {
    if (
      o.value === null ||
      typeof o.value !== "object" ||
      Array.isArray(o.value)
    ) {
      throw new AgentError("invalid_output", "create requires value object");
    }
    const value = { ...(o.value as Record<string, unknown>) };
    if (typeof value.id !== "string") {
      throw new AgentError("invalid_output", "create value.id required");
    }
    value.id = brandId(kind, value.id);
    return {
      op: "create",
      entity: kind,
      value: value as unknown as EntityValue,
    };
  }

  if (typeof o.id !== "string") {
    throw new AgentError("invalid_output", `${op} requires id`);
  }
  const id = brandId(kind, o.id);

  if (op === "delete") {
    return { op: "delete", entity: kind, id };
  }

  if (
    o.patch === null ||
    typeof o.patch !== "object" ||
    Array.isArray(o.patch)
  ) {
    throw new AgentError("invalid_output", "update requires patch object");
  }
  return {
    op: "update",
    entity: kind,
    id,
    patch: o.patch as Readonly<Record<string, unknown>>,
  };
};

export class ModelRecorderAgent implements RecorderAgent {
  readonly id = asAgentId("model-recorder");
  readonly #llm: LlmClient;

  constructor(llm: LlmClient) {
    this.#llm = llm;
  }

  async record(input: RecorderInput): Promise<RecorderOutput> {
    const result = await this.#llm.complete({
      messages: [
        { role: "system", content: recorderSystemPrompt },
        { role: "user", content: buildRecorderUserPrompt(input) },
      ],
      json: true,
    });

    const raw = parseJsonObject(result.text);
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new AgentError(
        "invalid_output",
        "recorder output must be a JSON object",
      );
    }
    const obj = raw as Record<string, unknown>;

    const narrativeText =
      typeof obj.narrative === "string"
        ? obj.narrative
        : input.actorOutput.narrative.text;

    if (!Array.isArray(obj.stateChanges)) {
      throw new AgentError("invalid_output", "stateChanges must be an array");
    }

    const stateChanges = obj.stateChanges.map(parseStateChange);
    assertStateChangesAreValid(stateChanges);
    assertStateChangesConsistent(input.worldState, stateChanges);

    const base: RecorderOutput = {
      stateChanges,
      narrative: {
        text: narrativeText,
        ...(input.actorOutput.narrative.actorAgentId !== undefined
          ? { actorAgentId: input.actorOutput.narrative.actorAgentId }
          : {}),
      },
    };

    if (
      typeof obj.nextSimulationTime === "string" &&
      obj.nextSimulationTime.length > 0
    ) {
      return {
        ...base,
        nextSimulationTime: asSimulationTime(obj.nextSimulationTime),
      };
    }
    return base;
  }
}
