import { AgentError } from "./errors.js";

/** 从模型文本中解析 JSON（允许 ```json 围栏）。 */
export const parseJsonObject = (text: string): unknown => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(candidate) as unknown;
  } catch (e) {
    // 尝试截取首尾花括号
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as unknown;
      } catch {
        // fall through
      }
    }
    throw new AgentError("invalid_output", "model output is not valid JSON", {
      cause: e,
    });
  }
};
