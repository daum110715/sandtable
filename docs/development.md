# 本地开发

> 当前为技术原型框架；尚未实现历史业务。

## 前置条件

- Node.js 22.19.0 或更高版本（由当前 Pi 依赖要求）。
- npm；Windows PowerShell 若禁止 `npm.ps1`，使用 `npm.cmd`，无需修改执行策略。

## 工作区

- `apps/web`：React + Vite 移动 PWA。
- `apps/api`：Fastify HTTP API。
- `apps/worker`：Pi Agent 和后台任务入口。
- `packages/domain`：跨运行时共享的领域协议。

## 命令

- `npm run dev:web`：启动 Web 开发服务器。
- `npm run dev:api`：启动 API。
- `npm run dev:worker`：启动 Worker 框架入口。
- `npm run check`：依次执行类型检查、测试和构建。

## 环境约束

- 依赖和缓存只保存在项目目录内。
- 不使用全局 npm 安装。
- `.env` 不提交；后续新增变量时同步维护 `.env.example`。
- API 和 Worker 在未配置 PostgreSQL、Redis 或模型凭证时仍应可执行基础健康检查。
