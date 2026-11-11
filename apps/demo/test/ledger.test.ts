import { describe, expect, it } from "vitest";
import { ledger } from "../src/guide/ledger";

describe("ledger", () => {
  it("gives every entry text for the page and for the tour", () => {
    for (const entry of ledger) {
      for (const field of [entry.term, entry.description, entry.stepTitle, entry.stepBody]) {
        expect(field.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("uses each id once", () => {
    expect(new Set(ledger.map((entry) => entry.id)).size).toBe(ledger.length);
  });
});
