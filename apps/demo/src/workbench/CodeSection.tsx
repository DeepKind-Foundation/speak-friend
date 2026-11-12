import { useId, useState, type JSX, type KeyboardEvent } from "react";
import { Tokens } from "../site/CodePanel";
import { fileNames, fileRows, fileText, type FileName } from "./code";
import { defaults, type Options } from "./options";

type View = "full" | "changes";

const MARK: Record<string, string> = { added: "+", removed: "-", same: " " };

/** Tabs with one file each, a switch between the whole file and only what differs from the defaults, and Copy. */
export function CodeSection({ options }: { options: Options }): JSX.Element {
  const id = useId();
  const [file, setFile] = useState<FileName>("Root.tsx");
  const [view, setView] = useState<View>("full");
  const [copied, setCopied] = useState("");
  const rows = fileRows(file, options, defaults);
  const shown =
    view === "full" ? rows.filter((row) => row.change !== "removed") : rows.filter((row) => row.change !== "same");

  const move = (event: KeyboardEvent, index: number): void => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = fileNames[(index + step + fileNames.length) % fileNames.length];
    if (!next) return;
    setFile(next);
    document.getElementById(`${id}-${next}`)?.focus();
  };

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(fileText(file, options));
      setCopied(`Copied ${file}`);
    } catch {
      setCopied("Could not copy. Select the code and copy it.");
    }
  };

  return (
    <section className="code-section" aria-labelledby={`${id}-title`}>
      <h2 className="label" id={`${id}-title`}>
        The code
      </h2>
      <div className="code-bar">
        <div role="tablist" aria-label="Files" className="tabs">
          {fileNames.map((name, index) => (
            <button
              key={name}
              type="button"
              role="tab"
              id={`${id}-${name}`}
              aria-selected={file === name}
              aria-controls={`${id}-panel`}
              tabIndex={file === name ? 0 : -1}
              onClick={() => setFile(name)}
              onKeyDown={(event) => move(event, index)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="code-tools">
          <div role="group" aria-label="Show" className="seg">
            <button type="button" aria-pressed={view === "full"} onClick={() => setView("full")}>
              Full file
            </button>
            <button type="button" aria-pressed={view === "changes"} onClick={() => setView("changes")}>
              Changes only
            </button>
          </div>
          <button type="button" className="copy" onClick={() => void copy()}>
            Copy
          </button>
        </div>
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${file}`} className="code-panel">
        {shown.length === 0 ? (
          <p className="hint">No changes. This file is what you get with the defaults.</p>
        ) : (
          // A scrolling region must be reachable by keyboard so long lines can be read.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          <pre dir="ltr" tabIndex={0}>
            <code>
              {shown.map((row, index) => (
                <span key={index} className={`row row-${row.change}`}>
                  <span className="mark" aria-hidden="true">
                    {view === "changes" ? MARK[row.change] : " "}
                  </span>
                  <Tokens line={row.tokens} />
                  {"\n"}
                </span>
              ))}
            </code>
          </pre>
        )}
      </div>
      <p className="vh" role="status">
        {copied}
      </p>
    </section>
  );
}
