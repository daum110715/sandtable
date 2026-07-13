import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.js";
import "./styles.css";

/** 清除可能拦截本地开发的旧 PWA / Service Worker。 */
async function clearStaleServiceWorkers(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
}

function showBootError(message: string): void {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <div style="
      font-family: system-ui, 'Microsoft YaHei', sans-serif;
      max-width: 36rem;
      margin: 3rem auto;
      padding: 1.5rem;
      border: 2px solid #b42318;
      background: #fff;
      color: #1a1714;
      line-height: 1.6;
    ">
      <h1 style="font-size: 1.25rem; margin: 0 0 0.75rem;">页面加载失败</h1>
      <p style="margin: 0 0 0.75rem; white-space: pre-wrap;">${message.replace(/</g, "&lt;")}</p>
      <p style="margin: 0; color: #6e675e; font-size: 0.875rem;">
        请强制刷新（Ctrl+Shift+R），或换无痕窗口打开
        <code>http://127.0.0.1:5180/</code>
      </p>
    </div>
  `;
}

class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("React render error", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: "system-ui, Microsoft YaHei, sans-serif",
            maxWidth: "36rem",
            margin: "3rem auto",
            padding: "1.5rem",
            border: "2px solid #b42318",
            background: "#fff",
            color: "#1a1714",
            lineHeight: 1.6,
          }}
        >
          <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.75rem" }}>
            界面渲染出错
          </h1>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Root element is missing");
}

void clearStaleServiceWorkers().finally(() => {
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <RootErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </RootErrorBoundary>
      </StrictMode>,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    showBootError(msg);
  }
});

window.addEventListener("error", (ev) => {
  if (!document.querySelector(".shell")) {
    showBootError(ev.message || "未知脚本错误");
  }
});

window.addEventListener("unhandledrejection", (ev) => {
  if (!document.querySelector(".shell")) {
    const reason = ev.reason;
    const msg =
      reason instanceof Error ? reason.message : String(reason ?? "Promise 拒绝");
    showBootError(msg);
  }
});
