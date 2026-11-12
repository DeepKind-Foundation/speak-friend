import { useEffect, useState, type JSX } from "react";
import { memoryStore } from "speak-friend";
import { TourGuide, TourProvider } from "speak-friend-react";
import { CodePanel } from "../site/CodePanel";
import { Header } from "../site/Header";
import { labels } from "../site/labels";
import { AnnouncementLog } from "./AnnouncementLog";
import { componentCode, stylesheetCode, stylesheetCss } from "./code";
import { Controls } from "./Controls";
import { HostApp } from "./HostApp";
import { defaults, type Options } from "./options";
import { workbenchTours } from "./tour";

/** Mirrors the whole page, as a real right-to-left page would, and puts the previous direction back afterwards. */
function useDirection(direction: Options["direction"]): void {
  useEffect(() => {
    const root = document.documentElement;
    const before = root.getAttribute("dir");
    root.dir = direction;
    return () => (before === null ? root.removeAttribute("dir") : root.setAttribute("dir", before));
  }, [direction]);
}

/** The second page: change the guide, see the code each choice produces, hear what it announces. */
export function WorkbenchPage(): JSX.Element {
  const [options, setOptions] = useState<Options>(defaults);
  const [store] = useState(() => memoryStore());
  useDirection(options.direction);
  const change = <K extends keyof Options>(key: K, value: Options[K]): void =>
    setOptions((current) => ({ ...current, [key]: value }));
  const css = stylesheetCss(options.skin);
  return (
    <TourProvider tours={workbenchTours} store={store} context={null}>
      <main className="page">
        <Header current="workbench" />
        <div className="title-block">
          <div>
            <span className="label">Part</span>
            <strong>speak-friend-react</strong>
          </div>
          <div>
            <span className="label">Description</span>
            <h1>Accessible page tour guide for React</h1>
          </div>
        </div>
        <div className="bench">
          <Controls options={options} onChange={change} />
          <HostApp />
          <div className="output">
            <CodePanel title="In your component" lines={componentCode(options)} />
            <CodePanel title="In your stylesheet" lines={stylesheetCode(options.skin)} />
            <AnnouncementLog announce={options.announce} />
          </div>
        </div>
      </main>
      {css && <style>{css}</style>}
      <TourGuide
        labels={labels}
        position={options.position}
        announce={options.announce}
        theme={options.theme === "system" ? undefined : options.theme}
      />
    </TourProvider>
  );
}
