/** Where the demo is served. */
export const SITE = "https://speak-friend.dont-mind-ai.com";
/** The source repository. */
export const REPO = "https://github.com/DeepKind-Foundation/speak-friend";
/** The two packages on npm. */
export const NPM = {
  engine: "https://www.npmjs.com/package/speak-friend",
  react: "https://www.npmjs.com/package/speak-friend-react",
} as const;

/** What search engines, social cards and agents are told about a page. */
export interface PageMeta {
  path: string;
  title: string;
  description: string;
}

/** Every page of the demo. The head tags, sitemap and llms.txt are all built from this. */
export const PAGES = {
  guide: {
    path: "/",
    title: "Speak, Friend: accessible product tour library for React",
    description:
      "Open source React product tour library. Keyboard first, screen reader friendly, resumable, and it can point into shadow DOM and iframes.",
  },
  docs: {
    path: "/docs/",
    title: "React product tour docs | Speak, Friend",
    description:
      "How to point tour steps at targets, even in shadow DOM or iframes, save and resume progress, use the keyboard, and what is not covered yet.",
  },
  workbench: {
    path: "/workbench/",
    title: "React product tour playground | Speak, Friend",
    description:
      "Try the tour guide in a sample app: dock side, theme, dimming, colours and a right-to-left page. Copy the complete code for your choices.",
  },
} as const satisfies Record<string, PageMeta>;

/** Name of a page. */
export type PageId = keyof typeof PAGES;

/** Full address of a page. */
export const pageUrl = (id: PageId): string => SITE + PAGES[id].path;
