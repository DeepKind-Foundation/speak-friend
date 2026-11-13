import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { memoryStore, type Tour } from "speak-friend";
import { TourGuide, TourProvider, useTours } from "speak-friend-react";
import "speak-friend-react/styles.css";
import "./elements";

declare global {
  interface Window {
    __start: (id: string) => Promise<void>;
    __errors: string[];
  }
}

window.__errors = [];

const tour = (id: string, steps: Tour<null>["chapters"][number]["steps"]): Tour<null> => ({
  id,
  version: 1,
  chapters: [{ id: "c", route: "/", steps }],
});

const tours: Tour<null>[] = [
  tour("save", [{ id: "save", target: "save", within: "#card-b", title: "Save it", body: "In the second card." }]),
  tour("deep", [{ id: "deep", target: "deep", within: "#scroller", title: "Deep", body: "Inside a scroller." }]),
  tour("wrapped", [
    { id: "wrapped", target: "wrapped", within: "#wrap", title: "Wrapped", body: "Host without a box." },
  ]),
  tour("skip", [
    { id: "hidden", target: "hidden", within: "#card-a", title: "Hidden", body: "Not shown." },
    { id: "save", target: "save", within: "#card-b", title: "Second", body: "Shown." },
  ]),
  tour("frame", [{ id: "frame", target: "inframe", within: "#frame", title: "In a frame", body: "Same origin." }]),
  tour("scaled", [{ id: "scaled", target: "inframe", within: "#scaled", title: "Scaled", body: "A scaled frame." }]),
  tour("nested", [
    { id: "nested", target: "inframe", within: ["#outer", "#inner"], title: "Nested", body: "A frame in a frame." },
  ]),
  tour("hiddenframe", [
    { id: "hf", target: "inframe", within: "#hiddenframe", title: "Hidden", body: "Not displayed." },
  ]),
  tour("foreign", [{ id: "foreign", target: "inframe", within: "#foreign", title: "Foreign", body: "Other origin." }]),
  tour("closed", [{ id: "shut", target: "shut", within: "#closed", title: "Shut", body: "Cannot be reached." }]),
];

const labels = {
  counter: (n: number, total: number) => `Step ${n} of ${total}`,
  back: "Back",
  next: "Next",
  finish: "Finish",
  close: "Close",
};

function Expose() {
  const tours = useTours<null>();
  useEffect(() => {
    window.__start = (id) => tours.start(id);
  }, [tours]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <TourProvider
    tours={tours}
    store={memoryStore()}
    context={null}
    targetTimeout={600}
    onError={(error) => window.__errors.push(String(error))}
  >
    <Expose />
    <TourGuide labels={labels} />
  </TourProvider>,
);
