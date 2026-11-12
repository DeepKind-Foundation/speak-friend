import { useEffect, useRef, useState, type JSX } from "react";
import { memoryStore } from "speak-friend";
import { TourGuide, TourProvider } from "speak-friend-react";
import { Header } from "../site/Header";
import { labels } from "../site/labels";
import { CodeSection } from "./CodeSection";
import { stylesheetCss } from "./code";
import { Controls } from "./Controls";
import { defaults, optionsOf, type Options, type Preset } from "./options";
import { Stage } from "./Stage";
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

/** The second page: a sample app with the guide docked in it, the options, and the code each choice produces. */
export function WorkbenchPage(): JSX.Element {
  const [options, setOptions] = useState<Options>(defaults);
  const [note, setNote] = useState("");
  const [store] = useState(() => memoryStore());
  const frame = useRef<HTMLDivElement>(null);
  useDirection(options.direction);
  const change = <K extends keyof Options>(key: K, value: Options[K]): void => {
    setOptions((current) => ({ ...current, [key]: value }));
    setNote(`${key} is now ${value}`);
  };
  const choosePreset = (preset: Preset): void => {
    setOptions(optionsOf(preset));
    setNote(`${preset.name} applied`);
  };
  const css = stylesheetCss(options.skin);
  return (
    <TourProvider tours={workbenchTours} store={store} context={null}>
      <main className="page">
        <Header current="workbench" />
        <h1 className="bench-title">Try the guide, then copy the code</h1>
        <div className="stage-wrap">
          <Stage options={options} frame={frame} />
        </div>
        <Controls options={options} onChange={change} onPreset={choosePreset} />
        <CodeSection options={options} />
        <p className="vh" role="status">
          {note}
        </p>
      </main>
      {css && <style>{css}</style>}
      <TourGuide
        labels={labels}
        container={() => frame.current}
        position={options.position}
        announce={options.announce}
        dim={options.dim === "on"}
        theme={options.theme === "system" ? undefined : options.theme}
      />
    </TourProvider>
  );
}
