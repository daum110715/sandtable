import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // 本地原型阶段禁用自动注册 SW，避免旧缓存导致空白页
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      selfDestroying: true,
      devOptions: { enabled: false },
      manifest: {
        name: "Sandtable",
        short_name: "Sandtable",
        description: "AI 驱动的通用推演沙盘",
        theme_color: "#f3eee4",
        background_color: "#f3eee4",
        display: "standalone",
        start_url: "/",
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
    // 换端口避开 5173 上可能残留的浏览器站点数据 / 旧 SW
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/ready": { target: "http://127.0.0.1:3000", changeOrigin: true },
    },
  },
});
