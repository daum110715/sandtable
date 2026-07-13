// 核心不变量断言（对应 architecture.md 核心不变量与 M1 退出条件）。
// 不变量 1、5 由类型结构保证（见注释），2、3、4、6 提供运行时断言。

import type { ActorOutput } from "./agents.js";
import type { DeductionEvent, StateChange } from "./events.js";
import { DomainError } from "./errors.js";

/**
 * 不变量 1：ActorOutput 不含 StateChange（演员 Agent 无写世界状态路径）。
 * 类型层面保证：ActorOutput 只有 narrative + intendedChanges，IntendedChange 无 op/value/id。
 * 运行时再防止误把 StateChange 字段塞进 intendedChanges。
 */
export const assertActorOutputIsStateless = (output: ActorOutput): void => {
  for (const c of output.intendedChanges) {
    if ("op" in c || "value" in c) {
      throw new DomainError(
        "invariant_violation",
        "ActorOutput.intendedChanges must not carry StateChange fields (op/value)",
      );
    }
  }
};

/** 不变量 2：事件日志仅追加，不缩短、不修改既有条目。 */
export const assertAppendOnly = (
  before: readonly DeductionEvent[],
  after: readonly DeductionEvent[],
): void => {
  if (after.length < before.length) {
    throw new DomainError(
      "invariant_violation",
      "event log shrank: append-only violated",
    );
  }
  for (let i = 0; i < before.length; i++) {
    if (after[i] !== before[i]) {
      throw new DomainError(
        "invariant_violation",
        `event log mutated existing entry at index ${i}`,
      );
    }
  }
};

/** 不变量 3：状态变更合法性（闭环中 StateChange 应只来自 RecorderOutput）。 */
export const assertStateChangesAreValid = (
  changes: readonly StateChange[],
): void => {
  for (const c of changes) {
    if (c.op === "create" && c.value === undefined) {
      throw new DomainError(
        "invariant_violation",
        "create change missing value",
      );
    }
    if ((c.op === "update" || c.op === "delete") && c.id === undefined) {
      throw new DomainError("invariant_violation", `${c.op} change missing id`);
    }
  }
};

/** 不变量 4：因果链可追溯 -- 首事件无前置，其余指向前一事件 id。 */
export const assertCausalChain = (log: readonly DeductionEvent[]): void => {
  for (let i = 0; i < log.length; i++) {
    const ev = log[i]!;
    if (i === 0) {
      if (ev.causal.previousEventId !== undefined) {
        throw new DomainError(
          "invariant_violation",
          "first event must not reference a previous event",
        );
      }
    } else {
      const prev = log[i - 1]!;
      if (ev.causal.previousEventId !== prev.id) {
        throw new DomainError(
          "invariant_violation",
          `event ${ev.id} causal chain broken`,
        );
      }
    }
  }
};

// 不变量 5：WorldState 由 applyStateChange 产出（结构保证：调用方只用 applyStateChange 得新状态）。
// 无运行时断言。

/** 不变量 6 辅助：快照深度相等比较（replay 还原校验用）。 */
export const assertDeepEqual = (a: unknown, b: unknown): void => {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new DomainError("invariant_violation", "snapshots differ");
  }
};
