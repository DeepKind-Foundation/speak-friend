// Loads the built packages in plain Node ESM and renders on the server, to catch broken exports and imports.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { memoryStore } from "speak-friend";
import { TourGuide, TourProvider } from "../dist/index.js";

const labels = { counter: () => "", back: "", next: "", finish: "", close: "" };
const html = renderToString(
  createElement(
    TourProvider,
    { tours: [], store: memoryStore(), context: {} },
    createElement("main", null, "page"),
    createElement(TourGuide, { labels }),
  ),
);
if (html !== "<main>page</main>") throw new Error(`unexpected server output: ${html}`);
console.log("smoke ok");
