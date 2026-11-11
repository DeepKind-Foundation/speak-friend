import type { Announce } from "./options";

/** What a screen reader user hears as a step opens and while moving through the guide. */
export function describeAnnouncements(announce: Announce, title: string, index: number, total: number): string[] {
  const opening =
    announce === "focus"
      ? [`Focus moves to the heading: "${title}", level 2.`, "The dialog is named by that heading."]
      : ["Focus stays where it was.", `A polite status message reads: "Step ${index + 1} of ${total}: ${title}".`];
  const moving =
    announce === "focus"
      ? [`Tab reaches "Next".${index === 0 ? ' "Back" is dimmed on the first step.' : ""}`]
      : ["Tab moves into the dialog when you choose to."];
  return [...opening, ...moving, "Escape closes the tour and focus returns to where it was."];
}
