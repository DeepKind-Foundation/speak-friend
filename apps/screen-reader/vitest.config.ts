import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const source = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: "speak-friend-react", replacement: source("../../packages/react/src/index.ts") },
      { find: "speak-friend", replacement: source("../../packages/core/src/index.ts") },
    ],
  },
  test: { environment: "jsdom", include: ["test/**/*.test.{ts,tsx}"] },
});
