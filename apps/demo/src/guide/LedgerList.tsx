import type { JSX } from "react";
import type { LedgerEntry } from "./ledger";
import { targetFor } from "./tours";

/** The promises of the library as a list; each row is also a step of the tour. */
export function LedgerList({ entries }: { entries: readonly LedgerEntry[] }): JSX.Element {
  return (
    <dl className="ledger">
      {entries.map((entry) => (
        <div key={entry.id} className="ledger-row" data-tour={targetFor(entry.id)}>
          <dt>{entry.term}</dt>
          <dd>{entry.description}</dd>
        </div>
      ))}
    </dl>
  );
}
