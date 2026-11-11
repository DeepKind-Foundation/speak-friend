import { useState, type JSX } from "react";
import { memoryStore } from "speak-friend";
import { TourGuide, TourProvider } from "speak-friend-react";
import { Header } from "../site/Header";
import { Hero } from "./Hero";
import { LedgerList } from "./LedgerList";
import { QuickStart } from "./QuickStartSection";
import { ledger } from "./ledger";
import { labels } from "../site/labels";
import { buildTours } from "./tours";

const tours = buildTours(ledger);

/** The front page: the documentation, which also tours itself. */
export function GuidePage(): JSX.Element {
  const [store] = useState(() => memoryStore());
  return (
    <TourProvider tours={tours} store={store} context={null}>
      <main className="page">
        <Header current="guide" />
        <Hero />
        <section className="doc" aria-labelledby="accessible">
          <h2 id="accessible">What makes it accessible?</h2>
          <p>Built to WCAG 2.2 AA. Each row below is also a step of the tour.</p>
        </section>
        <LedgerList entries={ledger} />
        <QuickStart />
      </main>
      <TourGuide labels={labels} />
    </TourProvider>
  );
}
