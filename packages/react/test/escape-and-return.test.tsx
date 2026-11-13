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
  returnToGuide: "Back to the tour",
};

function Begin() {
  const t = useTours<null>();
  return (
    <button type="button" onClick={() => void t.start("t")}>
      begin
    </button>
  );
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getClientRects = function () {
    return [{ width: 10, height: 10 }] as unknown as DOMRectList;
  };
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

const start = async (props: Partial<React.ComponentProps<typeof TourGuide>> = {}) => {
  render(
    <TourProvider tours={[tour]} store={memoryStore()} context={null}>
      <Begin />
      <div data-tour="first">
        <button type="button">Page control</button>
        <input aria-label="Page field" />
      </div>
      <div data-tour="second">second</div>
      <TourGuide labels={labels} {...props} />
    </TourProvider>,
  );
  await act(async () => {
    fireEvent.click(screen.getByText("begin"));
  });
  await screen.findByRole("dialog");
};
const escape = async (from: Element | Document) => {
  await act(async () => {
    fireEvent.keyDown(from, { key: "Escape" });
  });
};
const stillOpen = () => screen.queryByRole("dialog") !== null;

describe("Escape", () => {
  it("closes the tour from inside the guide", async () => {
    await start();
    await escape(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(stillOpen()).toBe(false));
  });

  it("closes the tour when nothing in particular has focus", async () => {
    await start();
    await escape(document.body);
    await waitFor(() => expect(stillOpen()).toBe(false));
  });

  it("closes the tour from the back to the tour button", async () => {
    await start();
    await escape(screen.getByRole("button", { name: "Back to the tour" }));
    await waitFor(() => expect(stillOpen()).toBe(false));
  });

  it("leaves Escape in a page control to the page", async () => {
    await start();
    await escape(screen.getByRole("button", { name: "Page control" }));
    await escape(screen.getByLabelText("Page field"));
    expect(stillOpen()).toBe(true);
  });

  it("leaves Escape from inside a component in the page to the page", async () => {
    await start();
    const host = document.createElement("div");
    document.body.append(host);
    const inner = document.createElement("button");
    host.attachShadow({ mode: "open" }).append(inner);
    await escape(inner);
    expect(stillOpen()).toBe(true);
  });

  it('closes the tour from anywhere with closeOnEscape="anywhere"', async () => {
    await start({ closeOnEscape: "anywhere" });
    await escape(screen.getByRole("button", { name: "Page control" }));
    await waitFor(() => expect(stillOpen()).toBe(false));
  });

  it("never closes the tour with closeOnEscape={false}", async () => {
    await start({ closeOnEscape: false });
    await escape(screen.getByRole("button", { name: "Next" }));
    expect(stillOpen()).toBe(true);
  });

  it("ignores an Escape that something else already handled", async () => {
    await start();
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    event.preventDefault();
    await act(async () => {
      screen.getByRole("button", { name: "Next" }).dispatchEvent(event);
    });
    expect(stillOpen()).toBe(true);
  });
});

describe("the back to the tour button", () => {
  it("is the first thing in the page while a step is shown, and gone before and after", async () => {
    render(
      <TourProvider tours={[tour]} store={memoryStore()} context={null}>
        <Begin />
        <div data-tour="first">first</div>
        <TourGuide labels={labels} />
      </TourProvider>,
    );
    expect(screen.queryByRole("button", { name: "Back to the tour" })).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByText("begin"));
    });
    await screen.findByRole("dialog");
    const button = screen.getByRole("button", { name: "Back to the tour" });
    const firstFocusable = document.body.querySelector("button, input, a[href]");
    expect(firstFocusable).toBe(button);
    await escape(button);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Back to the tour" })).toBeNull());
  });

  it("moves focus to the guide's title", async () => {
    await start();
    screen.getByRole("button", { name: "Page control" }).focus();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Back to the tour" }));
    });
    expect(document.activeElement?.classList.contains("sf-title")).toBe(true);
  });

  it("is not there without a label", async () => {
    await start({ labels: { ...labels, returnToGuide: undefined } });
    expect(screen.queryByRole("button", { name: "Back to the tour" })).toBeNull();
    expect(document.querySelector(".sf-return")).toBeNull();
  });

  it("sits in a wrapper that takes no part in layout, so a grid container gives it no cell", async () => {
    await start();
    const wrapper = document.querySelector(".sf-return")?.parentElement;
    expect(wrapper?.style.display).toBe("contents");
  });

  it("is put first inside the container the guide was given, not before the page", async () => {
    const modal = document.createElement("div");
    const lead = document.createElement("button");
    lead.textContent = "Lead";
    modal.append(lead);
    document.body.append(modal);
    await start({ container: () => modal });
    expect(modal.firstElementChild?.textContent).toBe("Back to the tour");
  });
});
