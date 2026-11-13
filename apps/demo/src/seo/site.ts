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
    title: "Speak, Friend: accessible product tours for React",
    description:
      "A small React library for accessible product tours and onboarding walkthroughs. Keyboard first, screen reader friendly, and it dims the page only if you ask.",
  },
  docs: {
    path: "/docs/",
    title: "Documentation for the React tour guide | Speak, Friend",
    description:
      "How to point a tour step into a web component or an iframe, save and resume progress, use the keyboard, and what the guide does not cover yet.",
  },
  workbench: {
    path: "/workbench/",
    title: "React tour guide workbench | Speak, Friend",
    description:
      "Try the tour guide in a sample app: dock side, theme, dimming, colours and a right-to-left page. Copy the complete code for your choices.",
  },
} as const satisfies Record<string, PageMeta>;

/** Name of a page. */
export type PageId = keyof typeof PAGES;

/** Full address of a page. */
export const pageUrl = (id: PageId): string => SITE + PAGES[id].path;
