# Domain Docs

本仓库采用单一领域上下文。

## Before exploring

1. 阅读根目录 `CONTEXT.md`，使用其中定义的领域术语。
2. 阅读 `docs/architecture.md`，理解模块责任与 seams。
3. 阅读 `docs/technology.md` 和 `docs/decision-register.md`，确认技术与产品基线。
4. 阅读与当前主题相关的 `docs/adr/`。
5. 若输出与已确认决策或 ADR 冲突，必须显式指出，不得静默覆盖。

## Layout

```text
/
├── CONTEXT.md
├── docs/
│   ├── architecture.md
│   ├── agents/
│   └── adr/
└── AGENTS.md
```

若未来出现多个可独立演化的领域上下文，再创建 `CONTEXT-MAP.md` 并迁移为多上下文布局；不要仅因目录增多就拆分上下文。
