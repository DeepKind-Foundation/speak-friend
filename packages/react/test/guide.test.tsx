import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { memoryStore, type Tour } from "speak-friend";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TourGuide, TourProvider, useTours, type GuideLabels } from "../src/index";

type Ctx = { roles: string[] };

const tour: Tour<Ctx> = {
  id: "welcome",
  version: 1,
  chapters: [
    {
      id: "main",
      route: "/",
      steps: [
        { id: "one", target: "card", title: "First title", body: "First body" },
        { id: "two", target: "nav", title: "Second title", body: "Second body" },
        { id: "gone", target: "missing", title: "Hidden", body: "Never shown" },
        { id: "three", target: "list", title: "Third title", body: "Third body" },
      ],
    },
  ],
};

const labels: GuideLabels = {
  counter: (n, total) => `Krok ${n} z ${total}`,
  back: "Wstecz",
  next: "Dalej",
  finish: "Zakończ",
  close: "Zamknij",
};

const context: Ctx = { roles: [] };
const tours = [tour];

function Starter() {
  const t = useTours<Ctx>();
  return (
    <button type="button" onClick={() => void t.start("welcome")}>
      begin
    </button>
  );
}

function setup(props: Partial<React.ComponentProps<typeof TourGuide>> = {}, store = memoryStore()) {
  return {
    store,
    ...render(
      <TourProvider tours={tours} store={store} context={context} targetTimeout={30}>
        <Starter />
        <div data-tour="card">card</div>
        <div data-tour="nav">nav</div>
        <div data-tour="list">list</div>
        <TourGuide labels={labels} {...props} />
      </TourProvider>,
    ),
  };
}

const begin = async () => {
  const button = screen.getByText("begin");
  button.focus();
  await act(async () => {
    fireEvent.click(button);
  });
  await screen.findByRole("dialog");
};
const press = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
};

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

describe("the guide", () => {
  it("renders nothing while no tour is running", () => {
    setup();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a non-modal dialog named by the step title, with a consumer-made counter", async () => {
    setup();
    await begin();
    const dialog = screen.getByRole("dialog", { name: "First title" });
    expect(dialog.getAttribute("aria-modal")).toBeNull();
    expect(screen.getByText("Krok 1 z 4")).toBeTruthy();
    expect(screen.getByText("First body")).toBeTruthy();
  });

  it("moves focus to the title on every step", async () => {
    setup();
    await begin();
    expect(document.activeElement?.textContent).toBe("First title");
    await press("Dalej");
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Second title"));
  });

  it("skips a step whose target is not on the page", async () => {
    setup();
    await begin();
    await press("Dalej");
    await waitFor(() => screen.getByText("Second title"));
    await press("Dalej");
    await waitFor(() => expect(screen.getByText("Third title")).toBeTruthy());
    expect(screen.queryByText("Hidden")).toBeNull();
    expect(screen.getByText("Krok 3 z 3")).toBeTruthy();
  });

  it("disables Back on the first step and offers Finish on the last, which completes the tour", async () => {
    const { store } = setup();
    await begin();
    expect((screen.getByRole("button", { name: "Wstecz" }) as HTMLButtonElement).disabled).toBe(true);
    await press("Dalej");
    await waitFor(() => screen.getByText("Second title"));
    await press("Dalej");
    await waitFor(() => screen.getByText("Third title"));
    await press("Zakończ");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect((await store.get("welcome"))?.status).toBe("completed");
  });

  it("closes on Escape, keeps the place and returns focus to where it was", async () => {
    const { store } = setup();
    await begin();
    await press("Dalej");
    await waitFor(() => screen.getByText("Second title"));
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement?.textContent).toBe("begin");
    expect((await store.get("welcome"))?.status).toBe("started");
  });

  it("ignores Escape when asked to", async () => {
    setup({ closeOnEscape: false });
    await begin();
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("docks on the chosen logical side", async () => {
    const view = setup({ position: "start" });
    await begin();
    expect(screen.getByRole("dialog").getAttribute("data-position")).toBe("start");
    view.unmount();
    setup();
    await begin();
    expect(screen.getByRole("dialog").getAttribute("data-position")).toBe("end");
  });

  it("uses the chosen heading level", async () => {
    setup({ headingLevel: 3 });
    await begin();
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("First title");
  });

  it("can announce through a live region and leave focus where it is", async () => {
    setup({ announce: "live" });
    await begin();
    expect(document.activeElement?.textContent).toBe("begin");
    expect(screen.getByRole("status").textContent).toBe("Krok 1 z 4: First title");
  });

  it("draws a ring over the target without blocking it", async () => {
    setup();
    await begin();
    const ring = document.querySelector(".sf-ring") as HTMLElement;
    expect(ring.getAttribute("aria-hidden")).toBe("true");
    expect(ring.style.top).toBe("20px");
    expect(ring.style.width).toBe("100px");
  });

  it("scrolls the target into view and reserves room for the dock while it is open", async () => {
    setup();
    await begin();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue("scroll-padding-bottom")).toMatch(/px$/);
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("scroll-padding-bottom")).toBe(""));
  });

  it("shows only the text the app supplies", async () => {
    setup();
    await begin();
    const text = screen.getByRole("dialog").textContent ?? "";
    for (const english of ["Next", "Back", "Close", "Finish", "Step"]) expect(text).not.toContain(english);
  });

  it("has no detectable accessibility violations", async () => {
    setup();
    await begin();
    const result = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
