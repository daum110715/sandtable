import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Sandtable",
        short_name: "Sandtable",
        description: "AI 驱动的历史沙盒",
        theme_color: "#f3eee4",
        background_color: "#f3eee4",
        display: "standalone",
        start_url: "/",
      },
    }),
  ],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/ready": { target: "http://127.0.0.1:3000", changeOrigin: true },
    },
  },
});
