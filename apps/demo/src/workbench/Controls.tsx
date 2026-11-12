import type { JSX } from "react";
import { Choice } from "./Choice";
import { optionsOf, presets, sameOptions, type Options, type Preset } from "./options";

interface ControlsProps {
  options: Options;
  onChange: <K extends keyof Options>(key: K, value: Options[K]) => void;
  onPreset: (preset: Preset) => void;
}

/** The switches, grouped by what they configure: the guide's props, your stylesheet, your page. */
export function Controls({ options, onChange, onPreset }: ControlsProps): JSX.Element {
  return (
    <form className="controls" onSubmit={(event) => event.preventDefault()}>
      <fieldset className="presets">
        <legend>Start from</legend>
        <div className="preset-options">
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="preset"
              aria-pressed={sameOptions(options, optionsOf(preset))}
              onClick={() => onPreset(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </fieldset>
      <section className="group" aria-labelledby="group-props">
        <h2 className="label" id="group-props">
          TourGuide props <small>Root.tsx</small>
        </h2>
        <div className="choices">
          <Choice
            legend="Dock side"
            hint="Mirrors in right-to-left."
            value={options.position}
            options={["end", "start"]}
            onChange={(v) => onChange("position", v)}
          />
          <Choice
            legend="Theme"
            hint="System follows the operating system."
            value={options.theme}
            options={["system", "light", "dark"]}
            onChange={(v) => onChange("theme", v)}
          />
          <Choice
            legend="Dim the page"
            hint="Off by default. Left out for more contrast."
            value={options.dim}
            options={["off", "on"]}
            onChange={(v) => onChange("dim", v)}
          />
          <Choice
            legend="Announce"
            hint="Move focus to the title, or use a live region."
            value={options.announce}
            options={["focus", "live"]}
            onChange={(v) => onChange("announce", v)}
          />
        </div>
      </section>
      <section className="group" aria-labelledby="group-style">
        <h2 className="label" id="group-style">
          Your stylesheet <small>styles.css</small>
        </h2>
        <div className="choices">
          <Choice
            legend="Colours"
            hint="Two custom properties set the accent and the action colour."
            value={options.skin}
            options={["default", "ember", "forest"]}
            onChange={(v) => onChange("skin", v)}
          />
        </div>
      </section>
      <section className="group" aria-labelledby="group-page">
        <h2 className="label" id="group-page">
          Your page <small>index.html. Not a guide prop</small>
        </h2>
        <div className="choices">
          <Choice
            legend="Reading direction"
            hint="The guide follows your page. There is nothing to set."
            value={options.direction}
            options={["ltr", "rtl"]}
            onChange={(v) => onChange("direction", v)}
          />
        </div>
      </section>
    </form>
  );
}
