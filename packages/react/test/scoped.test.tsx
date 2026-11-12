import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { memoryStore, type Tour } from "speak-friend";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Ring, TourGuide, TourProvider, useTours, type GuideLabels } from "../src/index";
import { deepActiveElement, lookup, markedElements, pathOf, useStableWithin, usesWithin } from "../src/scope";
import { waitForScoped, waitForTarget } from "../src/wait-for-target";

beforeEach(() => {
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
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** A host element with an open (or closed) shadow tree holding the given elements. */
const host = (
  id: string,
  names: string[],
  mode: ShadowRootInit["mode"] = "open",
  parent: ParentNode = document.body,
) => {
  const el = document.createElement("div");
  el.id = id;
  parent.append(el);
  const root = el.attachShadow({ mode });
  for (const name of names) {
    const inner = document.createElement("button");
    inner.setAttribute("data-tour", name);
    inner.id = `${id}-${name}`;
    root.append(inner);
  }
  return { el, root };
};
const light = (name: string, id: string) => {
  const el = document.createElement("div");
  el.setAttribute("data-tour", name);
  el.id = id;
  document.body.append(el);
  return el;
};

describe("looking inside a component", () => {
  it("finds the target inside the named host and nowhere else, even when the name is used elsewhere", () => {
    const wrong = light("save", "page-save");
    const a = host("a", ["save"]);
    const b = host("b", ["save"]);
    // The wrong elements exist and are visible, so these checks cannot pass for lack of candidates.
    expect(wrong.getClientRects().length).toBeGreaterThan(0);
    expect(a.root.querySelector("[data-tour=save]")?.getClientRects().length).toBeGreaterThan(0);
    expect(lookup("save", "#b").el?.id).toBe("b-save");
    expect(lookup("save", "#a").el?.id).toBe("a-save");
    expect(lookup("save").el).toBe(wrong);
    expect(lookup("save", "#nothing").el).toBeNull();
    expect(b.el.isConnected).toBe(true);
  });

  it("does not see into a shadow tree without `within`", () => {
    host("a", ["only-inside"]);
    expect(lookup("only-inside").el).toBeNull();
    expect(lookup("only-inside", []).el).toBeNull();
    expect(lookup("only-inside", "#a").el?.id).toBe("a-only-inside");
  });

  it("follows a path through components inside components, and only through that path", () => {
    const outer = host("outer", []);
    const inner = host("inner", ["go"], "open", outer.root);
    host("decoy", ["go"], "open", outer.root);
    host("inner", ["go"]);
    expect(lookup("go", ["#outer", "#inner"]).el).toBe(inner.root.querySelector("[data-tour=go]"));
    expect(lookup("go", ["#outer", "#missing"]).el).toBeNull();
    expect(lookup("go", ["#inner", "#outer"]).el).toBeNull();
  });

  it("takes every matching host, so the old page's copy next to the new one does not hide it", () => {
    const old = host("view", ["x"]);
    const fresh = host("view", ["x"]);
    const stale = new Set<Element>([old.root.querySelector("[data-tour=x]")!]);
    expect(lookup("x", "#view", stale).el).toBe(fresh.root.querySelector("[data-tour=x]"));
  });

  it("needs no visibility from the host, only from the target", () => {
    const h = host("h", ["v"]);
    h.el.style.display = "contents";
    expect(lookup("v", "#h").el).not.toBeNull();
    const original = Element.prototype.getClientRects;
    Element.prototype.getClientRects = function () {
      return (this.hasAttribute("data-tour") ? [] : [{ width: 1, height: 1 }]) as unknown as DOMRectList;
    };
    expect(lookup("v", "#h").el).toBeNull();
    Element.prototype.getClientRects = original;
  });

  it("calls a selector that throws, an empty one and a non-string invalid, and an empty list no scope at all", () => {
    expect(lookup("x", "[").invalid).toBe(true);
    expect(lookup("x", "").invalid).toBe(true);
    expect(lookup("x", ["#a", " "]).invalid).toBe(true);
    expect(lookup("x", [1 as unknown as string]).invalid).toBe(true);
    expect(lookup("x", []).invalid).toBe(false);
    expect(pathOf([])).toBeNull();
    expect(pathOf(undefined)).toBeNull();
    expect(pathOf(null)).toBeNull();
    expect(pathOf("#a")).toEqual(["#a"]);
  });

  it("accepts a readonly tuple", () => {
    const path = ["#outer", "#inner"] as const;
    host("outer", []);
    expect(lookup("x", path).invalid).toBe(false);
  });

  it("says blocked when a host exists but has no open shadow root, and not when another host could be entered", () => {
    host("closed", ["x"], "closed");
    const plain = document.createElement("div");
    plain.id = "plain";
    document.body.append(plain);
    expect(lookup("x", "#closed")).toMatchObject({ el: null, blocked: true });
    expect(lookup("x", "#plain")).toMatchObject({ el: null, blocked: true });
    expect(lookup("x", "#absent")).toMatchObject({ el: null, blocked: false });
    host("open", []);
    document.getElementById("open")!.id = "closed";
    expect(lookup("x", "#closed").blocked).toBe(false);
  });

  it("finds elements for a snapshot in the page and in every open shadow tree, nested ones too", () => {
    const l = light("p", "p1");
    const a = host("a", ["q"]);
    const n = host("n", ["r"], "open", a.root);
    host("c", ["s"], "closed");
    const all = markedElements();
    expect(all.has(l)).toBe(true);
    expect(all.has(a.root.querySelector("[data-tour=q]")!)).toBe(true);
    expect(all.has(n.root.querySelector("[data-tour=r]")!)).toBe(true);
    expect(all.size).toBe(3);
  });

  it("knows whether any step is scoped", () => {
    const tour = (within?: string | string[]) => ({
      chapters: [{ steps: [{ within }] }],
    });
    expect(usesWithin([tour(), tour([])])).toBe(false);
    expect(usesWithin([tour(), tour("#a")])).toBe(true);
    expect(usesWithin([tour(["#a", "#b"])])).toBe(true);
  });

  it("follows focus into shadow trees", () => {
    const a = host("a", ["b"]);
    const button = a.root.querySelector("button")!;
    button.focus();
    expect(document.activeElement).toBe(a.el);
    expect(deepActiveElement()).toBe(button);
    button.blur();
    expect(deepActiveElement()).not.toBe(button);
  });

  it("gives a value that stays the same while its content does", () => {
    const { result, rerender } = renderHook(({ w }: { w: string[] }) => useStableWithin(w), {
      initialProps: { w: ["#a", "#b"] },
    });
    const first = result.current;
    rerender({ w: ["#a", "#b"] });
    expect(result.current).toBe(first);
    rerender({ w: ["#a"] });
    expect(result.current).not.toBe(first);
  });
});

describe("waiting for a target inside a component", () => {
  it("is found at once when it is already there", async () => {
    host("a", ["x"]);
    expect(await waitForScoped("x", 500, { within: "#a" })).toEqual({ found: true, blocked: false, invalid: false });
  });

  it("answers at once for a `within` that is not usable, without waiting", async () => {
    vi.useFakeTimers();
    const result = await waitForScoped("x", 5000, { within: "[" });
    expect(result).toEqual({ found: false, blocked: false, invalid: true });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("finds a tree that attaches and renders after the host is in the page, with nothing else changing", async () => {
    vi.useFakeTimers();
    const el = document.createElement("div");
    el.id = "late";
    document.body.append(el);
    const pending = waitForScoped("x", 1000, { within: "#late" });
    await vi.advanceTimersByTimeAsync(120);
    const root = el.attachShadow({ mode: "open" });
    const inner = document.createElement("button");
    inner.setAttribute("data-tour", "x");
    root.append(inner);
    await vi.advanceTimersByTimeAsync(40);
    // Neither the page observer nor a root observer was in place when this happened: only the poll can have seen it.
    await expect(pending).resolves.toMatchObject({ found: true });
  });

  it("notices a change inside a tree it is already watching without waiting for the next look", async () => {
    vi.useFakeTimers();
    const h = host("a", []);
    const pending = waitForScoped("x", 1000, { within: "#a" });
    await vi.advanceTimersByTimeAsync(10);
    const inner = document.createElement("button");
    inner.setAttribute("data-tour", "x");
    h.root.append(inner);
    // Less than one poll interval later.
    await vi.advanceTimersByTimeAsync(5);
    await expect(pending).resolves.toMatchObject({ found: true });
  });

  it("reports a closed host as blocked at the end of the wait, not before", async () => {
    vi.useFakeTimers();
    host("c", ["x"], "closed");
    const pending = waitForScoped("x", 300, { within: "#c" });
    let settled = false;
    void pending.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(250);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    await expect(pending).resolves.toEqual({ found: false, blocked: true, invalid: false });
  });

  it("accepts a new element at once and an element that was already there only after the page settles", async () => {
    vi.useFakeTimers();
    const h = host("v", ["x"]);
    const old = h.root.querySelector("[data-tour=x]")!;
    const stale = new Set<Element>([old]);
    const pending = waitForScoped("x", 2000, { within: "#v", stale, settle: 300 });
    let settled = false;
    void pending.then(() => (settled = true));
    // Polling must not count as quiet: nothing has changed, but the old element must still wait for the settle time.
    await vi.advanceTimersByTimeAsync(250);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(80);
    await expect(pending).resolves.toMatchObject({ found: true });
  });

  it("takes the new host's element at once while the old host's is still there", async () => {
    vi.useFakeTimers();
    const old = host("v", ["x"]);
    const stale = new Set<Element>([old.root.querySelector("[data-tour=x]")!]);
    const pending = waitForScoped("x", 2000, { within: "#v", stale, settle: 300 });
    await vi.advanceTimersByTimeAsync(20);
    host("v", ["x"]);
    await vi.advanceTimersByTimeAsync(60);
    await expect(pending).resolves.toMatchObject({ found: true });
  });

  it("gives the same answer as before for a page target, with no extra timers", async () => {
    vi.useFakeTimers();
    const pending = waitForScoped("later", 500);
    expect(vi.getTimerCount()).toBe(1);
    light("later", "l");
    await vi.advanceTimersByTimeAsync(0);
    await expect(pending).resolves.toEqual({ found: true, blocked: false, invalid: false });
    const scoped = waitForScoped("later2", 500, { within: "#nothing" });
    expect(vi.getTimerCount()).toBe(2);
    await vi.advanceTimersByTimeAsync(600);
    await scoped;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("is a plain boolean through waitForTarget", async () => {
    host("a", ["x"]);
    expect(await waitForTarget("x", 100, { within: "#a" })).toBe(true);
    expect(await waitForTarget("nope", 20, { within: "#a" })).toBe(false);
  });
});

describe("the ring", () => {
  it("is drawn around the element inside the component, and is not rebuilt when the same path is given again", async () => {
    host("a", ["x"]);
    const Real = globalThis.MutationObserver;
    let made = 0;
    globalThis.MutationObserver = class extends Real {
      constructor(callback: MutationCallback) {
        super(callback);
        made++;
      }
    };
    try {
      const { rerender } = render(<Ring target="x" within={["#a"]} dim={false} container={document.body} />);
      await waitFor(() => expect(document.querySelector(".sf-ring")).not.toBeNull());
      const before = made;
      expect(before).toBeGreaterThan(0);
      for (let i = 0; i < 4; i++) rerender(<Ring target="x" within={["#a"]} dim={false} container={document.body} />);
      expect(made).toBe(before);
    } finally {
      globalThis.MutationObserver = Real;
    }
  });

  it("is not drawn for a target that only exists inside a component when no `within` is given", async () => {
    host("a", ["x"]);
    render(<Ring target="x" dim={false} container={document.body} />);
    await new Promise((r) => setTimeout(r, 30));
    expect(document.querySelector(".sf-ring")).toBeNull();
  });
});

describe("a tour whose step is inside a component", () => {
  const tour: Tour<null> = {
    id: "t",
    version: 1,
    chapters: [
      {
        id: "c",
        route: "/",
        steps: [{ id: "one", target: "save", within: "#form", title: "Save it", body: "Here" }],
      },
    ],
  };
  const labels: GuideLabels = {
    counter: (n, t) => `${n}/${t}`,
    back: "Back",
    next: "Next",
    finish: "Finish",
    close: "Close",
  };

  function Begin() {
    const t = useTours<null>();
    return (
      <button type="button" onClick={() => void t.start("t")}>
        begin
      </button>
    );
  }
  const start = async (onError = vi.fn()) => {
    render(
      <TourProvider tours={[tour]} store={memoryStore()} context={null} targetTimeout={200} onError={onError}>
        <Begin />
        <TourGuide labels={labels} />
      </TourProvider>,
    );
    screen.getByText("begin").focus();
    await act(async () => {
      fireEvent.click(screen.getByText("begin"));
    });
    return onError;
  };

  it("shows the step, ringed, when the target is in the named component", async () => {
    light("save", "decoy");
    host("form", ["save"]);
    await start();
    expect((await screen.findByRole("dialog")).textContent).toContain("Save it");
    await waitFor(() => expect(document.querySelector(".sf-ring")).not.toBeNull());
  });

  it("skips the step and says why when the component is closed", async () => {
    host("form", ["save"], "closed");
    const onError = await start();
    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(String(onError.mock.calls[0]?.[0])).toContain('Step "one"');
    expect(String(onError.mock.calls[0]?.[0])).toContain("no open shadow root");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says nothing extra when the component is simply not there, and skips quietly as before", async () => {
    const onError = await start();
    await new Promise((r) => setTimeout(r, 300));
    expect(onError).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
