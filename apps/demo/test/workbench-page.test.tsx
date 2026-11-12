import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkbenchPage } from "../src/workbench/WorkbenchPage";

beforeEach(() => {
  // jsdom has no layout; the library only treats elements with a box as visible.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getClientRects = function () {
    return [{ width: 10, height: 10 }] as unknown as DOMRectList;
  };
  Element.prototype.getBoundingClientRect = function () {
    return { top: 20, left: 30, width: 100, height: 40, right: 130, bottom: 60, x: 30, y: 20, toJSON() {} };
  };
});
afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("dir");
});

const choose = (name: string): void => {
  fireEvent.click(screen.getByRole("radio", { name }));
};
const appliedCss = (): string =>
  Array.from(document.querySelectorAll("style"))
    .map((s) => s.textContent ?? "")
    .join("\n");
const code = (): string => screen.getByRole("tabpanel").textContent ?? "";
const openFile = (name: string): void => {
  fireEvent.click(screen.getByRole("tab", { name }));
};
const start = async (): Promise<HTMLElement> => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Start tour" }));
  });
  return screen.findByRole("dialog");
};

describe("WorkbenchPage", () => {
  it("has one level 1 heading and shows the whole Root.tsx before anything is started", () => {
    render(<WorkbenchPage />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(code()).toContain('import { TourGuide, TourProvider } from "speak-friend-react";');
    expect(code()).toContain('position="end"');
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("puts the stage before the options and the code", () => {
    render(<WorkbenchPage />);
    const stage = screen.getByRole("button", { name: "Start tour" });
    const first = screen.getByRole("radio", { name: "end" });
    const panel = screen.getByRole("tabpanel");
    expect(stage.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(first.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows an unusable preview of the guide until a tour runs", async () => {
    render(<WorkbenchPage />);
    expect(screen.getByText("Preview. The tour has not started.")).toBeTruthy();
    const preview = document.querySelector(".stage-screen .sf-guide");
    expect(preview?.getAttribute("aria-hidden")).toBe("true");
    expect(preview?.hasAttribute("inert")).toBe(true);
    await start();
    expect(document.querySelectorAll(".sf-guide")).toHaveLength(1);
    expect(screen.getByText("Tour running. Step 1 of 3.")).toBeTruthy();
  });

  it("docks the running guide inside the frame, with the options applied", async () => {
    render(<WorkbenchPage />);
    choose("start");
    choose("live");
    choose("dark");
    const dialog = await start();
    expect(document.querySelector(".stage-screen")?.contains(dialog)).toBe(true);
    expect(dialog.getAttribute("data-position")).toBe("start");
    expect(dialog.getAttribute("data-theme")).toBe("dark");
    expect(dialog.querySelector('[role="status"]')).not.toBeNull();
    await act(async () => {
      fireEvent.click(within(dialog).getByRole("button", { name: "Next" }));
    });
    await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain("Your tasks"));
  });

  it("shows the preview with the chosen dock side, theme and dim", () => {
    render(<WorkbenchPage />);
    choose("start");
    choose("on");
    const preview = document.querySelector(".stage-screen .sf-guide");
    expect(preview?.getAttribute("data-position")).toBe("start");
    expect(document.querySelector(".stage-ring")?.hasAttribute("data-dim")).toBe(true);
  });

  it("changes Root.tsx for a guide prop and announces the change", () => {
    render(<WorkbenchPage />);
    choose("start");
    expect(code()).toContain('position="start"');
    expect(screen.getAllByRole("status").some((s) => s.textContent === "position is now start")).toBe(true);
  });

  it("applies a preset and marks it as the current one", () => {
    render(<WorkbenchPage />);
    const night = screen.getByRole("button", { name: "Night, page dimmed" });
    expect(night.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(night);
    expect(night.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Default" }).getAttribute("aria-pressed")).toBe("false");
    expect(code()).toContain('theme="dark"');
    expect(code()).toContain("dim");
    choose("light");
    expect(night.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows and applies the stylesheet for a colour choice", () => {
    render(<WorkbenchPage />);
    openFile("styles.css");
    expect(code()).toContain("No overrides");
    choose("ember");
    expect(code()).toContain("--sf-accent");
    expect(appliedCss()).toContain("--sf-accent");
    choose("default");
    expect(appliedCss()).not.toContain("--sf-accent");
  });

  it("shows every file as a tab and moves between them with the arrow keys", () => {
    render(<WorkbenchPage />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Root.tsx", "tour.ts", "styles.css", "index.html"]);
    tabs[0]?.focus();
    fireEvent.keyDown(tabs[0]!, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "tour.ts" }).getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "tour.ts" }));
    expect(code()).toContain("Add a task");
  });

  it("shows only what differs from the defaults, or says there is nothing", () => {
    render(<WorkbenchPage />);
    fireEvent.click(screen.getByRole("button", { name: "Changes only" }));
    expect(code()).toContain("No changes");
    choose("start");
    expect(code()).toContain('-        position="end"');
    expect(code()).toContain('+        position="start"');
    expect(code()).not.toContain("import");
  });

  it("copies the open file and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<WorkbenchPage />);
    choose("start");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(writeText.mock.calls[0]?.[0]).toContain('position="start"');
    expect(writeText.mock.calls[0]?.[0]).toContain("import");
    expect(screen.getAllByRole("status").some((s) => s.textContent === "Copied Root.tsx")).toBe(true);
  });

  it("says when copying is not possible", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
      configurable: true,
    });
    render(<WorkbenchPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(screen.getAllByRole("status").some((s) => /Could not copy/.test(s.textContent ?? ""))).toBe(true);
  });

  it("mirrors the whole page for right to left, shows it in index.html, and restores it", () => {
    const { unmount } = render(<WorkbenchPage />);
    choose("rtl");
    expect(document.documentElement.dir).toBe("rtl");
    openFile("index.html");
    expect(code()).toContain('<html lang="en" dir="rtl">');
    expect(code()).toContain("</html>");
    unmount();
    expect(document.documentElement.getAttribute("dir")).toBeNull();
  });

  it("keeps code left to right on a right to left page", () => {
    render(<WorkbenchPage />);
    choose("rtl");
    expect(screen.getByRole("tabpanel").querySelector("pre")?.getAttribute("dir")).toBe("ltr");
  });

  it("adds no landmark or heading of its own for the sample app", () => {
    render(<WorkbenchPage />);
    const stage = document.querySelector(".stage-screen")!;
    expect(stage.querySelector("nav, h1, h2, h3")).toBeNull();
  });

  it("groups the options by what they configure", () => {
    render(<WorkbenchPage />);
    for (const name of [/TourGuide props/, /Your stylesheet/, /Your page/]) {
      expect(screen.getByRole("region", { name })).toBeTruthy();
    }
  });
});
