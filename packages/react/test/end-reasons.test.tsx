import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { memoryStore, type Tour, type Tours } from "speak-friend";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TourGuide, TourProvider, useTours, type GuideLabels } from "../src/index";

const tour: Tour<null> = {
  id: "welcome",
  version: 1,
  chapters: [
    {
      id: "main",
      route: "/",
      steps: [
        { id: "one", target: "card", title: "First title", body: "First body" },
        { id: "two", target: "nav", title: "Second title", body: "Second body" },
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
};

const handle: { tours?: Tours<null> } = {};
let store = memoryStore();
const tours = [tour];

function Opener({ gone }: { gone: boolean }) {
  const t = useTours<null>();
  useEffect(() => {
    handle.tours = t;
  }, [t]);
  return gone ? null : (
    <button type="button" onClick={() => void t.start("welcome")}>
      begin
    </button>
  );
}

const tree = (gone: boolean, guide = true) => (
  <TourProvider tours={tours} store={store} context={null} targetTimeout={30}>
    <main>
      <h1>Page title</h1>
      <Opener gone={gone} />
      <div data-tour="card">card</div>
      <div data-tour="nav">nav</div>
      <button type="button">elsewhere</button>
    </main>
    {guide && <TourGuide labels={labels} />}
  </TourProvider>
);

/** Every way a running tour can end, and the page change that does it. */
const reasons: Record<string, () => Promise<void>> = {
  Escape: async () => {
    fireEvent.keyDown(document, { key: "Escape" });
  },
  "the Close button": async () => {
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
  },
  "Finish on the last step": async () => {
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Second title");
    fireEvent.click(screen.getByRole("button", { name: "Finish" }));
  },
  "the app calling close()": async () => {
    await handle.tours?.close();
  },
  "every remaining target disappearing": async () => {
    document.querySelector("[data-tour=nav]")?.remove();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
  },
  // Handled in `end`: it re-renders without the guide.
  "the guide unmounting": async () => undefined,
};

const start = async (gone: boolean) => {
  const { rerender } = render(tree(false));
  const opener = screen.getByText("begin");
  opener.focus();
  await act(async () => {
    fireEvent.click(opener);
  });
  await screen.findByRole("dialog");
  if (gone) rerender(tree(true));
  return rerender;
};

const end = async (reason: string, rerender: (ui: React.ReactElement) => void, gone: boolean) => {
  await act(async () => {
    if (reason === "the guide unmounting") rerender(tree(gone, false));
    else await reasons[reason]!();
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
};

beforeEach(() => {
  store = memoryStore();
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getClientRects = function () {
    return [{ width: 10, height: 10 }] as unknown as DOMRectList;
  };
  Element.prototype.getBoundingClientRect = function () {
    return { top: 20, left: 30, width: 100, height: 40, right: 130, bottom: 60, x: 30, y: 20, toJSON() {} };
  };
});
afterEach(cleanup);

describe("where focus goes when a tour ends", () => {
  describe.each(Object.keys(reasons))("after %s", (reason) => {
    it("returns to the element that started the tour", async () => {
      const rerender = await start(false);
      await end(reason, rerender, false);
      expect(document.activeElement).toBe(screen.getByText("begin"));
    });

    it("lands on the page heading when that element is gone", async () => {
      const rerender = await start(true);
      await end(reason, rerender, true);
      expect(document.activeElement?.textContent).toBe("Page title");
    });
  });

  it("keeps the tour open and focus where the person put it when they click elsewhere", async () => {
    await start(false);
    const other = screen.getByText("elsewhere");
    other.focus();
    await act(async () => {
      fireEvent.click(other);
    });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.activeElement).toBe(other);
  });
});

describe("coexisting with a modal page", () => {
  it("mounts the guide and ring inside the element the app names", async () => {
    const host = document.createElement("div");
    host.id = "modal";
    document.body.append(host);
    render(
      <TourProvider tours={tours} store={store} context={null} targetTimeout={30}>
        <main>
          <Opener gone={false} />
          <div data-tour="card">card</div>
          <div data-tour="nav">nav</div>
        </main>
        <TourGuide labels={labels} container={() => host} />
      </TourProvider>,
    );
    await act(async () => {
      fireEvent.click(screen.getByText("begin"));
    });
    const dialog = await screen.findByRole("dialog");
    expect(host.contains(dialog)).toBe(true);
    await waitFor(() => expect(host.querySelector(".sf-ring")).not.toBeNull());
    host.remove();
  });
});
