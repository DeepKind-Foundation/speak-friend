/** One question of the documentation page, answered in short paragraphs, an optional example and optional points. */
export interface DocSection {
  id: string;
  question: string;
  paragraphs: readonly string[];
  code?: { title: string; source: string };
  points?: readonly string[];
}

/** The documentation page, in reading order. Everything here is also in the package README. */
export const sections: readonly DocSection[] = [
  {
    id: "web-components",
    question: "How do I point a step at an element inside a web component or an iframe?",
    paragraphs: [
      "A step finds its target with document.querySelector, which cannot see inside a web component's shadow tree or an iframe. Name the host element with within on the step, and only that host is searched.",
      "within is a CSS selector for the host, or a list of selectors for hosts inside hosts. Each one is looked up inside the one before, and the list can mix components and iframes. It is never a search across the whole page, on purpose: shadow trees exist so that names cannot clash, and a page-wide search could ring the wrong element without any error.",
    ],
    code: {
      title: "A step inside a component, and one inside an iframe in a component",
      source: `const steps = [
  { id: "play", target: "play", within: "#player", title: "Play", body: "Starts the recording." },
  { id: "chart", target: "legend", within: ["#app", "#report-frame"], title: "Legend", body: "Reads the chart." },
];`,
    },
    points: [
      "The host needs no box of its own, so display: contents wrappers work. The target must be visible.",
      "A component that has not rendered yet is waited for, up to the step's timeout.",
      "An element slotted into a component from the page is in the page, so a step finds it without within.",
      "The ring and the guide's placement account for an iframe's position, border, padding and scaling, also for frames inside frames.",
      "Focus given back at the end of a tour goes to the inner element when the tour was started from inside a component or a frame.",
    ],
  },
  {
    id: "limits",
    question: "What can a tour not reach?",
    paragraphs: [
      "A closed shadow root cannot be entered, and neither can an iframe from another origin or one that has not loaded. The step is skipped, leaves the count, and onError is called once with the step id and the selector, so the problem is visible instead of silent.",
      "A tour that runs inside an iframe and points at the page around it is not supported.",
    ],
  },
  {
    id: "resume",
    question: "How does a tour save its place and offer itself again?",
    paragraphs: [
      "Progress goes to a store you provide. Closing a tour keeps its position and starting it again resumes from the same step. A tour dismissed twice, a number you can change with maxDismissals, is no longer offered. Raising a tour's version offers it again to people who finished an older one.",
      "webStorageStore keeps progress in localStorage and falls back to memory for the session when the browser refuses to store it. A store that fails never stops a tour: onError is called and the tour runs without saving.",
    ],
    code: {
      title: "A start button that waits for the store",
      source: `const store = webStorageStore();

function StartButton() {
  const tours = useTours();
  const progress = useTourProgress("welcome");
  const loaded = useTourProgressLoaded("welcome");
  useEffect(() => void tours.offered(), [tours]);
  if (!loaded) return null;
  return (
    <button onClick={() => tours.start("welcome")}>
      {progress?.status === "started" ? "Continue the tour" : "Take the tour"}
    </button>
  );
}`,
    },
    points: [
      "Until the store has answered, a missing progress does not mean the person has not started. useTourProgressLoaded is false until then, so the button does not flash Start and then Continue.",
    ],
  },
  {
    id: "keyboard",
    question: "What does the keyboard do?",
    paragraphs: [
      "The guide is a non-modal dialog. Nothing traps focus, and Tab leaves it after its last button and continues into the page. Focus moves to the step title on every step, and the title is described by Step N of M, so both are read together.",
      "Escape closes the tour when focus is in the guide or nowhere in particular, and returns focus to where it was. When focus is in a page control, Escape stays the page's, so a dropdown or dialog in your app can still use it. Set closeOnEscape to anywhere to close on every Escape that nothing else handled.",
      "The guide sits at the end of the page. Give labels a returnToGuide text and a button becomes the first thing Tab reaches in the page while a step is shown. It is only visible while it has focus, and it moves focus back to the guide. Without the label there is no button.",
    ],
    code: {
      title: "Labels with the back to the tour button",
      source: `const labels = {
  counter: (n: number, total: number) => \`Step \${n} of \${total}\`,
  back: "Back",
  next: "Next",
  finish: "Finish",
  close: "Close",
  returnToGuide: "Back to the tour",
};`,
    },
  },
  {
    id: "unverified",
    question: "What has not been verified?",
    paragraphs: [
      "The guide is tested in a browser against its accessibility tree and with axe, in Chromium on a desktop and a phone layout. It has not been run with a screen reader such as VoiceOver, NVDA or JAWS, so what each one says is not confirmed. A report from someone who uses one is welcome on GitHub.",
    ],
  },
];
