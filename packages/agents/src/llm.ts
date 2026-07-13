// LLM 客户端端口：领域/Agent 不绑定供应商 SDK 类型。

export interface ChatMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface LlmCompleteRequest {
  readonly messages: readonly ChatMessage[];
  /** 期望模型返回 JSON 对象（若供应商支持 response_format）。 */
  readonly json?: boolean;
  readonly timeoutMs?: number;
}

export interface LlmCompleteResult {
  readonly text: string;
  readonly model: string;
}

export interface LlmClient {
  readonly provider: string;
  readonly model: string;
  complete(req: LlmCompleteRequest): Promise<LlmCompleteResult>;
}
