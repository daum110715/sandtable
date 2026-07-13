// DEV-008 / DEV-009 推演编排：接收改写 → 演员推演 → 记录员写回 → 逻辑事务提交状态与事件。
// 幂等：相同 commandId 不重复产生事件、不二次调用 Agent。
// M3：通过 runInTransaction 与持久化 adapter 对齐真实 DB 事务。

import type {
  ActorAgent,
  ActorOutput,
  RecorderAgent,
  RecorderOutput,
} from "./agents.js";
import type { DeductionEvent, Rewrite } from "./events.js";
import type { CommandId, EventId, SessionId, SimulationTime } from "./ids.js";
import { asEventId } from "./ids.js";
import {
  assertActorOutputIsStateless,
  assertStateChangesCanApply,
} from "./invariants.js";
import { applyStateChanges, buildEvent } from "./state-core.js";
import type { WorldState } from "./world-state.js";
import type { EventLog } from "./event-log.js";
import type { WorldStateStore } from "./world-state-store.js";

export interface DeduceCommand {
  readonly commandId: CommandId;
  readonly rewrite: Rewrite;
  readonly simulationTime?: SimulationTime;
  readonly sessionId?: SessionId;
}

export interface DeduceResult {
  readonly outcome: "applied" | "duplicate";
  readonly event: DeductionEvent;
  readonly worldState: WorldState;
  readonly actorOutput?: ActorOutput;
  readonly recorderOutput?: RecorderOutput;
}

export interface DeductionOrchestratorOptions {
  readonly store: WorldStateStore;
  readonly eventLog: EventLog;
  readonly actor: ActorAgent;
  readonly recorder: RecorderAgent;
  /** 可选：注入 EventId 生成，便于测试。 */
  readonly nextEventId?: () => EventId;
  /** 可选：注入记录时刻。 */
  readonly now?: () => string;
  /**
   * 逻辑/物理事务包装。内存默认直接执行；
   * SQLite 传入 db.transaction 以保证状态与事件同提交。
   */
  readonly runInTransaction?: <T>(fn: () => T) => T;
}

export class DeductionOrchestrator {
  readonly #store: WorldStateStore;
  readonly #eventLog: EventLog;
  readonly #actor: ActorAgent;
  readonly #recorder: RecorderAgent;
  readonly #nextEventId: () => EventId;
  readonly #now: () => string;
  readonly #runInTransaction: <T>(fn: () => T) => T;
  #eventSeq = 0;

  constructor(options: DeductionOrchestratorOptions) {
    this.#store = options.store;
    this.#eventLog = options.eventLog;
    this.#actor = options.actor;
    this.#recorder = options.recorder;
    this.#nextEventId =
      options.nextEventId ??
      (() => {
        this.#eventSeq += 1;
        return asEventId(`event-${this.#eventSeq}`);
      });
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#runInTransaction =
      options.runInTransaction ?? (<T>(fn: () => T) => fn());
  }

  async deduce(command: DeduceCommand): Promise<DeduceResult> {
    const existing = this.#eventLog.findByCommandId(command.commandId);
    if (existing !== undefined) {
      return {
        outcome: "duplicate",
        event: existing,
        worldState: this.#store.getState(),
      };
    }

    const state0 = this.#store.getState();
    const simulationTime = command.simulationTime ?? state0.simulationTime;

    const actorOutput = await this.#actor.deduce({
      worldState: state0,
      rewrite: command.rewrite,
    });
    assertActorOutputIsStateless(actorOutput);

    const recorderOutput = await this.#recorder.record({
      worldState: state0,
      rewrite: command.rewrite,
      actorOutput,
      simulationTime,
    });
    assertStateChangesCanApply(state0, recorderOutput.stateChanges);

    // 显式命令时刻代表调用方指定的推演落点，优先于记录员的自动推进。
    const nextSimulationTime =
      command.simulationTime ??
      recorderOutput.nextSimulationTime ??
      simulationTime;
    const nextStateBase = applyStateChanges(
      state0,
      recorderOutput.stateChanges,
    );
    const nextState: WorldState =
      nextStateBase.simulationTime === nextSimulationTime
        ? nextStateBase
        : { ...nextStateBase, simulationTime: nextSimulationTime };

    const previous = this.#eventLog.last();
    const event = buildEvent({
      id: this.#nextEventId(),
      worldlineId: state0.worldlineId,
      simulationTime: nextSimulationTime,
      rewrite: command.rewrite,
      narrative: recorderOutput.narrative,
      stateChanges: recorderOutput.stateChanges,
      commandId: command.commandId,
      recordedAt: this.#now(),
      ...(previous !== undefined ? { previousEventId: previous.id } : {}),
      ...(command.sessionId !== undefined
        ? { sessionId: command.sessionId }
        : {}),
    });

    // 事务提交点：状态与事件同步前进；此前失败则两者均未改。
    this.#runInTransaction(() => {
      this.#store.replace(nextState);
      this.#eventLog.append(event);
    });

    return {
      outcome: "applied",
      event,
      worldState: nextState,
      actorOutput,
      recorderOutput,
    };
  }
}
