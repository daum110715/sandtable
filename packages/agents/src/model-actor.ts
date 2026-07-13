import {
  asAgentId,
  assertActorOutputIsStateless,
  type ActorAgent,
  type ActorInput,
  type ActorOutput,
  type EntityKind,
  type IntendedChange,
} from "@sandtable/domain";
import { AgentError } from "./errors.js";
import { parseJsonObject } from "./json.js";
import type { LlmClient } from "./llm.js";
import { actorSystemPrompt, buildActorUserPrompt } from "./prompts.js";

const ENTITY_KINDS = new Set<EntityKind>([
  "person",
  "faction",
  "resource",
  "location",
  "relation",
]);

export class ModelActorAgent implements ActorAgent {
  readonly id = asAgentId("model-actor");
  readonly #llm: LlmClient;

  constructor(llm: LlmClient) {
    this.#llm = llm;
  }

  async deduce(input: ActorInput): Promise<ActorOutput> {
    const result = await this.#llm.complete({
      messages: [
        { role: "system", content: actorSystemPrompt },
        { role: "user", content: buildActorUserPrompt(input) },
      ],
      json: true,
    });

    const raw = parseJsonObject(result.text);
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new AgentError(
        "invalid_output",
        "actor output must be a JSON object",
      );
    }
    const obj = raw as Record<string, unknown>;
    const narrativeText =
      typeof obj.narrative === "string"
        ? obj.narrative
        : typeof (obj.narrative as { text?: string } | undefined)?.text ===
            "string"
          ? (obj.narrative as { text: string }).text
          : undefined;
    if (narrativeText === undefined || narrativeText.length === 0) {
      throw new AgentError("invalid_output", "actor narrative missing");
    }

    const intendedRaw = obj.intendedChanges;
    if (intendedRaw !== undefined && !Array.isArray(intendedRaw)) {
      throw new AgentError(
        "invalid_output",
        "intendedChanges must be an array",
      );
    }

    const intendedChanges: IntendedChange[] = [];
    for (const item of intendedRaw ?? []) {
      if (item === null || typeof item !== "object" || Array.isArray(item)) {
        throw new AgentError("invalid_output", "intendedChange must be object");
      }
      const row = item as Record<string, unknown>;
      if (typeof row.description !== "string" || row.description.length === 0) {
        throw new AgentError(
          "invalid_output",
          "intendedChange.description required",
        );
      }
      const change: {
        description: string;
        entity?: EntityKind;
        targetId?: string;
      } = { description: row.description };
      if (
        typeof row.entity === "string" &&
        ENTITY_KINDS.has(row.entity as EntityKind)
      ) {
        change.entity = row.entity as EntityKind;
      }
      if (typeof row.targetId === "string") {
        change.targetId = row.targetId;
      }
      intendedChanges.push(change);
    }

    const output: ActorOutput = {
      narrative: {
        text: narrativeText,
        actorAgentId: this.id,
      },
      intendedChanges,
    };
    assertActorOutputIsStateless(output);
    return output;
  }
}
