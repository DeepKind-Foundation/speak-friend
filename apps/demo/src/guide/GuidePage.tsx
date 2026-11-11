import { useState, type JSX } from "react";
import { memoryStore } from "speak-friend";
import { TourGuide, TourProvider } from "speak-friend-react";
import { Header } from "../site/Header";
import { Hero } from "./Hero";
import { LedgerList } from "./LedgerList";
import { ledger } from "./ledger";
import { buildTours, labels } from "./tours";

const tours = buildTours(ledger);

/** The front page: the documentation, which also tours itself. */
export function GuidePage(): JSX.Element {
  const [store] = useState(() => memoryStore());
  return (
    <TourProvider tours={tours} store={store} context={null}>
      <main className="page">
        <Header current="guide" />
        <Hero />
        <LedgerList entries={ledger} />
      </main>
      <TourGuide labels={labels} />
    </TourProvider>
  );
}
