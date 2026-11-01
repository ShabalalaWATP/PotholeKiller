import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/ai/**/*.ts", "lib/security/**/*.ts", "lib/game/**/*.ts", "lib/reporting/**/*.ts", "app/api/**/*.ts"],
      exclude: ["lib/ai/prompt.ts"],
      reporter: ["text", "html", "json-summary"],
      thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
    },
  },
});
