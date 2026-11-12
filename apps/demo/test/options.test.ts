import { describe, expect, it } from "vitest";
import { defaults, optionsOf, presets, sameOptions, skins } from "../src/workbench/options";

describe("options", () => {
  it("defines both custom properties for every named skin", () => {
    for (const skin of Object.values(skins)) {
      expect(skin.accent).toMatch(/^light-dark\(oklch\(/);
      expect(skin.primary).toMatch(/^oklch\(/);
    }
  });

  it("starts the presets with the defaults, so the first one changes nothing", () => {
    expect(sameOptions(optionsOf(presets[0]!), defaults)).toBe(true);
  });

  it("gives every preset different options", () => {
    const all = presets.map(optionsOf);
    for (const [i, a] of all.entries())
      for (const [j, b] of all.entries()) if (i < j) expect(sameOptions(a, b)).toBe(false);
  });
});
