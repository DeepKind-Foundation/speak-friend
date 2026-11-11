// Writes the real content of each page into its html, plus robots.txt, sitemap.xml and llms.txt, after the client and server builds.
// Run by `pnpm build`. Fails if a page comes out without its heading, so an empty shell is never published.
import { readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const app = resolve(import.meta.dirname, "..");
const dist = resolve(app, "dist");
const ssr = resolve(app, "dist-ssr");
const ROOT = '<div id="root"></div>';

const { renderGuide, renderWorkbench, llmsTxt, robotsTxt, sitemapXml } = await import(
  pathToFileURL(resolve(ssr, "entry-server.js")).href
);

async function inject(file, html) {
  const path = resolve(dist, file);
  const source = await readFile(path, "utf8");
  if (!source.includes(ROOT)) throw new Error(`${file}: the root element is missing`);
  if (!html.includes("<h1")) throw new Error(`${file}: the rendered page has no level 1 heading`);
  for (const tag of ['rel="canonical"', 'property="og:image"', "application/ld+json"]) {
    if (!source.includes(tag)) throw new Error(`${file}: the head has no ${tag}`);
  }
  await writeFile(path, source.replace(ROOT, `<div id="root">${html}</div>`));
  console.log(`prerendered ${file} (${html.length} characters)`);
}

await inject("index.html", renderGuide());
await inject("workbench/index.html", renderWorkbench());
await writeFile(resolve(dist, "llms.txt"), llmsTxt());
await writeFile(resolve(dist, "robots.txt"), robotsTxt());
await writeFile(resolve(dist, "sitemap.xml"), sitemapXml());
await rm(ssr, { recursive: true, force: true });
