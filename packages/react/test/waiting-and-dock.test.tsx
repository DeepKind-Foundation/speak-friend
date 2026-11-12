import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { memoryStore, type Tour } from "speak-friend";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TourGuide, TourProvider, useTours, type GuideLabels } from "../src/index";

const tour: Tour<null> = {
  id: "t",
  version: 1,
  chapters: [
    {
      id: "c",
      route: "/",
      steps: [
        { id: "one", target: "first", title: "First", body: "." },
        { id: "two", target: "second", title: "Second", body: "." },
      ],
    },
  ],
};
const labels: GuideLabels = {
  counter: (n, t) => `${n}/${t}`,
  back: "Back",
  next: "Next",
  finish: "Finish",
  close: "Close",
  waiting: "Waiting for the page",
};
const tours = [tour];

function Starter() {
  const t = useTours<null>();
  return (
    <button type="button" onClick={() => void t.start("t")}>
      begin
    </button>
  );
}

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }) as DOMRect;

/** Where each target is, by its data-tour name; anything else gets a harmless box in the top left corner. */
let layout: Record<string, DOMRect> = {};

beforeEach(() => {
  layout = {};
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getClientRects = function () {
    return [{ width: 10, height: 10 }] as unknown as DOMRectList;
  };
  Element.prototype.getBoundingClientRect = function () {
    return layout[this.getAttribute("data-tour") ?? ""] ?? rect(30, 20, 100, 40);
  };
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get: () => 340 });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 200 });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
});
afterEach(() => {
  cleanup();
  document.querySelectorAll("body > [data-tour]").forEach((el) => el.remove());
  document.documentElement.removeAttribute("style");
  delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth;
  delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
});

const begin = async (props: Partial<React.ComponentProps<typeof TourGuide>> = {}, withSecond = true) => {
  render(
    <TourProvider tours={tours} store={memoryStore()} context={null} targetTimeout={1500}>
      <Starter />
      <div data-tour="first">first</div>
      {withSecond && <div data-tour="second">second</div>}
      <TourGuide labels={labels} {...props} />
    </TourProvider>,
  );
  await act(async () => {
    fireEvent.click(screen.getByText("begin"));
  });
  return screen.findByRole("dialog");
};
const next = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
  });
};
const scrolled = async () => {
  await act(async () => {
    window.dispatchEvent(new Event("scrollend"));
  });
};

describe("while the next step is taking a moment", () => {
  it("says so, marks the guide busy, and clears it once the step is shown", async () => {
    const dialog = await begin({}, false);
    expect(dialog.getAttribute("aria-busy")).toBeNull();
    await next();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Waiting for the page"));
    expect(screen.getByRole("dialog").getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("dialog").textContent).toContain("First");
    await act(async () => {
      const el = document.createElement("div");
      el.setAttribute("data-tour", "second");
      document.body.append(el);
    });
    await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain("Second"));
    expect(screen.getByRole("status").textContent).toBe("");
    expect(screen.getByRole("dialog").getAttribute("aria-busy")).toBeNull();
  });

  it("keeps an empty live region in place, so the text is announced when it appears", async () => {
    await begin();
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("shows no waiting line when the app gave no text, but still marks the guide busy", async () => {
    const dialog = await begin({ labels: { ...labels, waiting: undefined } }, false);
    await next();
    await waitFor(() => expect(screen.getByRole("dialog").getAttribute("aria-busy")).toBe("true"));
    expect(dialog.querySelector(".sf-waiting")).toBeNull();
  });
});

describe("keeping clear of the target", () => {
  it("stays where the app put it when the target is not under it", async () => {
    layout = { first: rect(100, 100, 100, 40) };
    const dialog = await begin();
    await scrolled();
    expect(dialog.getAttribute("data-position")).toBe("end");
    expect(dialog.getAttribute("data-edge")).toBe("bottom");
  });

  it("moves to the other side when the target is under it", async () => {
    layout = { first: rect(1000, 620, 200, 80) };
    const dialog = await begin();
    await scrolled();
    await waitFor(() => expect(dialog.getAttribute("data-position")).toBe("start"));
    expect(dialog.getAttribute("data-edge")).toBe("bottom");
  });

  it("moves to the top when both bottom corners are covered, and reserves the top, not the end of the page", async () => {
    layout = { first: rect(20, 620, 1240, 80) };
    const dialog = await begin();
    expect(document.documentElement.style.getPropertyValue("scroll-padding-bottom")).toMatch(/px$/);
    await scrolled();
    await waitFor(() => expect(dialog.getAttribute("data-edge")).toBe("top"));
    const root = document.documentElement.style;
    expect(root.getPropertyValue("scroll-padding-top")).toBe("224px");
    expect(root.getPropertyValue("scroll-padding-bottom")).toBe("");
    expect(root.getPropertyValue("padding-bottom")).toBe("");
  });

  it("measures again for the next step", async () => {
    layout = { first: rect(100, 100, 100, 40), second: rect(1000, 620, 200, 80) };
    const dialog = await begin();
    await scrolled();
    expect(dialog.getAttribute("data-position")).toBe("end");
    await next();
    await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain("Second"));
    await scrolled();
    await waitFor(() => expect(screen.getByRole("dialog").getAttribute("data-position")).toBe("start"));
  });

  it("measures after a short wait when the browser never says the scroll ended", async () => {
    layout = { first: rect(1000, 620, 200, 80) };
    const dialog = await begin();
    await waitFor(() => expect(dialog.getAttribute("data-position")).toBe("start"), { timeout: 1500 });
  });

  it("starts from the app's own choice for a tour that comes after", async () => {
    layout = { first: rect(1000, 620, 200, 80) };
    await begin({ position: "start" });
    await scrolled();
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    layout = {};
    await act(async () => {
      fireEvent.click(screen.getByText("begin"));
    });
    expect((await screen.findByRole("dialog")).getAttribute("data-position")).toBe("start");
  });
});
