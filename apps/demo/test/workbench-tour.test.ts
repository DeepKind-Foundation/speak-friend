import { describe, expect, it } from "vitest";
import { steps, workbenchTours } from "../src/workbench/tour";

describe("workbenchTours", () => {
  it("is one tour made of the exported steps", () => {
    expect(workbenchTours).toHaveLength(1);
    expect(workbenchTours[0]?.chapters[0]?.steps).toBe(steps);
  });

  it("targets each step once", () => {
    expect(new Set(steps.map((s) => s.target)).size).toBe(steps.length);
  });
});
