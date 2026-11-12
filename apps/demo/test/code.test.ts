import { describe, expect, it } from "vitest";
import { toText } from "../src/site/code-lines";
import { componentCode, stylesheetCode, stylesheetCss } from "../src/workbench/code";
import { defaults } from "../src/workbench/options";

describe("componentCode", () => {
  it("shows a bare dim prop only while dimming is on", () => {
    expect(toText(componentCode({ ...defaults, dim: "on" }))).toContain('announce="focus"\n  dim\n/>');
    expect(toText(componentCode(defaults))).not.toContain("dim");
  });

  it("shows the position and announce props, and no theme while the theme follows the system", () => {
    expect(toText(componentCode(defaults))).toBe(
      '<TourGuide\n  labels={labels}\n  position="end"\n  announce="focus"\n/>',
    );
  });

  it("adds the theme prop only when the theme is forced", () => {
    const text = toText(componentCode({ ...defaults, theme: "dark", position: "start", announce: "live" }));
    expect(text).toBe('<TourGuide\n  labels={labels}\n  position="start"\n  theme="dark"\n  announce="live"\n/>');
  });

  it("tags every token so the text can be coloured", () => {
    const lines = componentCode(defaults);
    expect(lines[0]).toEqual([
      { kind: "punct", text: "<" },
      { kind: "tag", text: "TourGuide" },
    ]);
    expect(lines.flat().some((t) => t.kind === "string" && t.text === '"end"')).toBe(true);
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
