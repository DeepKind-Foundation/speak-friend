import type { CodeLines, Token } from "../site/code-lines";
import { toText } from "../site/code-lines";
import { highlight } from "../site/highlight";
import { labels } from "../site/labels";
import { defaults, skins, type Options, type SkinName } from "./options";
import { steps } from "./tour";

/** The files the page shows. */
export const fileNames = ["Root.tsx", "tour.ts", "styles.css", "index.html"] as const;
export type FileName = (typeof fileNames)[number];

/** Whether a line is the same as in the default code, new, or only in the default code. */
export type Change = "same" | "added" | "removed";
/** One line of code and how it differs from the default. */
export interface Row {
  tokens: Token[];
  change: Change;
}

const rootSource = (o: Options): string =>
  [
    'import { TourGuide, TourProvider } from "speak-friend-react";',
    'import "speak-friend-react/styles.css";',
    'import { App } from "./App";',
    'import { labels, store, tours } from "./tour";',
    "",
    "export function Root() {",
    "  return (",
    "    <TourProvider tours={tours} store={store} context={null}>",
    "      <App />",
    "      <TourGuide",
    "        labels={labels}",
    // Only what differs from the defaults is written, as it would be in an app.
    ...(o.position === defaults.position ? [] : [`        position="${o.position}"`]),
    ...(o.theme === defaults.theme ? [] : [`        theme="${o.theme}"`]),
    ...(o.announce === defaults.announce ? [] : [`        announce="${o.announce}"`]),
    ...(o.dim === defaults.dim ? [] : ["        dim"]),
    "      />",
    "    </TourProvider>",
    "  );",
    "}",
  ].join("\n");

const quote = (text: string): string => JSON.stringify(text);

const tourSource = (): string =>
  [
    'import { memoryStore, type Tour } from "speak-friend";',
    'import type { GuideLabels } from "speak-friend-react";',
    "",
    '// Mark each target in your markup, for example <button data-tour="new-task">New task</button>.',
    "export const tours: Tour<null>[] = [",
    '  { id: "tasks", version: 1, chapters: [{ id: "today", route: "/", steps: [',
    ...steps.map(
      (s) =>
        `    { id: ${quote(s.id)}, target: ${quote(s.target)}, title: ${quote(s.title)}, body: ${quote(s.body)} },`,
    ),
    "  ] }] },",
    "];",
    "",
    "export const store = memoryStore();",
    "",
    "export const labels: GuideLabels = {",
    "  counter: (n, total) => `Step ${n} of ${total}`,",
    '  back: "Back",',
    '  next: "Next",',
    '  finish: "Finish",',
    '  close: "Close",',
    // The strings the stage uses, so the code does what the page does.
    ...(labels.waiting ? [`  waiting: ${quote(labels.waiting)},`] : []),
    ...(labels.ended ? [`  ended: ${quote(labels.ended)},`] : []),
    ...(labels.returnToGuide ? [`  returnToGuide: ${quote(labels.returnToGuide)},`] : []),
    "};",
  ].join("\n");

const htmlSource = (o: Options): string =>
  [
    "<!doctype html>",
    o.direction === "rtl" ? '<html lang="en" dir="rtl">' : '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    "    <title>Your app</title>",
    "  </head>",
    "  <body>",
    '    <div id="root"></div>',
    '    <script type="module" src="/src/main.tsx"></script>',
    "  </body>",
    "</html>",
  ].join("\n");

/** The stylesheet that gives the guide the chosen colours. */
export function stylesheetCode(skin: SkinName): CodeLines {
  if (skin === "default") return [[{ kind: "comment", text: "/* No overrides: the default colours. */" }]];
  const { accent, primary } = skins[skin];
  const custom = (name: string, value: string): Token[] => [
    { kind: "punct", text: "  " },
    { kind: "attr", text: name },
    { kind: "punct", text: ": " },
    { kind: "value", text: value },
    { kind: "punct", text: ";" },
  ];
  return [
    [
      { kind: "tag", text: ".sf-guide" },
      { kind: "punct", text: "," },
    ],
    [
      { kind: "tag", text: ".sf-ring" },
      { kind: "punct", text: " {" },
    ],
    custom("--sf-accent", accent),
    custom("--sf-primary", primary),
    [{ kind: "punct", text: "}" }],
  ];
}

/** The CSS to inject: exactly the text the page shows, or nothing for the default colours. */
export function stylesheetCss(skin: SkinName): string {
  return skin === "default" ? "" : toText(stylesheetCode(skin));
}

/** The code of one file for the chosen options. */
export function fileCode(file: FileName, options: Options): CodeLines {
  switch (file) {
    case "Root.tsx":
      return highlight(rootSource(options));
    case "tour.ts":
      return highlight(tourSource());
    case "styles.css":
      return stylesheetCode(options.skin);
    case "index.html":
      return highlight(htmlSource(options));
  }
}

/** The text of one file, as it is copied. */
export const fileText = (file: FileName, options: Options): string => toText(fileCode(file, options));

/** Line by line difference of two lists, in order. */
function diff(before: string[], after: string[]): { change: Change; text: string }[] {
  // Longest common subsequence of lines; the files are a few dozen lines long.
  const lcs = Array.from({ length: before.length + 1 }, () => new Array<number>(after.length + 1).fill(0));
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      lcs[i]![j] = before[i] === after[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const out: { change: Change; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      out.push({ change: "same", text: after[j++]! });
      i++;
    } else if (i < before.length && (j === after.length || lcs[i + 1]![j]! >= lcs[i]![j + 1]!)) {
      out.push({ change: "removed", text: before[i++]! });
    } else {
      out.push({ change: "added", text: after[j++]! });
    }
  }
  return out;
}

/**
 * The lines of a file with how each differs from the default code. Lines only in the default are kept, so a change
 * reads as a replacement.
 */
export function fileRows(file: FileName, options: Options, defaults: Options): Row[] {
  const textOf = (line: Token[]): string => line.map((t) => t.text).join("");
  const current = fileCode(file, options);
  const original = fileCode(file, defaults);
  const byText = (lines: CodeLines): Map<string, Token[]> => new Map(lines.map((line) => [textOf(line), line]));
  const now = byText(current);
  const before = byText(original);
  return diff(original.map(textOf), current.map(textOf)).map(({ change, text }) => ({
    change,
    tokens: (change === "removed" ? before : now).get(text) ?? [{ kind: "plain", text }],
  }));
}
