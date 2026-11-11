import type { JSX } from "react";
import { Door } from "../site/Door";
import { useStartTour } from "../site/useStartTour";
import { TOUR_ID } from "./tours";

/** Headline, install command and the button that starts the tour. */
export function Hero(): JSX.Element {
  const start = useStartTour(TOUR_ID);
  return (
    <div className="hero">
      <div className="hero-copy">
        <p className="eyebrow">speak-friend-react</p>
        <h1>Page tours that leave the page usable.</h1>
        <p>
          A small engine and a docked guide for React. It speaks to screen readers, obeys the keyboard and never dims
          the thing you are pointing at.
        </p>
        <div className="hero-actions">
          <button type="button" className="button" onClick={start}>
            Take the tour
          </button>
          <code className="install">
            <span className="tk-t">pnpm</span> <span className="tk-a">add</span>{" "}
            <span className="tk-s">speak-friend-react</span>
          </code>
        </div>
      </div>
      <Door />
    </div>
  );
}
