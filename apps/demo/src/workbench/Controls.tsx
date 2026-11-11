import type { JSX } from "react";
import { Choice } from "./Choice";
import type { Options } from "./options";

interface ControlsProps {
  options: Options;
  onChange: <K extends keyof Options>(key: K, value: Options[K]) => void;
}

/** The switches: guide props and colours, and the direction of the page. */
export function Controls({ options, onChange }: ControlsProps): JSX.Element {
  return (
    <form className="controls" onSubmit={(event) => event.preventDefault()}>
      <section className="group" aria-labelledby="group-guide">
        <h2 className="label" id="group-guide">
          Customise the guide
        </h2>
        <Choice
          legend="position"
          value={options.position}
          options={["start", "end"]}
          onChange={(v) => onChange("position", v)}
        />
        <Choice
          legend="theme"
          value={options.theme}
          options={["system", "light", "dark"]}
          onChange={(v) => onChange("theme", v)}
        />
        <Choice
          legend="announce"
          value={options.announce}
          options={["focus", "live"]}
          onChange={(v) => onChange("announce", v)}
        />
        <Choice
          legend="colours"
          value={options.skin}
          options={["default", "ember", "forest"]}
          onChange={(v) => onChange("skin", v)}
        />
      </section>
      <section className="group" aria-labelledby="group-page">
        <h2 className="label" id="group-page">
          Try it on a page that reads
        </h2>
        <Choice
          legend="direction"
          value={options.direction}
          options={["ltr", "rtl"]}
          labels={{ ltr: "left to right", rtl: "right to left" }}
          onChange={(v) => onChange("direction", v)}
        />
        <p className="hint">The guide follows your page. There is nothing to set.</p>
      </section>
    </form>
  );
}
