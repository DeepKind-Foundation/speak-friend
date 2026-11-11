import { describe, expect, it } from "vitest";
import { skins } from "../src/workbench/options";

describe("options", () => {
  it("defines both custom properties for every named skin", () => {
    for (const skin of Object.values(skins)) {
      expect(skin.accent).toMatch(/^light-dark\(oklch\(/);
      expect(skin.primary).toMatch(/^oklch\(/);
    }
  });
});
