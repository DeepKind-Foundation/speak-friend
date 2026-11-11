import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { robotsTxt, sitemapXml } from "../src/seo/files";
import { headTags } from "../src/seo/head";
import { llmsTxt } from "../src/seo/llms";
import { NPM, PAGES, REPO, SITE, pageUrl, type PageId } from "../src/seo/site";

const ids = Object.keys(PAGES) as PageId[];

const meta = (head: string, attr: "name" | "property", key: string): string | undefined =>
  new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(head)?.[1];

const jsonLd = (head: string): object[] =>
  [...head.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap((m) =>
    [JSON.parse(m[1] ?? "")].flat(),
  );

describe.each(ids)("%s page", (id) => {
  const head = headTags(id);
  const { title, description } = PAGES[id];

  it("has a title of 30 to 60 characters", () => {
    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(head).toContain(`<title>${title}</title>`);
  });

  it("has a description of 120 to 160 characters", () => {
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(meta(head, "name", "description")).toBe(description);
  });

  it("names one canonical address", () => {
    expect(head.match(/rel="canonical"/g)).toHaveLength(1);
    expect(head).toContain(`<link rel="canonical" href="${pageUrl(id)}" />`);
  });

  it("has Open Graph tags with an absolute image, and a Twitter card", () => {
    expect(meta(head, "property", "og:url")).toBe(pageUrl(id));
    expect(meta(head, "property", "og:type")).toBe("website");
    expect(meta(head, "property", "og:title")).toBe(title);
    expect(meta(head, "property", "og:description")).toBe(description);
    expect(meta(head, "property", "og:image")).toBe(`${SITE}/og.png`);
    expect(meta(head, "property", "og:image:alt")).toBeTruthy();
    expect(meta(head, "name", "twitter:card")).toBe("summary_large_image");
  });

  it("has structured data that parses", () => {
    const blocks = jsonLd(head);
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) expect(block).toMatchObject({ "@context": "https://schema.org" });
  });
});

describe("across pages", () => {
  it("gives each page its own title and description", () => {
    expect(new Set(ids.map((id) => PAGES[id].title)).size).toBe(ids.length);
    expect(new Set(ids.map((id) => PAGES[id].description)).size).toBe(ids.length);
  });

  it("describes the library as source code on the front page", () => {
    expect(jsonLd(headTags("guide"))[0]).toMatchObject({
      "@type": "SoftwareSourceCode",
      codeRepository: REPO,
      license: "https://opensource.org/license/mit",
      programmingLanguage: "TypeScript",
    });
  });

  it("gives the workbench a breadcrumb back to the front page", () => {
    const text = JSON.stringify(jsonLd(headTags("workbench")));
    expect(text).toContain("BreadcrumbList");
    expect(text).toContain(`"item":"${pageUrl("guide")}"`);
  });
});

describe("files for crawlers and agents", () => {
  it("lets every crawler in and names the sitemap", () => {
    const robots = robotsTxt();
    expect(robots).toContain("User-agent: *");
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m);
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  it("lists every page once in the sitemap", () => {
    const sitemap = sitemapXml();
    for (const id of ids) expect(sitemap.split(`<loc>${pageUrl(id)}</loc>`)).toHaveLength(2);
  });

  it("builds llms.txt with the install command, an example and the pages", () => {
    const llms = llmsTxt();
    expect(llms.startsWith("# Speak, Friend\n\n> ")).toBe(true);
    expect(llms).toContain("pnpm add speak-friend speak-friend-react");
    expect(llms).toContain("<TourGuide labels={labels} />");
    for (const id of ids) expect(llms).toContain(pageUrl(id));
    expect(llms).toContain(NPM.react);
    expect(llms).toContain(REPO);
  });

  it("ships a 1200 by 630 preview image", () => {
    const png = readFileSync(join(process.cwd(), "public/og.png"));
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
    expect(png.length).toBeLessThan(300_000);
  });
});
