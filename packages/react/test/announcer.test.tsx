import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { memoryStore, type ProgressStore, type Tour } from "speak-friend";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TourGuide,
  TourProvider,
  useTourProgress,
  useTourProgressLoaded,
  useTours,
  type GuideLabels,
} from "../src/index";

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
  ended: "Tour closed",
};

function Controls() {
  const t = useTours<null>();
  return (
    <>
      <button type="button" onClick={() => void t.start("t")}>
        begin
      </button>
      <button type="button" onClick={() => void t.close()}>
        stop
      </button>
    </>
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getClientRects = function () {
    return [{ width: 10, height: 10 }] as unknown as DOMRectList;
  };
});
afterEach(cleanup);

const renderTour = (
  props: Partial<React.ComponentProps<typeof TourGuide>> = {},
  store: ProgressStore = memoryStore(),
) =>
  render(
    <TourProvider tours={[tour]} store={store} context={null} onError={() => undefined}>
      <Controls />
      <div data-tour="first">first</div>
      <div data-tour="second">second</div>
      <TourGuide labels={labels} {...props} />
    </TourProvider>,
  );
const press = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};

describe("the live region", () => {
  it("is in the page, empty, before any tour starts", () => {
    renderTour();
    const region = screen.getByRole("status");
    expect(region.textContent).toBe("");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-atomic")).toBe("true");
  });

  it("is the same element before, during and after the tour, with each step said as a change", async () => {
    renderTour({ announce: "live" });
    const region = screen.getByRole("status");
    await press("begin");
    await screen.findByRole("dialog");
    expect(screen.getByRole("status")).toBe(region);
    expect(region.textContent).toBe("1/2: First");
    await press("Next");
    await waitFor(() => expect(region.textContent).toBe("2/2: Second"));
    expect(screen.getByRole("status")).toBe(region);
  });

  it("says nothing about steps when focus carries them", async () => {
    renderTour({ announce: "focus" });
    await press("begin");
    await screen.findByRole("dialog");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("says the tour ended, whatever the reason, when the app gave a text", async () => {
    renderTour();
    await press("begin");
    await screen.findByRole("dialog");
    await press("stop");
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Tour closed"));
  });

  it("says it again after the next tour, and starts each tour with an empty region", async () => {
    renderTour();
    await press("begin");
    await screen.findByRole("dialog");
    await press("stop");
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Tour closed"));
    await press("begin");
    await screen.findByRole("dialog");
    expect(screen.getByRole("status").textContent).toBe("");
    await press("stop");
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Tour closed"));
  });

  it("says nothing at the end without a text", async () => {
    renderTour({ labels: { ...labels, ended: undefined } });
    await press("begin");
    await screen.findByRole("dialog");
    await press("stop");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("status").textContent).toBe("");
  });
});

describe("the position of the step", () => {
  it("is the description of the title, so it is read with the title that takes focus", async () => {
    renderTour();
    await press("begin");
    const dialog = await screen.findByRole("dialog");
    const title = dialog.querySelector(".sf-title");
    const described = title?.getAttribute("aria-describedby") ?? "";
    expect(described).not.toBe("");
    expect(document.getElementById(described)?.textContent).toBe("1/2");
  });
});

describe("a store that fails", () => {
  const failing = (): ProgressStore => ({
    get: async () => {
      throw new Error("blocked");
    },
    set: async () => {
      throw new Error("quota");
    },
  });

  it("does not stop the tour, and reports through onError", async () => {
    const onError = vi.fn();
    render(
      <TourProvider tours={[tour]} store={failing()} context={null} onError={onError}>
        <Controls />
        <div data-tour="first">first</div>
        <TourGuide labels={labels} />
      </TourProvider>,
    );
    await press("begin");
    expect((await screen.findByRole("dialog")).textContent).toContain("First");
    expect(onError).toHaveBeenCalled();
  });
});

describe("knowing whether progress has been read", () => {
  function Button() {
    const t = useTours<null>();
    const loaded = useTourProgressLoaded("t");
    const progress = useTourProgress("t");
    return (
      <button type="button" onClick={() => void t.offered()}>
        {!loaded ? "Checking" : progress?.status === "started" ? "Continue" : "Start"}
      </button>
    );
  }

  it("shows neither Start nor Continue until the store has answered", async () => {
    const store = memoryStore({ t: { status: "started", version: 1, chapter: 0, step: 1, dismissals: 0 } });
    render(
      <TourProvider tours={[tour]} store={store} context={null}>
        <Button />
      </TourProvider>,
    );
    expect(screen.getByRole("button").textContent).toBe("Checking");
    await press("Checking");
    await waitFor(() => expect(screen.getByRole("button").textContent).toBe("Continue"));
  });
});
