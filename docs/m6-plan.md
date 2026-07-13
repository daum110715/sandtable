# M6 计划：1.0 硬化

> 状态：已实现（分支 `feature/m6-hardening`，2026-07-13）。

## 交付对照

| 任务 | 实现 |
|---|---|
| DEV-026 | `commandId` 校验 + 服务端幂等（已有）+ 前端同 id 自动重试；metrics 记 duplicate |
| DEV-027 | Agent 超时/失败 → 503 retryable；前端 `withRetry` 一次；模型失败不写库 |
| DEV-028 | 重启保事件测试、模型失败不写库、限流/校验故障路径 |
| DEV-029 | 改写长度/commandId 校验、速率限制、响应安全头、日志脱敏、bodyLimit |
| DEV-030 | 结构化日志 + `GET /api/v1/metrics` |
| DEV-031 | `docs/release-checklist.md` 发布清单 |

## 配置

| 变量 | 说明 |
|---|---|
| （默认） | 推演限流 30 次/分钟/IP |
| `deduceRateLimit: 0` | 测试关闭限流 |

## 说明

- 生产部署、云资源仍须项目所有者单独授权。
- 发布签字见 release-checklist。
