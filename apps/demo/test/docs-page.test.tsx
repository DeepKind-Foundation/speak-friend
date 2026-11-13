import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DocsPage } from "../src/docs/DocsPage";
import { sections } from "../src/docs/sections";

describe("DocsPage", () => {
  const html = renderToString(<DocsPage />);

  it("has one level 1 heading and a level 2 heading for every question", () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    for (const section of sections) expect(html).toContain(`id="${section.id}"`);
  });

  it("links the contents to each section", () => {
    for (const section of sections) expect(html).toContain(`href="#${section.id}"`);
  });

  it("gives every section a unique id and an answer", () => {
    expect(new Set(sections.map((s) => s.id)).size).toBe(sections.length);
    for (const section of sections) expect(section.paragraphs.length).toBeGreaterThan(0);
  });

  it("covers scoped targets, saved progress, the keyboard and the limits", () => {
    for (const word of ["within", "webStorageStore", "closeOnEscape", "returnToGuide", "closed shadow root"]) {
      expect(html).toContain(word);
    }
  });
});
