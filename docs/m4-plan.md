# M4 计划：Agent 推演闭环

> 状态：已实现（分支 `feature/m4-agent-deduction`，2026-07-13）。依据 development-plan M4、ADR-0008。

## 决策

| ID | 结论 |
|---|---|
| D007 | 自研轻量编排（`ActorAgent`/`RecorderAgent`） |
| D014 | DeepSeek（`deepseek-v4-flash`，OpenAI 兼容） |
| D015 | API 同进程 SDK（非 Cloudflare） |

## 交付

| 任务 | 内容 |
|---|---|
| DEV-015 | `packages/agents`：`LlmClient` + DeepSeek fetch 客户端；密钥环境变量 |
| DEV-016 | `ModelActorAgent`：读世界状态+改写 → 叙事+意图 JSON |
| DEV-017 | `ModelRecorderAgent`：意图 → `StateChange[]` JSON |
| DEV-018 | 写回前最小校验（实体存在性、op 合法性） |
| DEV-019 | 超时/无效输出抛错；编排层不写状态；API 返回可重试错误 |

## 退出条件

- 演员只读、记录员写回（接口不变）
- 无效变更不入库
- 无密钥时桩模式，`npm run check` 无网络依赖

## 环境变量

| 变量 | 说明 |
|---|---|
| `DEEPSEEK_API_KEY` | 有则用真模型 |
| `DEEPSEEK_MODEL` | 默认 `deepseek-v4-flash` |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` |
| `SANDTABLE_AGENT_MODE` | `stub` 强制桩；`model` 要求密钥 |
| `SANDTABLE_LLM_TIMEOUT_MS` | 默认 60000 |
