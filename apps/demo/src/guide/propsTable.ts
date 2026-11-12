/** A prop of `TourGuide`, as documented in the package README. */
interface PropRow {
  name: string;
  defaultValue: string;
  description: string;
}

/** The props of `TourGuide` that most people set. */
export const guideProps: readonly PropRow[] = [
  {
    name: "labels",
    defaultValue: "required",
    description:
      "Every string the guide shows: counter, back, next, finish and close. Optionally waiting, for a step that is taking a moment (the first one included), and ended, announced when the tour ends.",
  },
  {
    name: "position",
    defaultValue: "end",
    description: "Side of the window to dock on, start or end. It mirrors in right-to-left layouts.",
  },
  {
    name: "theme",
    defaultValue: "system",
    description: "light or dark forces a theme. By default the guide follows the operating system.",
  },
  {
    name: "announce",
    defaultValue: "focus",
    description: "focus moves focus to the step title. live keeps focus where it is and announces the step.",
  },
  { name: "headingLevel", defaultValue: "2", description: "Heading level of the step title, from 2 to 6." },
  {
    name: "closeOnEscape",
    defaultValue: "true",
    description: "Closes the tour on Escape and returns focus to where it was.",
  },
];
