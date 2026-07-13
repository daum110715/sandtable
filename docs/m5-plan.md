# M5 计划：前端闭环

> 状态：已实现（分支 `feature/m5-frontend-loop`，2026-07-13）。

## 交付对照

| 任务 | 实现 |
|---|---|
| DEV-020 | 首页场景列表（赤壁预设 + 自定义背景说明）；`POST /api/v1/session/reset` |
| DEV-021 | `/play` 对话主区：自由输入改写、展示推演叙事 |
| DEV-022 | 上帝面板并列（宽屏侧栏 / 窄屏下方）展示势力人物资源地点关系 |
| DEV-023 | `POST /api/v1/deduce/stream` SSE 进度；前端进度文案 |
| DEV-024 | 事件日志列表（改写 + 叙事 + 变更数） |
| DEV-025 | 从服务端 `world-state`/`events` 恢复聊天；`localStorage` 存场景元数据；重试同 `commandId` |

## 本地运行

```bash
# 终端 1
npm run dev:api
# 终端 2
npm run dev:web
# 打开 http://127.0.0.1:5173 （Vite 代理 /api → :3000）
```

## 说明

- 自定义背景 1.0 仍用赤壁世界状态模板，文案记入客户端会话。
- 推演带「不伪装为史实」标识。
- 无密钥走桩 Agent；有 `DEEPSEEK_API_KEY` 走 DeepSeek。
