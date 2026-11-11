import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { headTags } from "./src/seo/head";
import { PAGES, type PageId } from "./src/seo/site";

const page = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

/** Adds the title, description, canonical, social and structured data tags to each page from one list. */
const seoHead = (): Plugin => ({
  name: "seo-head",
  transformIndexHtml(html, { path }) {
    const id = (Object.keys(PAGES) as PageId[]).find((key) => `${PAGES[key].path}index.html` === path);
    return id ? html.replace("</head>", `    ${headTags(id)}\n  </head>`) : html;
  },
});

export default defineConfig({
  base: "./",
  plugins: [react(), seoHead()],
  build: {
    rollupOptions: {
      input: { guide: page("index.html"), workbench: page("workbench/index.html") },
    },
  },
});
