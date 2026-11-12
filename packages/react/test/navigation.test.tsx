import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { memoryStore, type Tour } from "speak-friend";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TourGuide, TourProvider, useTours, type GuideLabels } from "../src/index";
import { waitForTarget } from "../src/wait-for-target";

const tour: Tour<null> = {
  id: "across",
  version: 1,
  chapters: [
    { id: "one", route: "/one", steps: [{ id: "a", target: "head", title: "Page one", body: "On page one" }] },
    { id: "two", route: "/two", steps: [{ id: "b", target: "head", title: "Page two", body: "On page two" }] },
  ],
};
const labels: GuideLabels = {
  counter: (n, t) => `${n}/${t}`,
  back: "Back",
  next: "Next",
  finish: "Finish",
  close: "Close",
};
const tours = [tour];

function Starter() {
  const t = useTours<null>();
  return (
    <button type="button" onClick={() => void t.start("across")}>
      begin
    </button>
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getClientRects = function () {
    return [{ width: 10, height: 10 }] as unknown as DOMRectList;
  };
  Element.prototype.getBoundingClientRect = function () {
    return { top: 20, left: 30, width: 100, height: 40, right: 130, bottom: 60, x: 30, y: 20, toJSON() {} };
  };
});
afterEach(cleanup);

const open = async (navigate: (route: string) => void | Promise<void>) => {
  const store = memoryStore();
  const ui = render(
    <TourProvider tours={tours} store={store} context={null} navigate={navigate} targetTimeout={2000}>
      <Starter />
      <div id="page">
        <h1 data-tour="head" id="old">
          Old page
        </h1>
      </div>
      <TourGuide labels={labels} />
    </TourProvider>,
  );
  await act(async () => {
    fireEvent.click(screen.getByText("begin"));
  });
  await screen.findByRole("dialog");
  return ui;
};

const replaceHead = (): void => {
  const page = document.getElementById("page")!;
  const next = document.createElement("h1");
  next.setAttribute("data-tour", "head");
  next.id = "new";
  next.textContent = "New page";
  page.replaceChildren(next);
};

describe("a target name used on two pages", () => {
  it("waits for the new page instead of taking the old page's element", async () => {
    await open(() => undefined);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    });
    // The route has "changed" but the old page is still on screen.
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.getByRole("dialog").textContent).toContain("Page one");
    await act(async () => replaceHead());
    await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain("Page two"));
  });

  it("shows the step as soon as the new page's element appears, without the settling wait", async () => {
    await open(() => undefined);
    const started = Date.now();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    });
    await act(async () => {
      setTimeout(replaceHead, 30);
    });
    await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain("Page two"));
    expect(Date.now() - started).toBeLessThan(250);
  });

  it("accepts an element that stays, once the page has stopped changing", async () => {
    // For example a header that is on every page.
    await open(() => undefined);
    const started = Date.now();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    });
    await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain("Page two"), { timeout: 1500 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(250);
    expect(Date.now() - started).toBeLessThan(1500);
  });

  it("does not wait at all when the step is on the same page", async () => {
    const same: Tour<null> = {
      id: "same",
      version: 1,
      chapters: [
        {
          id: "x",
          route: "/x",
          steps: [
            { id: "1", target: "head", title: "One", body: "." },
            { id: "2", target: "head", title: "Two", body: "." },
          ],
        },
      ],
    };
    const store = memoryStore();
    render(
      <TourProvider tours={[same]} store={store} context={null} navigate={() => undefined} targetTimeout={2000}>
        <h1 data-tour="head">Head</h1>
        <Starter2 />
        <TourGuide labels={labels} />
      </TourProvider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByText("begin2"));
    });
    await screen.findByRole("dialog");
    const started = Date.now();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    });
    await waitFor(() => expect(screen.getByRole("dialog").textContent).toContain("Two"));
    expect(Date.now() - started).toBeLessThan(150);
  });
});

function Starter2() {
  const t = useTours<null>();
  return (
    <button type="button" onClick={() => void t.start("same")}>
      begin2
    </button>
  );
}

describe("waitForTarget", () => {
  const mark = (): HTMLElement => {
    const el = document.createElement("div");
    el.setAttribute("data-tour", "t");
    document.body.append(el);
    return el;
  };

  it("counts an element from before the navigation only after the page has been quiet", async () => {
    const old = mark();
    const started = Date.now();
    expect(await waitForTarget("t", 2000, { stale: new Set([old]), settle: 80 })).toBe(true);
    expect(Date.now() - started).toBeGreaterThanOrEqual(70);
    old.remove();
  });

  it("counts an element that was not there before at once", async () => {
    const old = mark();
    const waiting = waitForTarget("t", 2000, { stale: new Set([old]), settle: 1000 });
    const started = Date.now();
    const fresh = mark();
    expect(await waiting).toBe(true);
    expect(Date.now() - started).toBeLessThan(200);
    old.remove();
    fresh.remove();
  });

  it("still gives up at the timeout when nothing matches", async () => {
    expect(await waitForTarget("nothing-here", 60, { stale: new Set([document.body]) })).toBe(false);
  });

  it("behaves as before when no stale set is given", async () => {
    const el = document.createElement("div");
    el.setAttribute("data-tour", "plain");
    document.body.append(el);
    expect(await waitForTarget("plain", 50)).toBe(true);
    el.remove();
  });
});
