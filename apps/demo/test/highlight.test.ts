import { describe, expect, it } from "vitest";
import { toText } from "../src/site/code-lines";
import { highlight } from "../src/site/highlight";
import { quickStart } from "../src/guide/quickstart";

const kinds = (source: string): string[] =>
  highlight(source)
    .flat()
    .map((t) => t.kind);

describe("highlight", () => {
  it("returns exactly the text it was given", () => {
    for (const source of [quickStart.code, 'const a = "x"; // note\n<A b="c" d={e}>t</A>', "", "\n\n"]) {
      expect(toText(highlight(source))).toBe(source);
    }
  });

  it("marks strings, comments and keywords", () => {
    expect(highlight('import x from "y";').flat()).toContainEqual({ kind: "string", text: '"y"' });
    expect(kinds("import x")).toContain("attr");
    expect(highlight("// hi").flat()).toEqual([{ kind: "comment", text: "// hi" }]);
  });

  it("marks component tags and their attributes", () => {
    const tokens = highlight("<TourGuide labels={labels} />").flat();
    expect(tokens).toContainEqual({ kind: "tag", text: "TourGuide" });
    expect(tokens).toContainEqual({ kind: "attr", text: "labels" });
  });
});
