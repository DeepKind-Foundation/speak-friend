import type { JSX } from "react";
import { Tokens } from "../site/CodePanel";
import { Door } from "../site/Door";
import { highlight } from "../site/highlight";
import { useStartTour } from "../site/useStartTour";
import { quickStart } from "./quickstart";
import { TOUR_ID } from "./tours";

const install = highlight(quickStart.install)[0] ?? [];

/** Headline, install command and the button that starts the tour. */
export function Hero(): JSX.Element {
  const start = useStartTour(TOUR_ID);
  return (
    <div className="hero">
      <div className="hero-copy">
        <p className="eyebrow">speak-friend-react</p>
        <h1>Page tours that leave the page usable.</h1>
        <p>
          A small engine and a docked guide for React. It speaks to screen readers, obeys the keyboard and keeps the
          page you are pointing at usable.
        </p>
        <div className="hero-actions">
          <button type="button" className="button" onClick={start}>
            Take the tour
          </button>
          <code className="install">
            <Tokens line={install} />
          </code>
        </div>
      </div>
      <Door />
    </div>
  );
}
