/** The quick start shown on the front page and offered to agents in llms.txt. */
export const quickStart = {
  question: "How do I add a page tour to a React app?",
  answer:
    "Install speak-friend and speak-friend-react, describe your tour as chapters and steps, mark each target with a data-tour attribute, and render a TourGuide inside a TourProvider. The guide docks to the window, moves focus to each step title and never dims the page. Progress is saved wherever you keep it, in memory, in local storage or in your database.",
  install: "pnpm add speak-friend speak-friend-react",
  code: `import { memoryStore, type Tour } from "speak-friend";
import { TourGuide, TourProvider, useTours } from "speak-friend-react";
import "speak-friend-react/styles.css";

const welcome: Tour<null> = {
  id: "welcome",
  version: 1,
  chapters: [
    {
      id: "home",
      route: "/",
      steps: [
        { id: "new", target: "new-task", title: "Add a task", body: "Start here." },
      ],
    },
  ],
};

const store = memoryStore();

const labels = {
  counter: (n: number, total: number) => \`Step \${n} of \${total}\`,
  back: "Back",
  next: "Next",
  finish: "Finish",
  close: "Close",
};

function StartButton() {
  const tours = useTours();
  return <button onClick={() => tours.start("welcome")}>Take the tour</button>;
}

export function App() {
  return (
    <TourProvider tours={[welcome]} store={store} context={null}>
      <StartButton />
      <button data-tour="new-task">New task</button>
      <TourGuide labels={labels} />
    </TourProvider>
  );
}`,
} as const;
