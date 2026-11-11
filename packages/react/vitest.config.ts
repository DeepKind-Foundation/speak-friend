import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "dont-panic": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)) } },
  test: { environment: "jsdom", include: ["test/**/*.test.tsx"] },
});
