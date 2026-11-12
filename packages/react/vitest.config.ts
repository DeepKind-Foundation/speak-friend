import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "speak-friend": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 },
    },
  },
});
