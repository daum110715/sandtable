import {
  StubActorAgent,
  StubRecorderAgent,
  type ActorAgent,
  type RecorderAgent,
} from "@sandtable/domain";
import { createDeepSeekClientFromEnv, DeepSeekClient } from "./deepseek.js";
import type { LlmClient } from "./llm.js";
import { ModelActorAgent } from "./model-actor.js";
import { ModelRecorderAgent } from "./model-recorder.js";

export type AgentMode = "stub" | "model";

export interface ResolveAgentsOptions {
  readonly env?: NodeJS.ProcessEnv;
  /** 强制模式；默认根据环境推断 */
  readonly mode?: AgentMode;
  /** 注入 LLM（测试或自定义供应商） */
  readonly llm?: LlmClient;
}

export interface ResolvedAgents {
  readonly mode: AgentMode;
  readonly actor: ActorAgent;
  readonly recorder: RecorderAgent;
  readonly provider?: string;
  readonly model?: string;
}

/**
 * 解析演员/记录员实现。
 * - mode=stub 或无密钥：内存桩
 * - mode=model 或存在 DEEPSEEK_API_KEY：DeepSeek 模型 Agent
 */
export const resolveAgents = (options: ResolveAgentsOptions = {}): ResolvedAgents => {
  const env = options.env ?? process.env;
  const forced = options.mode ?? (env.SANDTABLE_AGENT_MODE as AgentMode | undefined);

  if (forced === "stub") {
    return {
      mode: "stub",
      actor: new StubActorAgent(),
      recorder: new StubRecorderAgent(),
    };
  }

  const llm =
    options.llm ??
    createDeepSeekClientFromEnv(env) ??
    (forced === "model"
      ? (() => {
          throw new Error("SANDTABLE_AGENT_MODE=model requires DEEPSEEK_API_KEY or llm");
        })()
      : undefined);

  if (llm === undefined) {
    return {
      mode: "stub",
      actor: new StubActorAgent(),
      recorder: new StubRecorderAgent(),
    };
  }

  return {
    mode: "model",
    actor: new ModelActorAgent(llm),
    recorder: new ModelRecorderAgent(llm),
    provider: llm.provider,
    model: llm.model,
  };
};

export { DeepSeekClient };
