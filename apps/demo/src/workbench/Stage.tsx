import type { JSX, RefObject } from "react";
import { useTourState } from "speak-friend-react";
import { useStartTour } from "../site/useStartTour";
import type { Options } from "./options";
import { steps, TOUR_ID } from "./tour";

/** What the guide looks like before a tour starts. It copies the library's markup and classes, and cannot be used. */
function Preview({ options }: { options: Options }): JSX.Element {
  const first = steps[0];
  return (
    <section
      className="sf-guide"
      aria-hidden="true"
      inert
      data-position={options.position}
      data-theme={options.theme === "system" ? undefined : options.theme}
    >
      <div className="sf-band">
        <span className="sf-count">{`Step 1 of ${steps.length}`}</span>
        <span className="sf-progress">
          {steps.map((s, i) => (
            <i key={s.id} className={i === 0 ? "sf-current" : undefined} />
          ))}
        </span>
      </div>
      <div className="sf-body">
        <p className="sf-title">{first?.title}</p>
        <p className="sf-text">{first?.body}</p>
        <div className="sf-actions">
          <span className="sf-button">Back</span>
          <span className="sf-button sf-primary">Next</span>
          <span className="sf-button sf-quiet">Close</span>
        </div>
        <p className="stage-note">Preview only. Press Start tour to use it.</p>
      </div>
    </section>
  );
}

/** The ring the library draws, shown around the first target while no tour runs. */
function PreviewRing({ options }: { options: Options }): JSX.Element {
  return (
    <span
      className="sf-ring stage-ring"
      aria-hidden="true"
      data-dim={options.dim === "on" || undefined}
      data-theme={options.theme === "system" ? undefined : options.theme}
    />
  );
}

interface StageProps {
  options: Options;
  /** The element the running guide mounts in, so it docks inside the frame. */
  frame: RefObject<HTMLDivElement | null>;
}

/** A browser frame around a small sample app. The guide docks inside it. */
export function Stage({ options, frame }: StageProps): JSX.Element {
  const start = useStartTour(TOUR_ID);
  const state = useTourState();
  const running = state.status === "running" && state.step !== null;
  return (
    <section className="stage" aria-labelledby="stage-title">
      <h2 className="label" id="stage-title">
        Your app
      </h2>
      <div className="stage-bar">
        <span className="stage-status">
          {running ? `Tour running. Step ${state.index + 1} of ${state.total}.` : "Preview. The tour has not started."}
        </span>
        <button type="button" className="button" onClick={start}>
          Start tour
        </button>
      </div>
      <div className="stage-screen" ref={frame}>
        <div className="host-side" aria-hidden="true">
          <span className="current">Today</span>
          <span>Inbox</span>
          <span>Projects</span>
        </div>
        <div className="host-main">
          <p className="host-title">Today</p>
          <div className="host-bar">
            <span className="host-target">
              <button type="button" className="host-button" data-tour="new-task">
                New task
              </button>
              {!running && <PreviewRing options={options} />}
            </span>
            <div className="host-filters" data-tour="filters" aria-hidden="true">
              <span className="current">All</span>
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
        {!running && <Preview options={options} />}
      </div>
    </section>
  );
}
