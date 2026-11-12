import { quickStart } from "../guide/quickstart";
import { NPM, REPO, pageUrl } from "./site";

/** The text of llms.txt: a short, plain description of the library for coding agents, with a complete example. */
export function llmsTxt(): string {
  return `# Speak, Friend

> Speak, Friend is a small React library for accessible product tours and onboarding walkthroughs. A headless engine (speak-friend) and a docked guide for React 18 and later (speak-friend-react). Keyboard first, screen reader friendly, and it leaves the page usable, dimming it only if you ask. MIT licence, alpha.

## Install

${quickStart.install}

## Facts

- The engine has no DOM or React dependency and runs on the server. It models a tour as chapters (one per route) and steps.
- A step points at an element with a data-tour attribute. If a name is used twice, the first visible element wins.
- The library has no text of its own: the labels prop supplies every string, in any language.
- The guide is a non-modal dialog docked to the window. Focus moves to the step title, Escape closes it and returns focus to the opener, and it follows the page direction, so it mirrors in right-to-left layouts.
- Progress is saved through a store you provide. memoryStore is included.
- Both packages are ESM only.

## Example

\`\`\`tsx
${quickStart.code}
\`\`\`

## Links

- [Guide and quick start](${pageUrl("guide")}): what it does, the example above and the props of the guide
- [Workbench](${pageUrl("workbench")}): try every option and see the code each choice produces
- [speak-friend on npm](${NPM.engine}): the engine
- [speak-friend-react on npm](${NPM.react}): the guide for React
- [Source and README](${REPO}#readme)
`;
}
