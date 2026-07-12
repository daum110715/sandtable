// DEV-008 / DEV-009 推演编排：接收改写 → 演员推演 → 记录员写回 → 逻辑事务提交状态与事件。
// 幂等：相同 commandId 不重复产生事件、不二次调用 Agent。

import type { ActorAgent, ActorOutput, RecorderAgent, RecorderOutput } from "./agents.js";
import type { DeductionEvent, Rewrite } from "./events.js";
import type { CommandId, EventId, SessionId, SimulationTime } from "./ids.js";
import { asEventId } from "./ids.js";
import {
  assertActorOutputIsStateless,
  assertStateChangesAreValid,
} from "./invariants.js";
import { applyStateChanges, buildEvent } from "./m1-loop.js";
import type { WorldState } from "./world-state.js";
import type { InMemoryEventLog } from "./event-log.js";
import type { InMemoryWorldStateStore } from "./world-state-store.js";

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
  readonly store: InMemoryWorldStateStore;
  readonly eventLog: InMemoryEventLog;
  readonly actor: ActorAgent;
  readonly recorder: RecorderAgent;
  /** 可选：注入 EventId 生成，便于测试。 */
  readonly nextEventId?: () => EventId;
  /** 可选：注入记录时刻。 */
  readonly now?: () => string;
}

export class DeductionOrchestrator {
  readonly #store: InMemoryWorldStateStore;
  readonly #eventLog: InMemoryEventLog;
  readonly #actor: ActorAgent;
  readonly #recorder: RecorderAgent;
  readonly #nextEventId: () => EventId;
  readonly #now: () => string;
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
    assertStateChangesAreValid(recorderOutput.stateChanges);

    const nextSimulationTime = recorderOutput.nextSimulationTime ?? simulationTime;
    const nextStateBase = applyStateChanges(state0, recorderOutput.stateChanges);
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
      ...(command.sessionId !== undefined ? { sessionId: command.sessionId } : {}),
    });

    // 逻辑事务提交点：状态与事件同步前进；此前失败则两者均未改。
    this.#store.replace(nextState);
    this.#eventLog.append(event);

    return {
      outcome: "applied",
      event,
      worldState: nextState,
      actorOutput,
      recorderOutput,
    };
  }
}
