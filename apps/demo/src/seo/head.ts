import { NPM, PAGES, REPO, SITE, pageUrl, type PageId } from "./site";

const IMAGE = `${SITE}/og.png`;
const IMAGE_ALT = "An arched gate with a star, and the text: accessible product tours for React.";

const escape = (text: string): string => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function structuredData(id: PageId): object[] {
  const { title, description } = PAGES[id];
  const context = "https://schema.org";
  if (id === "guide") {
    return [
      {
        "@context": context,
        "@type": "SoftwareSourceCode",
        name: "Speak, Friend",
        description,
        url: pageUrl(id),
        codeRepository: REPO,
        programmingLanguage: "TypeScript",
        runtimePlatform: "React 18 and later",
        license: "https://opensource.org/license/mit",
        keywords: "react, product tour, onboarding, walkthrough, accessibility, a11y, wcag, screen reader",
        sameAs: [NPM.engine, NPM.react, REPO],
      },
    ];
  }
  return [
    {
      "@context": context,
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Speak, Friend", item: pageUrl("guide") },
        { "@type": "ListItem", position: 2, name: "Workbench", item: pageUrl(id) },
      ],
    },
    {
      "@context": context,
      "@type": "WebPage",
      name: "React tour guide workbench",
      description: title,
      url: pageUrl(id),
      isPartOf: { "@type": "WebSite", name: "Speak, Friend", url: pageUrl("guide") },
    },
  ];
}

/** The tags that tell search engines, link previews and agents what a page is. Twitter falls back to the og tags. */
export function headTags(id: PageId): string {
  const { title, description } = PAGES[id];
  const url = pageUrl(id);
  const json = JSON.stringify(structuredData(id)).replace(/</g, "\\u003c");
  return [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Speak, Friend" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${IMAGE}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escape(IMAGE_ALT)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<script type="application/ld+json">${json}</script>`,
  ].join("\n    ");
}
