# 交接文档

> 最后更新：2026-07-13。M6 硬化在分支 `feature/m6-hardening`。

## 进度

**M1–M6 已实现**（本分支含 M6）。1.0 技术闭环与硬化基线就绪；**部署与发布签字**须项目所有者。

## 本地演示

```bash
npm run dev:api
npm run dev:web
# http://127.0.0.1:5173
```

可选：`.env` 中 `DEEPSEEK_API_KEY`。

## M6 要点

- 输入校验、推演限流、安全响应头  
- 结构化日志脱敏、`/api/v1/metrics`  
- 前端可重试错误自动重试（同 commandId）  
- 发布清单：`docs/release-checklist.md`  

## 验证

```bash
npm run check
npm audit --omit=dev
```
