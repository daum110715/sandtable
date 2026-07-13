// DEV-018：将模型输出校验收敛到领域层，确保所有 Recorder 走同一套状态完整性规则。

import {
  assertStateChangesCanApply,
  isDomainError,
  type StateChange,
  type WorldState,
} from "@sandtable/domain";
import { AgentError } from "./errors.js";

/**
 * 将领域层的不可应用变更转换为模型输出错误，使 API 能以 422 返回。
 */
export const assertStateChangesConsistent = (
  state: WorldState,
  changes: readonly StateChange[],
): void => {
  try {
    assertStateChangesCanApply(state, changes);
  } catch (error) {
    if (isDomainError(error)) {
      throw new AgentError("invalid_output", error.message, { cause: error });
    }
    throw error;
  }
};
