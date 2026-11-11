import type { JSX } from "react";
import { useTourState } from "speak-friend-react";
import { describeAnnouncements } from "./announcements";
import type { Announce } from "./options";
import { steps } from "./tour";

/** What a screen reader says for the step that is open, or for the first step while no tour runs. */
export function AnnouncementLog({ announce }: { announce: Announce }): JSX.Element {
  const state = useTourState();
  const running = state.status === "running" && state.step !== null;
  const view = running
    ? { title: state.step?.title ?? "", index: state.index, total: state.total }
    : { title: steps[0]?.title ?? "", index: 0, total: steps.length };
  const lines = describeAnnouncements(announce, view.title, view.index, view.total);
  return (
    <section className="panel" aria-label="What a screen reader says">
      <h2 className="label" aria-hidden="true">
        What a screen reader says
      </h2>
      <ol className="log">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
    </section>
  );
}
