# 1.0 自研轻量 Agent + DeepSeek + 同进程接入

1.0 演员/记录员 Agent 采用**自研轻量编排**（实现领域 `ActorAgent`/`RecorderAgent` 接口，不绑 Pi 或其他重框架）；模型供应商为 **DeepSeek**（OpenAI 兼容 API）；接入方式为 **API 同进程 SDK** 调用。密钥仅服务端；无密钥或测试环境回退内存桩。

## Status

Accepted — 2026-07-13

## Context

M4 需接入真实模型推演。D007/D014/D015 待定。Worker 仓库内已有 Pi 依赖，但 ADR-0006 已取消将 Pi 作为 1.0 地基。1.0 单会话、不做过度设计；本仓库 `apps/worker` 指 Node 进程，与 Cloudflare Workers 无关。

## Candidates

### D007 框架

1. 自研轻量编排（领域接口 + 提示词 + LLM 客户端）
2. 沿用 Pi
3. 其他框架

### D014 供应商

1. DeepSeek  
2. xAI / OpenAI / 火山方舟等  

### D015 接入

1. API 同进程 SDK  
2. 本仓库 Node Worker 进程  
3. 同进程起步、预留 Worker  

## Decision

- **D007**：自研轻量编排；领域模块不认识供应商类型。
- **D014**：DeepSeek；`DEEPSEEK_API_KEY`；默认模型 `deepseek-v4-flash`（可用环境变量覆盖）；Base URL `https://api.deepseek.com`。
- **D015**：同进程 SDK（`apps/api` 内调用）；非 Cloudflare。
- 无密钥 / `SANDTABLE_AGENT_MODE=stub` 时使用 M1 内存桩，保证单元测试与本地无网可运行。
- 模型失败（超时、拒绝、无效 JSON）不写世界状态、不追加事件；可安全重试。

## Reason

最短路径跑通演员读状态 → 记录员写回；DeepSeek 为项目所有者指定；同进程降低 1.0 接线成本。替换供应商只需换 LLM 客户端实现，不改世界状态语义（D021）。

## Consequences

- 正面：实现薄、可测、密钥隔离、失败可降级。
- 负面：同进程模型调用会占用 API 事件循环；长耗时可后续迁 Worker。
- 后续：独立 Worker、多供应商路由、裁判 Agent。

## Confirmation

- 确认人：项目所有者  
- 确认日期：2026-07-13  
