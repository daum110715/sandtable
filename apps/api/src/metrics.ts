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
  deduceTotal = 0;
  deduceApplied = 0;
  deduceDuplicate = 0;
  deduceFailed = 0;
  deduceRateLimited = 0;
  deduceValidationError = 0;

  snapshot(): ApiMetricsSnapshot {
    return {
      deduceTotal: this.deduceTotal,
      deduceApplied: this.deduceApplied,
      deduceDuplicate: this.deduceDuplicate,
      deduceFailed: this.deduceFailed,
      deduceRateLimited: this.deduceRateLimited,
      deduceValidationError: this.deduceValidationError,
    };
  }
}
