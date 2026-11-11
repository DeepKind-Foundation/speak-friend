import type { JSX } from "react";
import { useStartTour } from "../site/useStartTour";
import { TOUR_ID } from "./tour";

/** A small sample app for the tour to point at, with the button that starts it. */
export function HostApp(): JSX.Element {
  const start = useStartTour(TOUR_ID);
  return (
    <figure className="figure">
      <figcaption className="caption">
        <b>Fig. 1</b> Your app. The guide comes from the library and docks to the window, as it will in your app.
      </figcaption>
      <div className="host">
        <nav className="host-side" aria-label="Sample app">
          <span aria-current="page">Today</span>
          <span>Inbox</span>
          <span>Projects</span>
        </nav>
        <div className="host-main">
          <h2>Today</h2>
          <div className="host-bar">
            <button type="button" className="host-button" data-tour="new-task">
              New task
            </button>
            <div className="host-filters" data-tour="filters">
              <span aria-current="true">All</span>
              <span>Due</span>
              <span>Done</span>
            </div>
          </div>
          <ul className="host-list" data-tour="task-list">
            <li>Book the venue</li>
            <li>Send the agenda</li>
            <li>Print name badges</li>
          </ul>
        </div>
      </div>
      <button type="button" className="button" onClick={start}>
        Start tour
      </button>
    </figure>
  );
}
