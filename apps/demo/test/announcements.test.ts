import { describe, expect, it } from "vitest";
import { describeAnnouncements } from "../src/workbench/announcements";

describe("describeAnnouncements", () => {
  it("describes focus moving to the step title", () => {
    const lines = describeAnnouncements("focus", "Add a task", 0, 3);
    expect(lines[0]).toBe('Focus moves to the heading: "Add a task", level 2.');
    expect(lines.join(" ")).not.toContain("polite status");
  });

  it("describes a polite status message when focus stays put", () => {
    const lines = describeAnnouncements("live", "Add a task", 0, 3);
    expect(lines[0]).toBe("Focus stays where it was.");
    expect(lines[1]).toBe('A polite status message reads: "Step 1 of 3: Add a task".');
  });

  it("mentions the dimmed Back button on the first step only", () => {
    expect(describeAnnouncements("focus", "A", 0, 3).join(" ")).toContain("dimmed");
    expect(describeAnnouncements("focus", "B", 1, 3).join(" ")).not.toContain("dimmed");
  });
});
