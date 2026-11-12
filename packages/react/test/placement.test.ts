import { describe, expect, it } from "vitest";
import { chooseDock, type DockInput } from "../src/placement";

const base: DockInput = {
  target: { left: 100, top: 100, right: 200, bottom: 140 },
  guide: { width: 340, height: 200 },
  viewport: { width: 1280, height: 800 },
  gap: 16,
  side: "end",
  rtl: false,
  margin: 8,
};

describe("chooseDock", () => {
  it("keeps the preferred dock when the target is clear of it", () => {
    expect(chooseDock(base)).toEqual({ side: "end", edge: "bottom" });
  });

  it("moves to the other side when the target is under the preferred dock", () => {
    // Bottom right of a 1280x800 window.
    const target = { left: 1000, top: 620, right: 1200, bottom: 700 };
    expect(chooseDock({ ...base, target })).toEqual({ side: "start", edge: "bottom" });
  });

  it("counts the margin around the target, so a ring that just touches the dock still moves it", () => {
    const edgeOfDock = { left: 1000, top: 560, right: 1200, bottom: 590 };
    // The dock's top is at 800 - 16 - 200 = 584; the margin reaches it.
    expect(chooseDock({ ...base, target: edgeOfDock }).side).toBe("start");
    expect(chooseDock({ ...base, target: { ...edgeOfDock, bottom: 560 } })).toEqual({ side: "end", edge: "bottom" });
  });

  it("goes to the top when both bottom corners are covered", () => {
    const wide = { left: 20, top: 620, right: 1260, bottom: 700 };
    expect(chooseDock({ ...base, target: wide })).toEqual({ side: "end", edge: "top" });
  });

  it("keeps the preferred dock when every place is covered", () => {
    const everything = { left: 0, top: 0, right: 1280, bottom: 800 };
    expect(chooseDock({ ...base, target: everything })).toEqual({ side: "end", edge: "bottom" });
  });

  it("reads start and end as the opposite physical sides in a right-to-left page", () => {
    // `end` is the left side when the page reads right to left.
    const bottomLeft = { left: 20, top: 620, right: 300, bottom: 700 };
    expect(chooseDock({ ...base, rtl: true, target: bottomLeft })).toEqual({ side: "start", edge: "bottom" });
    expect(chooseDock({ ...base, rtl: false, target: bottomLeft })).toEqual({ side: "end", edge: "bottom" });
  });

  it("uses the top edge on a phone, where the guide is a full-width sheet", () => {
    const phone = { viewport: { width: 390, height: 800 }, guide: { width: 390, height: 300 } };
    const low = { left: 20, top: 560, right: 300, bottom: 620 };
    expect(chooseDock({ ...base, ...phone, target: low })).toEqual({ side: "end", edge: "top" });
    const high = { left: 20, top: 100, right: 300, bottom: 160 };
    expect(chooseDock({ ...base, ...phone, target: high })).toEqual({ side: "end", edge: "bottom" });
  });

  it("ignores the part of a target that is outside the window", () => {
    const below = { left: 1000, top: 900, right: 1200, bottom: 1000 };
    expect(chooseDock({ ...base, target: below })).toEqual({ side: "end", edge: "bottom" });
  });
});
