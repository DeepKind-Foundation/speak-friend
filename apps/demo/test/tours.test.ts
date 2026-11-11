import { describe, expect, it } from "vitest";
import { ledger } from "../src/guide/ledger";
import { buildTours, targetFor } from "../src/guide/tours";

describe("buildTours", () => {
  const tours = buildTours(ledger);
  const steps = tours[0]?.chapters[0]?.steps ?? [];

  it("builds one tour with one chapter", () => {
    expect(tours).toHaveLength(1);
    expect(tours[0]?.chapters).toHaveLength(1);
  });

  it("makes one step per ledger entry, in order", () => {
    expect(steps.map((s) => s.title)).toEqual(ledger.map((e) => e.stepTitle));
    expect(steps.map((s) => s.body)).toEqual(ledger.map((e) => e.stepBody));
  });

  it("targets the marker of each entry, with no target used twice", () => {
    expect(steps.map((s) => s.target)).toEqual(ledger.map((e) => targetFor(e.id)));
    expect(new Set(steps.map((s) => s.target)).size).toBe(steps.length);
  });
});
