import { PAGES, SITE, pageUrl } from "./site";

/** robots.txt: every crawler may read everything. */
export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
}

/** sitemap.xml with every page of the demo. */
export function sitemapXml(): string {
  const urls = (Object.keys(PAGES) as (keyof typeof PAGES)[]).map(
    (id) => `  <url>\n    <loc>${pageUrl(id)}</loc>\n  </url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
