# 变更日志

本项目所有显著变更都将记录在此文件。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 计划中

- 事件核心模块（内存事件账本、裁决引擎、世界状态投影、回放）
- 赤壁之战历史基线（史料主张、行动者档案、开局设定）
- PostgreSQL 持久化
- Redis 队列
- Pi 认知循环
- 移动端纵向切片
- 世界线分支与回放
- 账户体系与分享

## [0.1.0] - 2026-07-12

### 新增

#### 项目框架

- 初始化 npm workspaces monorepo 结构
- 配置 TypeScript 严格模式（`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`verbatimModuleSyntax`）
- 配置 Vitest 测试框架（支持覆盖率报告）
- 配置 Prettier 代码格式化
- 配置 EditorConfig（UTF-8、LF、2 空格缩进）
- 添加 `.gitignore` 和 `.editorconfig`

#### 前端 PWA（`apps/web`）

- 创建 React 19 + Vite 8 PWA 应用框架
- 实现 4 页面路由结构：世界、改写、时间线、存档
- 实现移动端优先底部导航栏
- 支持安全区域适配（`safe-area-inset`）
- 支持深色/浅色主题切换
- 实现 44px 最小触摸目标
- 添加无障碍支持（skip-link、`prefers-reduced-motion`）
- 添加导航结构测试

#### API 服务（`apps/api`）

- 创建 Fastify 5 HTTP API 框架
- 实现 `GET /health` 健康检查端点
- 实现 `GET /api/v1` 基础端点
- 添加健康检查测试

#### Worker（`apps/worker`）

- 创建 Pi Agent Worker 框架
- 集成 `@earendil-works/pi-ai`、`@earendil-works/pi-agent-core`、`@earendil-works/pi-coding-agent`
- 实现 `getWorkerStatus()` 状态查询
- 添加状态查询测试

#### 共享领域协议（`packages/domain`）

- 定义 `systemIdentity`（系统标识：name、protocolVersion）
- 定义 `WorkerStatus` 接口
- 定义品牌化 ID 类型：`WorldlineId`、`ActorId`、`EventId`
- 添加协议标识稳定性测试

#### 文档

- 编写产品愿景文档（`docs/product-vision.md`）
- 编写系统架构文档（`docs/architecture.md`）
- 编写技术基线文档（`docs/technology.md`）
- 编写世界时间与事件模型文档（`docs/world-model.md`）
- 编写 MVP 范围文档（`docs/mvp.md`）
- 编写路线图文档（`docs/roadmap.md`）
- 编写 AI 治理文档（`docs/ai-governance.md`）
- 编写本地开发指南（`docs/development.md`）
- 编写 MVP 开发计划（`docs/development-plan.md`）
- 编写项目章程（`docs/project-charter.md`）
- 编写用户体验文档（`docs/user-experience.md`）
- 编写历史内容策略（`docs/historical-content.md`）
- 编写数据权威文档（`docs/data.md`）
- 编写安全策略文档（`docs/security-and-safety.md`）
- 编写质量门禁文档（`docs/quality.md`）
- 编写运维文档（`docs/operations.md`）
- 编写贡献指南（`docs/contributing.md`）
- 创建决策清单（`docs/decision-register.md`），记录 25 项已确认决策（D001-D025）
- 创建 5 份架构决策记录（ADR-0001 至 ADR-0005）
- 创建 4 份文档模板（ADR、功能规格、历史场景、评估场景）
- 创建 3 份 Agent 协作文档（Issue 规范、分类标签、领域文档）
- 创建领域语言规范（`CONTEXT.md`），定义 24 个核心术语
- 创建 AI Agent 协作规则（`AGENTS.md`）

### 架构决策

- **ADR-0001**：使用 Pi 作为 AI Agent 基础设施 ✅
- **ADR-0002**：事件账本是世界状态的权威来源 ✅
- **ADR-0003**：AI 提出行动意图，规则裁决定结果 ✅
- **ADR-0004**：历史基线与模拟推演严格分离 ✅
- **ADR-0005**：用户拥有世界线 Root 改写权限 ✅

---

## 版本说明

- **主版本**：不兼容的 API 变更
- **次版本**：向下兼容的功能性新增
- **修订版**：向下兼容的问题修正

## 链接

- [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)
- [语义化版本](https://semver.org/lang/zh-CN/)
- [Conventional Commits](https://www.conventionalcommits.org/)
