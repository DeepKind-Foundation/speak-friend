import { describe, expect, it } from "vitest";
import { toText } from "../src/site/code-lines";
import { fileCode, fileNames, fileRows, fileText, stylesheetCode, stylesheetCss } from "../src/workbench/code";
import { defaults } from "../src/workbench/options";

describe("Root.tsx", () => {
  it("is a whole component: imports, provider and guide", () => {
    const text = fileText("Root.tsx", defaults);
    expect(text).toContain('import { TourGuide, TourProvider } from "speak-friend-react";');
    expect(text).toContain("<TourProvider tours={tours} store={store} context={null}>");
    expect(text).toContain('position="end"\n        announce="focus"\n      />');
  });

  it("adds a bare dim prop only while dimming is on", () => {
    expect(fileText("Root.tsx", { ...defaults, dim: "on" })).toContain('announce="focus"\n        dim\n      />');
    expect(fileText("Root.tsx", defaults)).not.toContain("dim");
  });

  it("adds the theme prop only when the theme is forced", () => {
    expect(fileText("Root.tsx", defaults)).not.toContain("theme=");
    expect(fileText("Root.tsx", { ...defaults, theme: "dark" })).toContain('theme="dark"');
  });

  it("tags tokens so the text can be coloured", () => {
    const tokens = fileCode("Root.tsx", defaults).flat();
    expect(tokens.some((t) => t.kind === "string" && t.text === '"end"')).toBe(true);
    expect(tokens.some((t) => t.kind === "tag" && t.text === "TourGuide")).toBe(true);
  });
});

describe("the other files", () => {
  it("tour.ts holds every step of the sample tour", () => {
    const text = fileText("tour.ts", defaults);
    for (const title of ["Add a task", "Your tasks", "Narrow the list"]) expect(text).toContain(title);
    expect(text).toContain("data-tour");
  });

  it("index.html carries the direction", () => {
    expect(fileText("index.html", defaults)).toBe('<html lang="en">');
    expect(fileText("index.html", { ...defaults, direction: "rtl" })).toBe('<html lang="en" dir="rtl">');
  });

  it("has code for every file name", () => {
    for (const name of fileNames) expect(fileText(name, defaults).length).toBeGreaterThan(0);
  });
});

describe("fileRows", () => {
  it("marks every line as unchanged for the defaults", () => {
    expect(fileRows("Root.tsx", defaults, defaults).every((row) => row.change === "same")).toBe(true);
  });

  it("shows a changed prop as one removed and one added line, in place", () => {
    const rows = fileRows("Root.tsx", { ...defaults, position: "start" }, defaults);
    const changed = rows
      .filter((row) => row.change !== "same")
      .map(
        (row) =>
          `${row.change} ${row.tokens
            .map((t) => t.text)
            .join("")
            .trim()}`,
      );
    expect(changed).toEqual(['removed position="end"', 'added position="start"']);
    const order = rows.map((row) => row.change);
    expect(order.indexOf("removed") + 1).toBe(order.indexOf("added"));
  });

  it("shows a new line as added only", () => {
    const rows = fileRows("Root.tsx", { ...defaults, dim: "on" }, defaults);
    expect(rows.filter((row) => row.change === "added")).toHaveLength(1);
    expect(rows.some((row) => row.change === "removed")).toBe(false);
  });
});

describe("stylesheetCode", () => {
  it("says there is nothing to override for the default colours", () => {
    expect(toText(stylesheetCode("default"))).toBe("/* No overrides: the default colours. */");
    expect(stylesheetCss("default")).toBe("");
  });

  it("overrides both custom properties on the guide and the ring", () => {
    const text = toText(stylesheetCode("ember"));
    expect(text.startsWith(".sf-guide,\n.sf-ring {\n")).toBe(true);
    expect(text).toContain("--sf-accent: light-dark(");
    expect(text).toContain("--sf-primary: oklch(");
    expect(text.endsWith("\n}")).toBe(true);
  });

  it("applies the same text it shows", () => {
    expect(stylesheetCss("forest")).toBe(toText(stylesheetCode("forest")));
  });
});
