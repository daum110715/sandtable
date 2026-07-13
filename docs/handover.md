# 交接文档

> 最后更新：2026-07-13。M5 前端闭环在分支 `feature/m5-frontend-loop`。

## 进度

M1–M5 已实现（本分支含 M5）。下一步 **M6 硬化**。

## 本地演示

```bash
npm run dev:api   # :3000
npm run dev:web   # :5173，代理 /api
```

路径：选场景 → `/play` 输入改写（如「那天江上刮西北风」）→ 看推演与上帝面板 → 事件日志。

## 决策

- D016 SQLite · D007/D014/D015 轻量 Agent + DeepSeek 同进程（ADR-0007/0008）

## 包地图

- `packages/domain` `persistence` `agents`
- `apps/api` · `apps/web` · `apps/worker`（未接推演）

## 验证

`npm run check`
