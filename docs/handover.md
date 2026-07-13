# 交接文档

> 最后更新：2026-07-13。M4（Agent 推演闭环）在分支 `feature/m4-agent-deduction`。

## 定位

历史模拟推演 AI（Sandtable）：自由改写 → AI 推演 → 结构化世界状态 + 事件日志。

## 进度

| 里程碑 | 状态 |
|---|---|
| M1 领域协议 | ✅ main |
| M2 内存编排 | ✅ main |
| M3 SQLite 持久化 | ✅ main |
| M4 Agent 推演 | ✅ 本分支 |
| M5 前端闭环 | 待开始 |
| M6 硬化 | 待开始 |

## 已确认决策（1.0）

- D016 SQLite（ADR-0007）
- D007 自研轻量编排 / D014 DeepSeek / D015 API 同进程（ADR-0008）

## M4 要点

- 包：`packages/agents`（`LlmClient`、`DeepSeekClient`、`ModelActorAgent`、`ModelRecorderAgent`、`resolveAgents`）
- 无 `DEEPSEEK_API_KEY` 或 `SANDTABLE_AGENT_MODE=stub` → 内存桩
- 模型失败 → `AgentError`，API `503/422`，**不写状态/事件**
- 写回前 `assertStateChangesConsistent`
- 环境变量见根目录 `.env.example`

## 验证

```bash
npm run check
# 真模型（可选）：设置 DEEPSEEK_API_KEY 后 npm run dev:api
```

## M5 下一步

场景入口 + 对话主区 + 上帝面板；API 已有 deduce/world-state/events 可接。

## 注意

- Worker = 本仓库 `apps/worker` Node 进程，**不是** Cloudflare Workers
- 密钥勿提交；仅服务端
