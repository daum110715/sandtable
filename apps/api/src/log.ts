import { redactSecrets } from "./security.js";

export type LogLevel = "info" | "warn" | "error";

export interface LogEvent {
  readonly level: LogLevel;
  readonly msg: string;
  readonly requestId?: string;
  readonly route?: string;
  readonly [key: string]: unknown;
}

/** 结构化日志到 stdout；自动脱敏。 */
export const logStructured = (event: LogEvent): void => {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    ...event,
    msg: redactSecrets(event.msg),
  });
  // 故意不用 console 以外的 sink；测试可 spy
  if (event.level === "error") {
    console.error(line);
  } else if (event.level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
};
