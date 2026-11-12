import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/** Builds the small site the browser tests use for web components. It is not part of the demo and is never deployed. */
export default defineConfig({
  root: fileURLToPath(new URL("./e2e/fixtures", import.meta.url)),
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
});
