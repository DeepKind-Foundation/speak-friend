import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

const codeOf = (label: string): string => screen.getByRole("region", { name: label }).textContent ?? "";

describe("WorkbenchPage", () => {
  it("shows the code for the default options before anything is started", () => {
    render(<WorkbenchPage />);
    expect(codeOf("In your component")).toContain('position="end"');
    expect(codeOf("In your stylesheet")).toContain("No overrides");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("updates the component code when a prop changes", () => {
    render(<WorkbenchPage />);
    choose("start");
    choose("live");
    expect(codeOf("In your component")).toContain('position="start"');
    expect(codeOf("In your component")).toContain('announce="live"');
  });

  it("shows and applies the stylesheet for a colour preset", () => {
    render(<WorkbenchPage />);
    choose("ember");
    expect(codeOf("In your stylesheet")).toContain("--sf-accent");
    expect(appliedCss()).toContain("--sf-accent");
    choose("default");
    expect(appliedCss()).not.toContain("--sf-accent");
  });

  it("mirrors the whole page for right to left and restores it", () => {
    const { unmount } = render(<WorkbenchPage />);
    choose("right to left");
    expect(document.documentElement.dir).toBe("rtl");
    unmount();
    expect(document.documentElement.getAttribute("dir")).toBeNull();
  });

  it("keeps code left to right on a right to left page", () => {
    render(<WorkbenchPage />);
    choose("right to left");
    for (const name of ["In your component", "In your stylesheet"]) {
      expect(screen.getByRole("region", { name }).querySelector("pre")?.getAttribute("dir")).toBe("ltr");
    }
  });

  it("starts the tour on the host app and passes the options to the guide", async () => {
    render(<WorkbenchPage />);
    choose("start");
    choose("live");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start tour" }));
    });
    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("data-position")).toBe("start");
    expect(dialog.querySelector('[role="status"]')).not.toBeNull();
    expect(dialog.textContent).toContain("Add a task");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    });
    await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain("Your tasks"));
  });

  it("forces the guide theme", async () => {
    render(<WorkbenchPage />);
    choose("dark");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Start tour" }));
    });
    expect((await screen.findByRole("dialog")).getAttribute("data-theme")).toBe("dark");
  });
});
