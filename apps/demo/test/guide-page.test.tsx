import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuidePage } from "../src/guide/GuidePage";
import { ledger } from "../src/guide/ledger";
import { targetFor } from "../src/guide/tours";

const layout = {
  scrollIntoView: Element.prototype.scrollIntoView,
  getClientRects: Element.prototype.getClientRects,
  getBoundingClientRect: Element.prototype.getBoundingClientRect,
};

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
  Object.assign(Element.prototype, layout);
});

const takeTheTour = async (): Promise<HTMLElement> => {
  const button = screen.getByRole("button", { name: "Take the tour" });
  button.focus();
  await act(async () => {
    fireEvent.click(button);
  });
  await screen.findByRole("dialog");
  return button;
};

describe("GuidePage", () => {
  it("shows the whole page before any tour starts", () => {
    const { container } = render(<GuidePage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    for (const entry of ledger) {
      expect(screen.getByText(entry.term)).toBeTruthy();
      expect(container.querySelector(`[data-tour="${targetFor(entry.id)}"]`)).not.toBeNull();
    }
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("starts the tour from the button and moves through the steps", async () => {
    render(<GuidePage />);
    await takeTheTour();
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain(ledger[0]?.stepTitle);
    expect(dialog.textContent).toContain("Step 1 of 4");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    });
    await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain(ledger[1]?.stepTitle));
  });

  it("closes on Escape and returns focus to the button", async () => {
    render(<GuidePage />);
    const button = await takeTheTour();
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(button);
  });
});
