import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { memoryStore, type Tour } from "speak-friend";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TourGuide, TourProvider, useTourProgress, useTours, type GuideLabels } from "../src/index";

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

const rect = (top: number, left: number, width: number, height: number) =>
  ({ top, left, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }) as DOMRect;

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

  it("marks the visible element when the target name is used twice", async () => {
    setup();
    const hidden = document.createElement("div");
    hidden.setAttribute("data-tour", "nav");
    hidden.getClientRects = () => [] as unknown as DOMRectList;
    document.body.prepend(hidden);
    await begin();
    await press("Dalej");
    await waitFor(() => expect(screen.getByText("Second title")).toBeTruthy());
    expect(document.querySelector(".sf-ring")).not.toBeNull();
    hidden.remove();
  });

  it("moves the ring when content above the target pushes it down", async () => {
    setup();
    await begin();
    const ring = () => document.querySelector(".sf-ring") as HTMLElement;
    await waitFor(() => expect(ring().style.top).toBe("20px"));
    Element.prototype.getBoundingClientRect = function () {
      return { top: 220, left: 30, width: 100, height: 40, right: 130, bottom: 260, x: 30, y: 220, toJSON() {} };
    };
    const banner = document.createElement("div");
    document.body.prepend(banner);
    await waitFor(() => expect(ring().style.top).toBe("220px"));
    banner.remove();
  });

  // A detached element has no boxes. The test mimics that instead of removing nodes that React owns.
  const detach = (el: Element | null): void => {
    (el as HTMLElement).getClientRects = () => [] as unknown as DOMRectList;
  };

  it("follows a new element that replaces the target", async () => {
    setup();
    await begin();
    const ring = () => document.querySelector(".sf-ring") as HTMLElement;
    await waitFor(() => expect(ring().style.top).toBe("20px"));
    const replacement = document.createElement("div");
    replacement.setAttribute("data-tour", "card");
    replacement.getBoundingClientRect = () =>
      ({ top: 300, left: 50, width: 80, height: 30, right: 130, bottom: 330, x: 50, y: 300, toJSON() {} }) as DOMRect;
    detach(document.querySelector('[data-tour="card"]'));
    document.body.append(replacement);
    await waitFor(() => expect(ring().style.top).toBe("300px"));
    expect(ring().style.width).toBe("80px");
    replacement.remove();
  });

  const beginWith = async (box: DOMRect) => {
    Element.prototype.getBoundingClientRect = () => box;
    setup();
    await begin();
  };

  it("keeps the whole ring on screen when the target is larger than the window", async () => {
    await beginWith(rect(-100, -50, 5000, 3000));
    const ring = document.querySelector(".sf-ring") as HTMLElement;
    await waitFor(() => expect(ring.style.top).toBe("8px"));
    expect(ring.style.left).toBe("8px");
    expect(ring.style.width).toBe(`${window.innerWidth - 16}px`);
    expect(ring.style.height).toBe(`${window.innerHeight - 16}px`);
  });

  it("draws no ring while the target is entirely off screen", async () => {
    await beginWith(rect(5000, 30, 100, 40));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(document.querySelector(".sf-ring")).toBeNull();
  });

  it("scrolls the top of a target taller than the window into view", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    await beginWith(rect(0, 0, 100, window.innerHeight * 2));
    await waitFor(() => expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: "start" })));
  });

  it("centres a target that fits in the window", async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    await beginWith(rect(20, 30, 100, 40));
    await waitFor(() => expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: "center" })));
  });

  it("draws no ring while no visible element matches the target", async () => {
    setup();
    await begin();
    await waitFor(() => expect(document.querySelector(".sf-ring")).not.toBeNull());
    detach(document.querySelector('[data-tour="card"]'));
    document.body.append(document.createElement("div"));
    await waitFor(() => expect(document.querySelector(".sf-ring")).toBeNull());
  });

  it("skips a step whose own timeout is short, without waiting for the provider's", async () => {
    const quick: Tour<Ctx> = {
      ...tour,
      chapters: [
        {
          id: "main",
          route: "/",
          steps: (tour.chapters[0]?.steps ?? []).map((s) => (s.id === "gone" ? { ...s, timeout: 10 } : s)),
        },
      ],
    };
    render(
      <TourProvider tours={[quick]} store={memoryStore()} context={context} targetTimeout={5000}>
        <Starter />
        <div data-tour="card">card</div>
        <div data-tour="nav">nav</div>
        <div data-tour="list">list</div>
        <TourGuide labels={labels} />
      </TourProvider>,
    );
    await begin();
    await press("Dalej");
    await waitFor(() => screen.getByText("Second title"));
    await press("Dalej");
    await waitFor(() => expect(screen.getByText("Third title")).toBeTruthy());
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

  it("follows the system theme unless one is forced", async () => {
    const view = setup();
    await begin();
    expect(screen.getByRole("dialog").hasAttribute("data-theme")).toBe(false);
    expect(document.querySelector(".sf-ring")?.hasAttribute("data-theme")).toBe(false);
    view.unmount();
    setup({ theme: "dark" });
    await begin();
    expect(screen.getByRole("dialog").getAttribute("data-theme")).toBe("dark");
    expect(document.querySelector(".sf-ring")?.getAttribute("data-theme")).toBe("dark");
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

  it("reports a failing step change through onError instead of leaving an unhandled rejection", async () => {
    const onError = vi.fn();
    let fail = false;
    const base = memoryStore();
    const flaky = {
      get: base.get,
      set: async (id: string, progress: Parameters<typeof base.set>[1]) => {
        if (fail) throw new Error("store down");
        await base.set(id, progress);
      },
    };
    render(
      <TourProvider tours={tours} store={flaky} context={context} targetTimeout={30} onError={onError}>
        <Starter />
        <div data-tour="card">card</div>
        <div data-tour="nav">nav</div>
        <div data-tour="list">list</div>
        <TourGuide labels={labels} />
      </TourProvider>,
    );
    await begin();
    fail = true;
    await press("Dalej");
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect((onError.mock.calls[0]?.[0] as Error).message).toBe("store down");
  });

  it("puts back a scroll padding the page had set itself", async () => {
    document.documentElement.style.setProperty("scroll-padding-bottom", "10px");
    setup();
    await begin();
    expect(document.documentElement.style.getPropertyValue("scroll-padding-bottom")).not.toBe("10px");
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("scroll-padding-bottom")).toBe("10px"));
    document.documentElement.style.removeProperty("scroll-padding-bottom");
  });

  it("finds a target whose name has quotes or a backslash", async () => {
    const odd: Tour<Ctx> = {
      id: "odd",
      version: 1,
      chapters: [{ id: "c", route: "/", steps: [{ id: "s", target: 'a"b\\c', title: "Odd", body: "x" }] }],
    };
    const store = memoryStore();
    render(
      <TourProvider tours={[odd]} store={store} context={context} targetTimeout={30}>
        <button type="button" data-tour={'a"b\\c'}>
          target
        </button>
        <OddStarter />
        <TourGuide labels={labels} />
      </TourProvider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByText("go"));
    });
    expect(await screen.findByRole("dialog", { name: "Odd" })).toBeTruthy();
  });
});

function OddStarter() {
  const t = useTours<Ctx>();
  return (
    <button type="button" onClick={() => void t.start("odd")}>
      go
    </button>
  );
}

function VanishingStarter({ gone }: { gone: boolean }) {
  const t = useTours<Ctx>();
  return gone ? null : (
    <button type="button" onClick={() => void t.start("welcome")}>
      begin
    </button>
  );
}

describe("focus when the opener is gone", () => {
  const start = async (props: Partial<React.ComponentProps<typeof TourGuide>> = {}, withHeading = true) => {
    const store = memoryStore();
    const tree = (gone: boolean) => (
      <TourProvider tours={tours} store={store} context={context} targetTimeout={30}>
        <main>
          {withHeading && <h1>Page title</h1>}
          <VanishingStarter gone={gone} />
          <div data-tour="card">card</div>
          <div data-tour="nav">nav</div>
          <div data-tour="list">list</div>
        </main>
        <button type="button">fallback</button>
        <TourGuide labels={labels} {...props} />
      </TourProvider>
    );
    const { rerender } = render(tree(false));
    const opener = screen.getByText("begin");
    opener.focus();
    await act(async () => {
      fireEvent.click(opener);
    });
    await screen.findByRole("dialog");
    rerender(tree(true));
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  };

  it("moves focus to the first level 1 heading", async () => {
    await start();
    expect(document.activeElement?.textContent).toBe("Page title");
  });

  it("falls back to main when the page has no level 1 heading", async () => {
    await start({}, false);
    expect(document.activeElement?.tagName).toBe("MAIN");
  });

  it("uses the element returned by fallbackFocus", async () => {
    await start({ fallbackFocus: () => screen.getByText("fallback") });
    expect(document.activeElement?.textContent).toBe("fallback");
  });
});

function ProgressLabel() {
  const t = useTours<Ctx>();
  const progress = useTourProgress("welcome");
  return (
    <button type="button" onClick={() => void t.offered()}>
      {progress ? `${progress.status} ${progress.step}` : "none"}
    </button>
  );
}

describe("useTourProgress", () => {
  it("shows what the store holds once the engine has read it, and follows the tour", async () => {
    const store = memoryStore();
    await store.set("welcome", { status: "started", version: 1, chapter: 0, step: 1, dismissals: 0 });
    render(
      <TourProvider tours={tours} store={store} context={context} targetTimeout={30}>
        <ProgressLabel />
        <Starter />
        <div data-tour="card">card</div>
        <div data-tour="nav">nav</div>
        <div data-tour="list">list</div>
        <TourGuide labels={labels} />
      </TourProvider>,
    );
    expect(screen.getByText("none")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByText("none"));
    });
    expect(await screen.findByText("started 1")).toBeTruthy();
    await begin();
    expect(screen.getByText("started 1")).toBeTruthy();
    await press("Dalej");
    await waitFor(() => expect(screen.getByText("started 3")).toBeTruthy());
  });
});
