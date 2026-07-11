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
        theme_color: "#15110c",
        background_color: "#f4efe4",
        display: "standalone",
        start_url: "/"
      }
    })
  ],
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});

