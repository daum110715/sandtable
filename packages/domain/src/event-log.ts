// DEV-007 内存事件日志：只追加、不可原地修改、按顺序读取；支持按 commandId 查找。

import type { CommandId } from "./ids.js";
import type { DeductionEvent } from "./events.js";

export class InMemoryEventLog {
  #events: DeductionEvent[] = [];
  #byCommandId = new Map<string, DeductionEvent>();

  append(event: DeductionEvent): void {
    if (event.commandId !== undefined && this.#byCommandId.has(event.commandId)) {
      throw new Error(`duplicate commandId in event log: ${event.commandId}`);
    }
    this.#events.push(event);
    if (event.commandId !== undefined) {
      this.#byCommandId.set(event.commandId, event);
    }
  }

  /** 按追加顺序的只读快照（拷贝，防止外部持有可变引用）。 */
  all(): readonly DeductionEvent[] {
    return this.#events.slice();
  }

  at(index: number): DeductionEvent | undefined {
    return this.#events[index];
  }

  last(): DeductionEvent | undefined {
    return this.#events.length === 0 ? undefined : this.#events[this.#events.length - 1];
  }

  get length(): number {
    return this.#events.length;
  }

  findByCommandId(commandId: CommandId): DeductionEvent | undefined {
    return this.#byCommandId.get(commandId);
  }
}
