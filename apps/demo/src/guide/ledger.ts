/** One row of the guide page. The same entry is shown as a ledger row and as a tour step. */
export interface LedgerEntry {
  id: string;
  term: string;
  description: string;
  stepTitle: string;
  stepBody: string;
}

/** What the library promises, in the order the tour visits it. */
export const ledger: readonly LedgerEntry[] = [
  {
    id: "keyboard",
    term: "Keyboard",
    description:
      "Escape closes the tour from the guide and returns focus to where you were, while Escape in a page control stays the page's. Tab leaves the guide whenever you want, because nothing traps it.",
    stepTitle: "You stay in control of the keyboard",
    stepBody:
      "Press Escape in the guide to close the tour. Focus goes back to the button you used to start it. Tab can leave the guide at any time, and the first Tab stop in the page brings you back.",
  },
  {
    id: "screen-readers",
    term: "Screen readers",
    description:
      "Every step moves focus to its title, so the title is read first. The step counter and the progress are plain text.",
    stepTitle: "Every step is announced",
    stepBody:
      "Focus lands on this title, so a screen reader reads it first. To keep focus where it is, set announce to live.",
  },
  {
    id: "contrast",
    term: "Contrast",
    description:
      "Body text measures 14.8 to 17 to 1 in both themes. The secondary button border holds 3.7 to 1 or better.",
    stepTitle: "Contrast holds in both themes",
    stepBody:
      "Text contrast is between 14.8 and 17 to 1, and the text in the top band is at least 8.5 to 1. Set the theme prop to force light or dark.",
  },
  {
    id: "motion",
    term: "Motion",
    description: "Nothing moves under reduced motion. There are no timers, so no step changes on its own.",
    stepTitle: "Motion stays optional",
    stepBody:
      "The guide only animates when the system allows it. No step advances by itself, so you can read at your own pace.",
  },
];
