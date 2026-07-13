export type DomainErrorCode =
  "invariant_violation" | "not_found" | "duplicate" | "invalid_state";

/** 领域层结构化错误；persistence 层复用。 */
export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(
    code: DomainErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(
      message,
      options?.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = "DomainError";
    this.code = code;
  }
}

export const isDomainError = (e: unknown): e is DomainError =>
  e instanceof DomainError;
