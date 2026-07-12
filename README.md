<div align="center">

# 🏯 Sandtable

**AI 驱动的历史沙盒 —— 探索"如果历史走了另一条路"**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.19.0-339933.svg?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg?logo=react)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000.svg?logo=fastify)](https://fastify.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-4.x-6e9f18.svg?logo=vitest)](https://vitest.dev/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[简体中文](README.md) | [English](README.en.md) | [文档总览](docs/README.md)

</div>

---

## 目录

- [项目简介](#项目简介)
- [核心特性](#核心特性)
- [架构总览](#架构总览)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [开发指南](#开发指南)
- [测试](#测试)
- [部署](#部署)
- [路线图](#路线图)
- [参与贡献](#参与贡献)
- [行为准则](#行为准则)
- [安全政策](#安全政策)
- [许可证](#许可证)
- [致谢](#致谢)

---

## 项目简介

**Sandtable** 是一个 AI 驱动的历史沙盒模拟器。玩家从有据可查的历史起点出发（例如公元 208 年的赤壁之战），通过下达"Root 改写"指令改变历史条件，观察 AI 驱动的历史行动者在规则约束下如何反应，最终生成可解释、可回放、可分支的架空时间线。

### 为什么做这个项目？

> "如果当时采取另一种行动，接下来可能发生什么？"

这是人类对历史最本能的好奇。Sandtable 的目标不是生成一个"看起来像历史"的故事，而是构建一个**有规则、有因果、可验证**的历史模拟系统——每一次状态变化都有来源、原因和事件记录，用户始终清楚哪些是史实、哪些是推演。

### 项目状态

> ⚠️ **当前阶段：技术原型（Prototype）**

本项目已完成技术框架搭建（monorepo、PWA shell、Fastify API、Pi Worker 接入、共享领域协议），尚未实现历史业务逻辑。我们正在积极开发 MVP，详见[路线图](#路线图)。

---

## 核心特性

### 🏛️ 历史与模拟分离

严格区分**历史基线**（有出处、不可被模拟反向改写的事实）和**模拟推演**（AI 生成的架空历史）。在存储和展示层面始终保持可区分性，杜绝将模型生成内容伪装成史实。

### 🔄 世界线分支与回放

每次改写指令都会创建新的世界线分支，父世界线永不被篡改。支持任意时刻的分支、回放和对比，完整保留因果链和决策依据。

### 🤖 AI 行动者认知系统

基于 [Pi](https://github.com/earendil-works/pi) 构建的多行动者认知系统。每个历史行动者拥有独立的观察视角、目标和工具能力，通过认知回合形成**行动意图**——而非直接产生结果。

### ⚖️ 规则裁决引擎

"AI 提出，规则决定"——行动意图必须经过裁决模块的合法性校验（可见性、资源、制度、时间约束），才能转化为权威事件。确保模拟结果可解释、可审计。

### 👑 用户 Root 权限

用户拥有世界线的 Root 改写权限，可以从任意模拟时刻下达改写指令。系统自动创建分支、记录干预事件，并让 AI 行动者基于新条件做出反应。AI 行动者永远无法获得 Root 权限。

### 📱 移动端优先

采用 PWA 技术，优先适配移动端体验。支持 320px+ 响应式布局、安全区域适配、深色/浅色主题切换，提供 44px 最小触摸目标。

---

## 架构总览

Sandtable 采用 **TypeScript 模块化单体** 架构，由三个可部署单元和一个共享领域协议组成：

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                            │
│              React PWA（移动端优先）                          │
│         世界 · 改写 · 时间线 · 存档                           │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                        API 层                                │
│                    Fastify HTTP API                          │
│              认证 · 世界线管理 · 改写指令                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                     领域核心层                                │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 历史知识  │  │ 世界编排  │  │ 改写指令  │  │ 行动者   │   │
│  │ 模块     │  │ 模块     │  │ 模块     │  │ 认知模块  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ 裁决引擎  │  │ 事件账本  │  │ 世界状态  │  │ 治理与   │   │
│  │          │  │ （权威）  │  │ 投影     │  │ 审计     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                     基础设施层                                │
│            PostgreSQL · Redis · S3 · Pi Agent               │
└─────────────────────────────────────────────────────────────┘
```

### 八大架构模块

| 模块 | 职责 |
|:-----|:-----|
| **历史知识模块** | 管理有出处的史料主张、置信度和冲突，为世界构建提供历史基线 |
| **世界编排模块** | 推进模拟时间、选择行动者认知回合、协调裁决、控制暂停/分支 |
| **改写指令模块** | 解析用户的 Root 改写指令，创建世界线分支和干预事件 |
| **行动者认知模块** | 基于 Pi 构建，向行动者提供观察/目标/工具，产出结构化行动意图 |
| **裁决引擎** | 校验行动意图的合法性，计算结果，生成权威事件 |
| **事件账本** | 不可变的仅追加事件存储，记录因果链、规则版本和随机性证据 |
| **世界状态投影** | 从事件账本构建可查询的世界状态快照，支持重建 |
| **治理与审计模块** | 控制工具能力、敏感操作审批、来源展示和运行时审计 |

### 关键不变量

1. 只有**改写指令模块**和**裁决引擎**可以产生改变世界的事件
2. 事件一旦进入账本即为**不可变**；修正通过补偿事件或新世界线完成
3. 行动者只能看到其**观察权限**允许的信息
4. 每个关键事件都记录**规则版本、输入依据和因果链**
5. 模型/Prompt/Pi 升级**不得静默改变**已有世界线的回放语义
6. 历史基线与模拟事件在**存储和展示层面始终可区分**
7. Root 改写**必须创建分支**，不能原地修改父世界线

---

## 技术栈

### 核心运行时

| 技术 | 版本 | 用途 |
|:-----|:-----|:-----|
| [TypeScript](https://www.typescriptlang.org/) | 7.x | 全栈语言（前端、后端、Worker、共享协议） |
| [Node.js](https://nodejs.org/) | ≥ 22.19.0 | 服务端运行时 |

### 前端（`apps/web`）

| 技术 | 版本 | 用途 |
|:-----|:-----|:-----|
| [React](https://react.dev/) | 19.x | UI 框架 |
| [React Router](https://reactrouter.com/) | 7.x | 客户端路由 |
| [TanStack Query](https://tanstack.com/query) | 5.x | 服务端状态管理 |
| [Vite](https://vite.dev/) | 8.x | 构建工具 |
| [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) | 1.x | PWA 支持 |

### 后端（`apps/api`）

| 技术 | 版本 | 用途 |
|:-----|:-----|:-----|
| [Fastify](https://fastify.dev/) | 5.x | HTTP 框架 |

### Worker（`apps/worker`）

| 技术 | 版本 | 用途 |
|:-----|:-----|:-----|
| [Pi AI](https://github.com/earendil-works/pi) | 0.80.x | 多模型 AI 层 |
| [Pi Agent Core](https://github.com/earendil-works/pi) | 0.80.x | Agent 循环、工具执行 |

### 开发工具

| 技术 | 版本 | 用途 |
|:-----|:-----|:-----|
| [Vitest](https://vitest.dev/) | 4.x | 测试框架 |
| [Prettier](https://prettier.io/) | 3.x | 代码格式化 |
| [tsx](https://github.com/privatenumber/tsx) | 4.x | TypeScript 直接执行 |
| npm workspaces | - | Monorepo 管理 |

### 规划中的基础设施

| 技术 | 用途 |
|:-----|:-----|
| [PostgreSQL](https://www.postgresql.org/) | 事件账本、投影、账户 |
| [Redis](https://redis.io/) | 队列、缓存、限流 |
| S3 兼容存储 | 附件、导出 |
| OIDC/OAuth | 身份认证 |
| OCI 容器 | 部署 |

---

## 项目结构

```
sandtable/
├── apps/
│   ├── web/                    # React + Vite 移动 PWA
│   │   ├── src/
│   │   │   ├── App.tsx         # 路由：世界 · 改写 · 时间线 · 存档
│   │   │   ├── main.tsx        # React 入口
│   │   │   └── styles.css      # 移动端优先样式
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   ├── api/                    # Fastify HTTP API
│   │   ├── src/
│   │   │   ├── app.ts          # Fastify 应用工厂
│   │   │   └── server.ts       # 服务入口
│   │   └── package.json
│   │
│   └── worker/                 # Pi Agent 后台 Worker
│       ├── src/
│       │   ├── index.ts        # Worker 入口
│       │   ├── pi-runtime.ts   # Pi 运行时接入
│       │   └── status.ts       # 状态查询
│       └── package.json
│
├── packages/
│   └── domain/                 # 共享领域协议
│       ├── src/
│       │   └── index.ts        # 系统标识、品牌化 ID 类型
│       └── package.json
│
├── docs/                       # 项目文档
│   ├── README.md               # 文档总览与阅读顺序
│   ├── architecture.md         # 系统架构
│   ├── product-vision.md       # 产品愿景
│   ├── world-model.md          # 世界时间与事件模型
│   ├── mvp.md                  # MVP 范围
│   ├── roadmap.md              # 路线图
│   ├── development.md          # 本地开发指南
│   ├── decision-register.md    # 决策清单（25 项已确认决策）
│   ├── adr/                    # 架构决策记录
│   └── templates/              # 文档模板
│
├── AGENTS.md                   # AI Agent 协作规则
├── CONTEXT.md                  # 领域语言规范（术语表）
├── CONTRIBUTING.md             # 贡献指南
├── CODE_OF_CONDUCT.md          # 行为准则
├── SECURITY.md                 # 安全政策
├── CHANGELOG.md                # 变更日志
├── LICENSE                     # AGPL-3.0 许可证
├── package.json                # Monorepo 根配置
├── tsconfig.base.json          # 共享 TypeScript 配置
└── vitest.config.ts            # 共享测试配置
```

---

## 快速开始

### 环境要求

- **Node.js** >= 22.19.0
- **npm**（随 Node.js 附带）

> 💡 所有依赖、缓存和构建产物均位于项目目录内，无需全局安装任何包。

### 安装

```bash
# 克隆仓库
git clone https://github.com/daum110715/sandtable.git
cd sandtable

# 安装依赖
npm install
```

### 启动开发服务

```bash
# 启动前端 PWA（默认 http://localhost:5173）
npm run dev:web

# 启动 API 服务（热重载）
npm run dev:api

# 启动 Worker（热重载）
npm run dev:worker
```

### 验证项目

```bash
# 完整验证：类型检查 + 测试 + 生产构建
npm run check
```

> **Windows 用户注意：** 如果 PowerShell 禁止 `npm.ps1`，请使用 `npm.cmd run check`。

---

## 开发指南

### 可用脚本

| 命令 | 说明 |
|:-----|:-----|
| `npm run dev:web` | 启动前端 PWA 开发服务 |
| `npm run dev:api` | 启动 API 服务（热重载） |
| `npm run dev:worker` | 启动 Worker（热重载） |
| `npm run check` | 完整验证（类型检查 + 测试 + 构建） |
| `npm run build` | 生产构建所有工作区 |
| `npm run test` | 运行所有测试 |
| `npm run typecheck` | 类型检查所有工作区 |
| `npm run format` | 格式化代码 |
| `npm run format:check` | 检查代码格式 |

### 代码风格

- **TypeScript 严格模式**：启用 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`verbatimModuleSyntax`
- **模块系统**：ESM（`"type": "module"`），NodeNext 解析
- **缩进**：2 空格
- **换行符**：LF
- **编码**：UTF-8

### 领域语言规范

项目使用统一的领域术语，详见 [CONTEXT.md](CONTEXT.md)。在编写代码和文档时，必须使用规范术语：

| ✅ 正确 | ❌ 避免 |
|:--------|:--------|
| 历史基线 | 初始数据、背景故事 |
| 世界线 | 存档、剧本 |
| 事件 | 消息、日志 |
| 改写者 | 玩家角色、上帝视角 |
| 改写指令 | 行动意图、用户消息 |
| 行动意图 | 命令、事件 |
| 裁决 | 生成、执行 |
| 认知回合 | 模拟回合、世界更新 |

### 环境变量

- `.env` 文件已被 `.gitignore` 排除
- 新增环境变量时必须同步更新 `.env.example`
- API 和 Worker 在未配置外部服务时应能通过基础健康检查

---

## 测试

```bash
# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test -- --coverage

# 运行特定工作区的测试
npm run test --workspace @sandtable/domain
```

### 测试策略

- **领域协议测试**：验证系统标识、品牌化 ID 类型的稳定性
- **API 测试**：健康检查端点无需外部依赖即可通过
- **Worker 测试**：状态查询功能验证
- **前端测试**：导航结构和路由正确性

---

## 部署

> ⚠️ **当前未配置部署。** 云资源、模型凭证和部署流程需要项目所有者明确授权。

### 规划中的部署架构

| 组件 | 部署目标 |
|:-----|:---------|
| PWA 前端 | CDN + Service Worker |
| API 服务 | OCI 容器 |
| Worker | OCI 容器 |
| PostgreSQL | 托管数据库 |
| Redis | 托管缓存 |
| 对象存储 | S3 兼容服务 |

---

## 路线图

| 阶段 | 里程碑 | 说明 | 状态 |
|:-----|:-------|:-----|:-----|
| **Phase 0** | 技术原型 | Monorepo、PWA shell、API 健康检查、Pi 接入、共享领域协议 | ✅ 已完成 |
| **Phase 1** | 事件核心 | 内存事件账本、裁决引擎、世界状态投影、回放 | 🚧 进行中 |
| **Phase 1** | 赤壁历史基线 | 史料主张、行动者档案、开局设定 | 🚧 进行中 |
| **Phase 2** | 持久化 + AI 认知 | PostgreSQL、Redis、Pi 认知循环 | 📋 计划中 |
| **Phase 2** | 移动端纵向切片 | 端到端用户旅程 | 📋 计划中 |
| **Phase 3** | 分支与回放 | 世界线分支、回放、对比 | 📋 计划中 |
| **Phase 3** | 账户与分享 | 游客模式、账户体系、分享 | 📋 计划中 |
| **Phase 4** | 安全与发布 | 安全加固、性能优化、可观测性、正式发布 | 📋 计划中 |

### MVP 范围

首个历史切片：**公元 208 年赤壁之战**

- 3 个阵营（曹操、孙权、刘备）
- 5 个关键行动者
- 离散时间推进
- 单人模式
- 世界线分支与回放

---

## 参与贡献

我们欢迎各种形式的贡献！请先阅读[贡献指南](CONTRIBUTING.md)了解：

- 开发环境搭建
- 代码规范与提交流程
- Pull Request 流程
- Issue 提交规范

### 快速参与

1. **Fork** 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 **Pull Request**

---

## 行为准则

本项目采用 [Contributor Covenant 行为准则](CODE_OF_CONDUCT.md)。参与本项目即表示您同意遵守其中条款。

---

## 安全政策

如发现安全漏洞，请按照[安全政策](SECURITY.md)中的流程报告。请勿在公开 Issue 中披露安全问题。

---

## 许可证

本项目采用 [GNU Affero General Public License v3.0](LICENSE) 许可。

```
Copyright (C) 2026 Sandtable Contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
```

---

## 致谢

- [Pi](https://github.com/earendil-works/pi) —— 提供多模型 AI Agent 基础设施
- [Fastify](https://fastify.dev/) —— 高性能 HTTP 框架
- [React](https://react.dev/) —— 用户界面库
- [Vite](https://vite.dev/) —— 下一代前端构建工具
- 所有[贡献者](https://github.com/daum110715/sandtable/graphs/contributors) ❤️

---

<div align="center">

**[⬆ 回到顶部](#-sandtable)**

</div>
