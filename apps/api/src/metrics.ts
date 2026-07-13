// DEV-030 最小进程内指标（无外部 APM）。

export interface ApiMetricsSnapshot {
  readonly deduceTotal: number;
  readonly deduceApplied: number;
  readonly deduceDuplicate: number;
  readonly deduceFailed: number;
  readonly deduceRateLimited: number;
  readonly deduceValidationError: number;
}

export class ApiMetrics {
  #deduceTotal = 0;
  #deduceApplied = 0;
  #deduceDuplicate = 0;
  #deduceFailed = 0;
  #deduceRateLimited = 0;
  #deduceValidationError = 0;

  increment(field: Exclude<keyof ApiMetricsSnapshot, never>): void {
    switch (field) {
      case "deduceTotal":
        this.#deduceTotal += 1;
        break;
      case "deduceApplied":
        this.#deduceApplied += 1;
        break;
      case "deduceDuplicate":
        this.#deduceDuplicate += 1;
        break;
      case "deduceFailed":
        this.#deduceFailed += 1;
        break;
      case "deduceRateLimited":
        this.#deduceRateLimited += 1;
        break;
      case "deduceValidationError":
        this.#deduceValidationError += 1;
        break;
    }
  }

  snapshot(): ApiMetricsSnapshot {
    return {
      deduceTotal: this.#deduceTotal,
      deduceApplied: this.#deduceApplied,
      deduceDuplicate: this.#deduceDuplicate,
      deduceFailed: this.#deduceFailed,
      deduceRateLimited: this.#deduceRateLimited,
      deduceValidationError: this.#deduceValidationError,
    };
  }
}
