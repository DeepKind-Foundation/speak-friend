import type { JSX } from "react";

/** Pages of the demo, in nav order. */
export type PageId = "guide";

const REPO = "https://github.com/DeepKind-Foundation/speak-friend";

/** Wordmark and navigation shared by every page. */
export function Header({ current }: { current: PageId }): JSX.Element {
  return (
    <header className="site-header">
      <a className="wordmark" href="./">
        <span className="mini-door" aria-hidden="true" />
        Speak, Friend
      </a>
      <nav aria-label="Demo">
        <a href="./" aria-current={current === "guide" ? "page" : undefined}>
          Guide
        </a>
        <a href={REPO}>GitHub</a>
      </nav>
    </header>
  );
}
