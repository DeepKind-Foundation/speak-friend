import type { GuideLabels } from "speak-friend-react";

/** Every string the guide shows. */
export const labels: GuideLabels = {
  counter: (n, total) => `Step ${n} of ${total}`,
  back: "Back",
  next: "Next",
  finish: "Finish",
  close: "Close",
  waiting: "Waiting for the page",
  ended: "Tour closed",
  returnToGuide: "Back to the tour",
};
