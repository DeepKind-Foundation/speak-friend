import type { Tour } from "speak-friend";
import type { GuideLabels } from "speak-friend-react";
import type { LedgerEntry } from "./ledger";

/** Identifier of the tour of the guide page. */
export const TOUR_ID = "guide";

/** The `data-tour` value that marks the row of a ledger entry. */
export function targetFor(entryId: string): string {
  return `ledger-${entryId}`;
}

/** One tour, one chapter, one step per ledger entry. */
export function buildTours(entries: readonly LedgerEntry[]): Tour<null>[] {
  return [
    {
      id: TOUR_ID,
      version: 1,
      chapters: [
        {
          id: "ledger",
          route: "/",
          steps: entries.map((entry) => ({
            id: entry.id,
            target: targetFor(entry.id),
            title: entry.stepTitle,
            body: entry.stepBody,
          })),
        },
      ],
    },
  ];
}

/** Every string the guide shows. */
export const labels: GuideLabels = {
  counter: (n, total) => `Step ${n} of ${total}`,
  back: "Back",
  next: "Next",
  finish: "Finish",
  close: "Close",
};
