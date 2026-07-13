# 本地开发

> M1–M6 已实现，1.0 闭环就绪。1.0 方向见 `docs/mvp.md`。

## 前置条件

- Node.js >= 22.19.0（推荐通过 nvm 管理）。
- npm；Windows PowerShell 若禁止 `npm.ps1`，使用 `npm.cmd`，无需修改执行策略。

## 工作区

- `apps/web`：React + Vite 前端（对话主区 + 上帝面板）。
- `apps/api`：Fastify HTTP API（健康检查、推演端点、指标）。
- `apps/worker`：AI 推演与多 Agent 后台任务入口。
- `packages/domain`：跨运行时共享的领域协议（世界状态、事件日志、Agent 接口）。
- `packages/agents`：Agent 推演实现（DeepSeek LLM 客户端、演员/记录员 Agent）。
- `packages/persistence`：SQLite 持久化层（世界状态存储、事件日志）。

## 命令

- `npm run dev:web`：启动 Web 开发服务器。
- `npm run dev:api`：启动 API（热重载）。
- `npm run dev:worker`：启动 Worker（热重载）。
- `npm run check`：依次执行类型检查、测试和构建。
- `npm run test`：运行所有测试。
- `npm run format`：格式化代码。

## 环境变量

- `.env` 不提交；新增变量时同步维护 `.env.example`。
- `DEEPSEEK_API_KEY`：DeepSeek API 密钥（可选；未配置时走桩 Agent）。

## 环境约束

- 依赖和缓存只保存在项目目录内。
- 不使用全局 npm 安装。
- API 和 Worker 在未配置数据库或模型凭证时仍应可执行基础健康检查。
