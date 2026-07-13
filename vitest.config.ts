import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
    coverage: {
      provider: "v8",
      include: [
        "packages/*/src/**/*.ts",
        "apps/*/src/**/*.ts",
        "apps/*/src/**/*.tsx",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        "**/dist/**",
        "**/node_modules/**",
        "apps/web/src/main.tsx",
        "apps/web/src/test-setup.ts",
        "apps/web/src/pages/**",
        "apps/web/src/App.tsx",
        "apps/worker/src/pi-runtime.ts",
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
