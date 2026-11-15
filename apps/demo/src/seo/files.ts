import { PAGES, SITE, pageUrl } from "./site";

/** robots.txt: every crawler may read everything. */
export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
}

/** sitemap.xml with every page of the demo, each dated `lastmod`, a day written as YYYY-MM-DD. */
export function sitemapXml(lastmod: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) throw new Error(`The sitemap date must be YYYY-MM-DD, not "${lastmod}".`);
  const urls = (Object.keys(PAGES) as (keyof typeof PAGES)[]).map(
    (id) => `  <url>\n    <loc>${pageUrl(id)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
