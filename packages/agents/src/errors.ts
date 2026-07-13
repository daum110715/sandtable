export type AgentErrorCode =
  | "timeout"
  | "rejected"
  | "invalid_output"
  | "network"
  | "config";

/** 模型/解析失败；编排层不写世界状态、不追加事件。 */
export class AgentError extends Error {
  readonly code: AgentErrorCode;
  readonly retryable: boolean;

  constructor(code: AgentErrorCode, message: string, options?: { retryable?: boolean; cause?: unknown }) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AgentError";
    this.code = code;
    this.retryable = options?.retryable ?? (code === "timeout" || code === "network");
  }
}

export const isAgentError = (e: unknown): e is AgentError => e instanceof AgentError;
