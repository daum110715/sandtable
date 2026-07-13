# 贡献指南

感谢您对 Sandtable 项目的关注！我们欢迎各种形式的贡献，包括但不限于代码、文档、Issue 报告和功能建议。

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境](#开发环境)
- [分支策略](#分支策略)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [代码规范](#代码规范)
- [文档规范](#文档规范)
- [Issue 规范](#issue-规范)
- [架构决策](#架构决策)
- [常见问题](#常见问题)

---

## 行为准则

参与本项目即表示您同意遵守我们的[行为准则](CODE_OF_CONDUCT.md)。请在参与贡献前阅读。

---

## 如何贡献

### 贡献类型

| 类型            | 说明                       | 入门难度 |
| :-------------- | :------------------------- | :------- |
| 🐛 **Bug 报告** | 发现并报告问题             | ⭐       |
| 📝 **文档改进** | 修正错别字、补充说明、翻译 | ⭐       |
| 💡 **功能建议** | 提出新功能或改进建议       | ⭐⭐     |
| 🧪 **测试补充** | 增加测试覆盖率             | ⭐⭐     |
| 🔧 **代码贡献** | 修复 Bug 或实现新功能      | ⭐⭐⭐   |
| 🏗️ **架构设计** | 参与架构讨论和决策         | ⭐⭐⭐⭐ |

### 第一次贡献？

如果您是第一次贡献，可以从以下任务开始：

1. 查看标记为 [`good first issue`](https://github.com/daum110715/sandtable/labels/good%20first%20issue) 的 Issue
2. 改进文档中的错别字或不清晰之处
3. 补充测试用例

---

## 开发环境

### 环境要求

- **Node.js** >= 22.19.0
- **npm**（随 Node.js 附带）
- **Git**

### 搭建步骤

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/<your-username>/sandtable.git
cd sandtable

# 2. 安装依赖
npm install

# 3. 验证环境
npm run check

# 4. 启动开发服务
npm run dev:web    # 前端 PWA
npm run dev:api    # API 服务
npm run dev:worker # Worker
```

> **Windows 用户注意：** 如果 PowerShell 禁止 `npm.ps1`，请使用 `npm.cmd run check`。

### 环境约束

- 所有依赖、缓存和构建产物**必须**位于项目目录内
- **禁止**修改全局包、PATH、Shell 策略或项目外配置
- `.env` 文件已被 `.gitignore` 排除；新增环境变量时**必须**同步更新 `.env.example`

---

## 分支策略

```
main (受保护)
  │
  ├── feat/xxx      # 新功能
  ├── fix/xxx       # Bug 修复
  ├── docs/xxx      # 文档更新
  ├── refactor/xxx  # 重构
  ├── test/xxx      # 测试补充
  └── chore/xxx     # 构建/工具链
```

### 分支命名规范

- 使用小写英文和连字符
- 前缀表明分支用途
- 简要描述变更内容

示例：

- `feat/event-ledger-inmemory`
- `fix/health-check-timeout`
- `docs/architecture-diagram`
- `refactor/domain-branded-types`

---

## 提交规范

项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交格式

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### 类型（type）

| 类型       | 说明                              | 示例                                     |
| :--------- | :-------------------------------- | :--------------------------------------- |
| `feat`     | 新功能                            | `feat(domain): add EventId branded type` |
| `fix`      | Bug 修复                          | `fix(api): health check timeout`         |
| `docs`     | 文档更新                          | `docs(readme): add architecture diagram` |
| `style`    | 代码格式（不影响功能）            | `style(web): fix indentation`            |
| `refactor` | 重构（既不修复 Bug 也不添加功能） | `refactor(api): extract route handlers`  |
| `perf`     | 性能优化                          | `perf(worker): cache model responses`    |
| `test`     | 测试补充                          | `test(domain): add WorldlineId tests`    |
| `chore`    | 构建/工具链变更                   | `chore: update vitest config`            |
| `ci`       | CI 配置变更                       | `ci: add GitHub Actions workflow`        |
| `revert`   | 回滚                              | `revert: revert feat(xxx)`               |

### 范围（scope）

可选，表明变更影响的模块：

- `domain` — 共享领域协议
- `api` — Fastify API
- `web` — React PWA
- `worker` — Pi Worker
- `docs` — 文档
- `ci` — CI/CD
- `deps` — 依赖更新

### 示例

```bash
# 简单提交
git commit -m 'docs: fix typo in architecture.md'

# 带范围
git commit -m 'feat(domain): add ActorId branded type'

# 带正文
git commit -m 'refactor(api): extract health check handler

Move health check logic into a separate handler module
for better testability and separation of concerns.'

# Breaking change
git commit -m 'feat(domain)!: change WorldlineId format

BREAKING CHANGE: WorldlineId now uses UUID v7 instead of ULID'
```

---

## Pull Request 流程

### 1. 准备

```bash
# 确保基于最新的 main 分支
git checkout main
git pull origin main

# 创建特性分支
git checkout -b feat/your-feature
```

### 2. 开发

```bash
# 编写代码
# ...

# 运行验证
npm run check

# 提交更改
git add .
git commit -m 'feat(domain): your feature description'
```

### 3. 提交 PR

```bash
# 推送分支
git push origin feat/your-feature

# 在 GitHub 上创建 Pull Request
```

### 4. PR 要求

- [ ] 标题遵循 Conventional Commits 规范
- [ ] 描述说明变更内容和动机
- [ ] 关联相关 Issue（如有）
- [ ] 通过 `npm run check` 验证
- [ ] 更新相关文档
- [ ] 添加必要的测试
- [ ] 不包含 `.env` 文件或敏感信息

### 5. 代码审查

- 所有 PR 需要至少一位维护者审查
- 审查通过后，维护者会合并 PR
- 如有修改意见，请及时响应

### 6. PR 模板

提交 PR 时，请使用以下模板：

```markdown
## 变更说明

简要描述本次变更的内容。

## 变更类型

- [ ] 新功能（feat）
- [ ] Bug 修复（fix）
- [ ] 文档更新（docs）
- [ ] 重构（refactor）
- [ ] 测试补充（test）
- [ ] 其他（chore）

## 关联 Issue

Closes #xxx

## 测试说明

描述如何验证本次变更。

## 截图（如适用）

如有 UI 变更，请提供截图。
```

---

## 代码规范

### TypeScript 配置

项目使用严格的 TypeScript 配置：

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

### 代码风格

- **缩进**：2 空格
- **换行符**：LF
- **编码**：UTF-8
- **最大行宽**：100 字符（推荐）

### 格式化

```bash
# 格式化所有文件
npm run format

# 检查格式（不修改）
npm run format:check
```

### 命名规范

| 类型       | 规范                      | 示例                                |
| :--------- | :------------------------ | :---------------------------------- |
| 文件名     | kebab-case                | `event-ledger.ts`                   |
| 类名       | PascalCase                | `WorldlineId`                       |
| 接口名     | PascalCase（无 `I` 前缀） | `WorkerStatus`                      |
| 函数名     | camelCase                 | `getWorkerStatus`                   |
| 常量       | UPPER_SNAKE_CASE          | `systemIdentity`                    |
| 变量       | camelCase                 | `simulationTime`                    |
| 品牌化类型 | PascalCase + `Id` 后缀    | `WorldlineId`, `ActorId`, `EventId` |

### 导入规范

```typescript
// 1. Node.js 内置模块
import { readFileSync } from "node:fs";

// 2. 第三方模块
import Fastify from "fastify";

// 3. 项目内部模块（使用包名）
import { systemIdentity } from "@sandtable/domain";

// 4. 相对路径（同一包内）
import { getWorkerStatus } from "./status.js";
```

> **注意**：由于启用了 `verbatimModuleSyntax`，ESM 导入必须包含 `.js` 扩展名。

---

## 文档规范

### 文档语言

- 项目文档使用**简体中文**
- 源文件注释使用**简体中文**（JSDoc + inline）
- 测试文件的 `describe`/`it` 名称使用**英文**
- Commit 信息使用**英文**

### 文档结构

- 所有文档位于 `docs/` 目录
- 使用 [Markdown](https://www.markdownguide.org/) 格式
- 遵循 `docs/README.md` 中定义的阅读顺序

### 领域术语

编写文档时**必须**使用 [CONTEXT.md](CONTEXT.md) 中定义的规范术语。示例：

| ✅ 正确  | ❌ 避免            |
| :------- | :----------------- |
| 历史基线 | 初始数据、背景故事 |
| 世界线   | 存档、剧本         |
| 事件     | 消息、日志         |
| 改写者   | 玩家角色、上帝视角 |
| 改写指令 | 行动意图、用户消息 |
| 行动意图 | 命令、事件         |
| 裁决     | 生成、执行         |
| 认知回合 | 模拟回合、世界更新 |

### 决策记录

- 重要架构决策**必须**记录到 `docs/adr/`
- 使用 `docs/templates/adr.md` 模板
- 决策状态：`Proposed` → `Accepted` / `Rejected` / `Superseded`

---

## Issue 规范

### Bug 报告

使用 [Bug 报告模板](https://github.com/daum110715/sandtable/issues/new?template=bug_report.md)：

```markdown
## Bug 描述

简要描述遇到的问题。

## 复现步骤

1. 执行 '...'
2. 点击 '...'
3. 看到错误 '...'

## 期望行为

描述您期望的行为。

## 实际行为

描述实际发生的行为。

## 环境信息

- OS: [例如 Windows 11, macOS 14]
- Node.js: [例如 22.19.0]
- npm: [例如 10.x]

## 日志/截图

如适用，请提供日志或截图。
```

### 功能建议

使用 [功能建议模板](https://github.com/daum110715/sandtable/issues/new?template=feature_request.md)：

```markdown
## 功能描述

简要描述您希望添加的功能。

## 使用场景

描述该功能的使用场景和动机。

## 建议方案

描述您建议的实现方案（如有）。

## 替代方案

描述您考虑过的其他方案。

## 补充信息

其他相关信息。
```

### Issue 标签

| 标签               | 说明               |
| :----------------- | :----------------- |
| `needs-triage`     | 待分类             |
| `needs-info`       | 需要更多信息       |
| `ready-for-agent`  | 可由 AI Agent 处理 |
| `ready-for-human`  | 需要人工处理       |
| `good first issue` | 适合新手           |
| `help wanted`      | 需要帮助           |
| `bug`              | Bug 报告           |
| `enhancement`      | 功能增强           |
| `documentation`    | 文档相关           |
| `question`         | 问题咨询           |

---

## 架构决策

### 何时需要 ADR？

以下情况需要创建架构决策记录（ADR）：

- 引入新的技术栈或框架
- 改变核心架构模式
- 影响多个模块的设计决策
- 长期、高代价或反直觉的技术选择

### ADR 流程

1. 使用 `docs/templates/adr.md` 模板
2. 编写决策内容，状态设为 `Proposed`
3. 提交 PR 进行讨论
4. 维护者审查并决定状态（`Accepted` / `Rejected`）
5. 合并到 `docs/adr/` 目录
6. 同步更新 `docs/decision-register.md`

### 现有 ADR

| 编号                                                          | 标题                    | 状态        |
| :------------------------------------------------------------ | :---------------------- | :---------- |
| [ADR-0001](docs/adr/0001-use-pi-as-agent-foundation.md)       | 使用 Pi 作为 Agent 基础 | ✅ Accepted |
| [ADR-0002](docs/adr/0002-event-ledger-is-world-authority.md)  | 事件账本是世界权威      | ✅ Accepted |
| [ADR-0003](docs/adr/0003-ai-proposes-rules-decide.md)         | AI 提出，规则决定       | ✅ Accepted |
| [ADR-0004](docs/adr/0004-separate-history-from-simulation.md) | 历史与模拟分离          | ✅ Accepted |
| [ADR-0005](docs/adr/0005-user-is-root-history-rewriter.md)    | 用户是 Root 改写者      | ✅ Accepted |

---

## 常见问题

### Q: 我可以修改已确认的决策吗？

A: 已确认的决策（记录在 `docs/decision-register.md` 中）**不得**由贡献者直接修改。如需变更，请提交 Issue 说明理由，由项目所有者决定。

### Q: 我可以引入新的领域术语吗？

A: 请优先使用 [CONTEXT.md](CONTEXT.md) 中已定义的术语。如需引入新术语，请提交 PR 更新 CONTEXT.md 并说明理由。

### Q: 如何运行特定工作区的命令？

A: 使用 `--workspace` 参数：

```bash
npm run test --workspace @sandtable/domain
npm run build --workspace @sandtable/web
```

### Q: 为什么我的 PR 被要求修改？

A: 常见原因包括：

- 未通过 `npm run check` 验证
- 未遵循 Conventional Commits 规范
- 未使用规范领域术语
- 缺少必要的测试或文档
- 修改了已确认的决策

### Q: 我可以使用全局安装的工具吗？

A: **不可以。** 项目约束要求所有依赖必须位于项目目录内，禁止修改全局配置。

---

## 获取帮助

- 📖 查看[文档总览](docs/README.md)
- 💬 在 [Discussions](https://github.com/daum110715/sandtable/discussions) 中提问
- 🐛 在 [Issues](https://github.com/daum110715/sandtable/issues) 中报告问题

---

感谢您的贡献！🎉
