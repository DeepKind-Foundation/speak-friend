import { virtual } from "@guidepup/virtual-screen-reader";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  waiting: "Waiting for the page",
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

interface OpenOptions {
  /** Props of the guide, on top of the labels. */
  guide?: Partial<React.ComponentProps<typeof TourGuide>>;
  /** The targets that are in the page; both by default. */
  targets?: readonly ("first" | "second")[];
  /** Milliseconds to wait for a target before its step is skipped. */
  targetTimeout?: number;
  /** Start the tour and wait for the guide to be a dialog. Without it only the button is pressed. */
  settle?: boolean;
}

const open = async ({ guide, targets = ["first", "second"], targetTimeout, settle = true }: OpenOptions = {}) => {
  render(
    <TourProvider tours={[tour]} store={memoryStore()} context={null} targetTimeout={targetTimeout}>
      <Begin />
      {targets.map((name) => (
        <div key={name} data-tour={name}>{`${name} target`}</div>
      ))}
      <TourGuide labels={labels} {...guide} />
    </TourProvider>,
  );
  await act(async () => {
    fireEvent.click(screen.getByText("Take the tour"));
  });
  if (settle) await screen.findByRole("dialog");
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

  it("lets the person go back from the second step, and says Back is available", async () => {
    await open();
    await next();
    const log = await readPage();
    expect(log).toContain("button, Back");
    expect(log).not.toContain("button, Back, disabled");
  });

  it("reads the title at the heading level the app asked for", async () => {
    await open({ guide: { headingLevel: 4 } });
    const log = await readPage();
    expect(log).toContain("heading, Add a task, Step 1 of 2, level 4");
  });
});

describe("how the step reaches the person", () => {
  it("moves focus to the title, which is what makes it the first thing read", async () => {
    await open();
    expect(document.activeElement?.textContent).toBe("Add a task");
    expect(document.activeElement?.getAttribute("aria-describedby")).toBeTruthy();
  });

  it("announces the step in the status region and leaves focus alone with announce live", async () => {
    await open({ guide: { announce: "live" } });
    expect(document.activeElement?.closest("[role=dialog]")).toBeNull();
    expect(document.querySelector("[role=status]")?.textContent).toBe("Step 1 of 2: Add a task");
    const log = await readPage();
    expect(log).toContain("Step 1 of 2: Add a task");
  });

  it("says each new step in the same status region", async () => {
    await open({ guide: { announce: "live" } });
    const status = document.querySelector("[role=status]");
    await next();
    await waitFor(() => expect(status?.textContent).toBe("Step 2 of 2: Pick a day"));
    expect(document.querySelector("[role=status]")).toBe(status);
  });
});

describe("while the page is not ready", () => {
  it("says that it is waiting, offers Close, and gives way to the guide when the target arrives", async () => {
    await open({ targets: [], settle: false });
    const waiting = await screen.findByRole("group", { name: "Waiting for the page" });
    expect(waiting.getAttribute("aria-busy")).toBe("true");
    expect(document.querySelector("[role=status]")?.textContent).toBe("Waiting for the page");
    const log = await readPage();
    // The hint is read both from the status region and from the busy group, and the way out is a labelled button.
    expect(log).toContain("group, Waiting for the page, busy");
    expect(log.filter((phrase) => phrase === "Waiting for the page").length).toBeGreaterThanOrEqual(2);
    expect(log).toContain("button, Close");
    await virtual.stop();

    // Added by hand, so the test library does not clean it up.
    const target = document.createElement("div");
    target.dataset.tour = "first";
    target.textContent = "first target";
    try {
      await act(async () => {
        document.body.append(target);
      });
      expect(await screen.findByRole("dialog")).toBeTruthy();
      expect(screen.queryByRole("group", { name: "Waiting for the page" })).toBeNull();
      await waitFor(() => expect(document.querySelector("[role=status]")?.textContent).toBe(""));
    } finally {
      target.remove();
    }
  });

  it("leaves a step out of the count when its target is not on the page", async () => {
    await open({ targets: ["second"], targetTimeout: 50 });
    // The first step is given up on after the timeout, so wait for the second to be the one shown.
    await screen.findByRole("heading", { name: /Pick a day/ }, { timeout: 3000 });
    const log = await readPage();
    expect(log).toContain("heading, Pick a day, Step 1 of 1, level 2");
    expect(log).not.toContain("heading, Add a task, Step 1 of 2, level 2");
    expect(log).toContain("button, Finish");
  });
});
