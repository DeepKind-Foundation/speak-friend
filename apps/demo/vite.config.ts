import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const page = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { guide: page("index.html"), workbench: page("workbench/index.html") },
    },
  },
});
