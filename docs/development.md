# 本地开发

> 当前为技术原型框架；推演业务尚未实现。1.0 方向见 `docs/mvp.md`。

## 前置条件

- Node.js 22.19.0 或更高版本。
- npm；Windows PowerShell 若禁止 `npm.ps1`，使用 `npm.cmd`，无需修改执行策略。

## 工作区

- `apps/web`：React + Vite 前端（对话主区 + 上帝面板）。
- `apps/api`：Fastify HTTP API。
- `apps/worker`：AI 推演与多 Agent 后台任务入口。
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
- API 和 Worker 在未配置数据库或模型凭证时仍应可执行基础健康检查。
- Agent 框架、模型路由、Agent 接入方式与数据存储技术为待定决策（D007、D014、D015、D016）；实现阶段前锁定。
