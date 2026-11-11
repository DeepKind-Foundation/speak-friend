import type { Step, Tour } from "speak-friend";

/** Identifier of the tour of the sample app. */
export const TOUR_ID = "workbench";

/** The steps of that tour. */
export const steps: Step<null>[] = [
  { id: "new-task", target: "new-task", title: "Add a task", body: "Start here. New tasks land at the top of Today." },
  { id: "task-list", target: "task-list", title: "Your tasks", body: "Tick a task to mark it done." },
  {
    id: "filters",
    target: "filters",
    title: "Narrow the list",
    body: "Filters keep the list short when a day gets busy.",
  },
];

/** The tour of the sample app in the workbench. */
export const workbenchTours: Tour<null>[] = [
  { id: TOUR_ID, version: 1, chapters: [{ id: "tasks", route: "/", steps }] },
];
