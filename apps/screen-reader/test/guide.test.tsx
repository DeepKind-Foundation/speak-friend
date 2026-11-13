import { virtual } from "@guidepup/virtual-screen-reader";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { memoryStore, type Tour } from "speak-friend";
import { TourGuide, TourProvider, useTours, type GuideLabels } from "speak-friend-react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tour: Tour<null> = {
  id: "t",
  version: 1,
  chapters: [
    {
      id: "c",
      route: "/",
      steps: [
        { id: "one", target: "first", title: "Add a task", body: "Start here." },
        { id: "two", target: "second", title: "Pick a day", body: "Choose when it is due." },
      ],
    },
  ],
};
const labels: GuideLabels = {
  counter: (n, total) => `Step ${n} of ${total}`,
  back: "Back",
  next: "Next",
  finish: "Finish",
  close: "Close",
  ended: "Tour closed",
  returnToGuide: "Back to the tour",
};

function Begin() {
  const tours = useTours<null>();
  return (
    <button type="button" onClick={() => void tours.start("t")}>
      Take the tour
    </button>
  );
}

const originals = {
  scrollIntoView: Element.prototype.scrollIntoView,
  getClientRects: Element.prototype.getClientRects,
};

beforeEach(() => {
  // jsdom does not implement the pseudo-element argument the name computation passes, and logs for every element.
  const computed = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) => computed(element));
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getClientRects = function () {
    return [{ width: 10, height: 10 }] as unknown as DOMRectList;
  };
});
afterEach(async () => {
  Object.assign(Element.prototype, originals);
  vi.restoreAllMocks();
  await virtual.stop();
  cleanup();
});

const open = async (): Promise<void> => {
  render(
    <TourProvider tours={[tour]} store={memoryStore()} context={null}>
      <Begin />
      <div data-tour="first">first target</div>
      <div data-tour="second">second target</div>
      <TourGuide labels={labels} />
    </TourProvider>,
  );
  await act(async () => {
    fireEvent.click(screen.getByText("Take the tour"));
  });
  await screen.findByRole("dialog");
};

/** Everything a screen reader says while moving through the page from the top, one item at a time. */
const readPage = async (): Promise<string[]> => {
  await virtual.start({ container: document.body });
  await virtual.next();
  const first = await virtual.lastSpokenPhrase();
  // The reader wraps around to the first item after the last one: stop there, and keep a single pass.
  for (let i = 0; i < 100; i++) {
    await virtual.next();
    if ((await virtual.lastSpokenPhrase()) === first) break;
  }
  const log = await virtual.spokenPhraseLog();
  return log.slice(0, log.length - 1);
};

const next = async (): Promise<void> => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
  });
};

describe("what a screen reader reads", () => {
  it("reaches the way back to the guide before anything else in the page", async () => {
    await open();
    const log = await readPage();
    expect(log[1]).toBe("button, Back to the tour");
    expect(log.indexOf("button, Back to the tour")).toBeLessThan(log.indexOf("button, Take the tour"));
  });

  it("announces the guide as a dialog named by the step, with the count read with the title", async () => {
    await open();
    const log = await readPage();
    expect(log).toContain("dialog, Add a task");
    expect(log).toContain("heading, Add a task, Step 1 of 2, level 2");
    expect(log).toContain("Start here.");
  });

  it("offers the buttons in order, with Back disabled on the first step", async () => {
    await open();
    const log = await readPage();
    const buttons = log.filter((phrase) => /^button, (Back(, disabled)?|Next|Close)$/.test(phrase));
    expect(buttons).toEqual(["button, Back, disabled", "button, Next", "button, Close"]);
    expect(log).toContain("end of dialog, Add a task");
  });

  it("does not hide the page: the content around the guide stays readable while it is open", async () => {
    await open();
    const log = await readPage();
    expect(log).toContain("first target");
    expect(log).toContain("second target");
    expect(document.querySelector("[role=dialog]")?.hasAttribute("aria-modal")).toBe(false);
  });

  it("reads the next step with its own count and a Finish button on the last one", async () => {
    await open();
    await next();
    const log = await readPage();
    expect(log).toContain("heading, Pick a day, Step 2 of 2, level 2");
    expect(log).toContain("button, Finish");
    expect(log).not.toContain("button, Next");
  });

  it("says that the tour ended, in the status region that was already in the page", async () => {
    await open();
    const status = document.querySelector("[role=status]");
    expect(status?.textContent).toBe("");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.querySelector("[role=status]")).toBe(status);
    expect(status?.textContent).toBe("Tour closed");
    const log = await readPage();
    expect(log).toContain("Tour closed");
  });
});
