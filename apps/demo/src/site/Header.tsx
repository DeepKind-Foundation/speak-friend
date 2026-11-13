import type { JSX } from "react";
import { REPO } from "../seo/site";

/** Pages of the demo, in nav order. */
export type PageId = "guide" | "docs" | "workbench";

/** Where each page lives, as seen from each page. Relative, so the site works under any path. */
const HREFS: Record<PageId, Record<PageId, string>> = {
  guide: { guide: "./", docs: "./docs/", workbench: "./workbench/" },
  docs: { guide: "../", docs: "./", workbench: "../workbench/" },
  workbench: { guide: "../", docs: "../docs/", workbench: "./" },
};

/** Wordmark and navigation shared by every page. */
export function Header({ current }: { current: PageId }): JSX.Element {
  const hrefs = HREFS[current];
  const link = (page: PageId, text: string): JSX.Element => (
    <a href={hrefs[page]} aria-current={current === page ? "page" : undefined}>
      {text}
    </a>
  );
  return (
    <header className="site-header">
      <a className="wordmark" href={hrefs.guide}>
        <span className="mini-door" aria-hidden="true" />
        Speak, Friend
      </a>
      <nav aria-label="Demo">
        {link("guide", "Guide")}
        {link("docs", "Docs")}
        {link("workbench", "Workbench")}
        <a href={REPO}>GitHub</a>
      </nav>
    </header>
  );
}
