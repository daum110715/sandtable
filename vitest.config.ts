import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts", "apps/*/src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.d.ts",
        "**/dist/**",
        "**/node_modules/**",
        "apps/web/src/main.tsx",
        "apps/worker/src/pi-runtime.ts",
        "apps/web/src/**/*.tsx",
        "apps/api/src/server.ts",
      ],
      all: true,
      reporter: ["text", "text-summary", "json", "html"],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
      },
    },
  },
});
