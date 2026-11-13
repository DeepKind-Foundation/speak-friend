import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { restoreFocus } from "../src/focus";
import { boxOf } from "../src/box";
import { deepActiveElement, lookup, markedElements } from "../src/scope";
import { waitForScoped } from "../src/wait-for-target";

/** jsdom gives every window its own element classes, so layout is stubbed on the frame's as well. */
const stubLayout = (win: Window): void => {
  const proto = (win as unknown as { Element: typeof Element }).Element.prototype;
  proto.getClientRects = function () {
    return [{ width: 10, height: 10 }] as unknown as DOMRectList;
  };
};

beforeEach(() => stubLayout(window));
afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const frame = (id: string, names: string[], parent: ParentNode = document.body): HTMLIFrameElement => {
  const el = document.createElement("iframe");
  el.id = id;
  parent.append(el);
  stubLayout(el.contentWindow!);
  const doc = el.contentDocument!;
  for (const name of names) {
    const inner = doc.createElement("button");
    inner.setAttribute("data-tour", name);
    inner.id = `${id}-${name}`;
    doc.body.append(inner);
  }
  return el;
};
const light = (name: string, id: string): HTMLElement => {
  const el = document.createElement("div");
  el.setAttribute("data-tour", name);
  el.id = id;
  document.body.append(el);
  return el;
};

describe("looking inside an iframe", () => {
  it("finds the target in the named frame's document and nowhere else", () => {
    const wrong = light("save", "page-save");
    const a = frame("a", ["save"]);
    const b = frame("b", ["save"]);
    expect(wrong.getClientRects().length).toBeGreaterThan(0);
    expect(a.contentDocument!.getElementById("a-save")!.getClientRects().length).toBeGreaterThan(0);
    expect(lookup("save", "#b").el).toBe(b.contentDocument!.getElementById("b-save"));
    expect(lookup("save", "#a").el).toBe(a.contentDocument!.getElementById("a-save"));
    expect(lookup("save").el).toBe(wrong);
    const found = lookup("save", "#b");
    expect(found.frames).toEqual([b]);
    expect(found.roots).toEqual([b.contentDocument]);
  });

  it("does not look into a frame without `within`", () => {
    frame("a", ["only-inside"]);
    expect(lookup("only-inside").el).toBeNull();
  });

  it("goes through a frame inside a frame, and through a component inside a frame", () => {
    const outer = frame("outer", []);
    const inner = frame("inner", ["deep"], outer.contentDocument!.body);
    expect(lookup("deep", ["#outer", "#inner"]).el).toBe(inner.contentDocument!.getElementById("inner-deep"));
    const host = outer.contentDocument!.createElement("div");
    host.id = "widget";
    outer.contentDocument!.body.append(host);
    const root = host.attachShadow({ mode: "open" });
    const button = outer.contentDocument!.createElement("button");
    button.setAttribute("data-tour", "mixed");
    root.append(button);
    expect(lookup("mixed", ["#outer", "#widget"]).el).toBe(button);
    expect(lookup("mixed", ["#widget"]).el).toBeNull();
  });

  it("is blocked, not just empty, when the frame's document cannot be read", () => {
    const foreign = frame("foreign", ["x"]);
    Object.defineProperty(foreign, "contentDocument", {
      get() {
        throw new Error("SecurityError");
      },
    });
    expect(lookup("x", "#foreign")).toMatchObject({ el: null, blocked: true });
    const unloaded = document.createElement("iframe");
    unloaded.id = "unloaded";
    document.body.append(unloaded);
    Object.defineProperty(unloaded, "contentDocument", { value: null });
    expect(lookup("x", "#unloaded")).toMatchObject({ el: null, blocked: true });
  });

  it("does not find a target that is not visible", () => {
    const hidden = frame("hidden", ["x"]);
    const proto = (hidden.contentWindow as unknown as { Element: typeof Element }).Element.prototype;
    proto.getClientRects = function () {
      return [] as unknown as DOMRectList;
    };
    expect(lookup("x", "#hidden").el).toBeNull();
  });

  it("waits for a frame whose document is replaced after it was found, and sees the new one", async () => {
    vi.useFakeTimers();
    const el = frame("late", []);
    const pending = waitForScoped("x", 1000, { within: "#late" });
    await vi.advanceTimersByTimeAsync(80);
    // The document a frame has before it loads is replaced by the loaded one: here, by writing a new document.
    el.contentDocument!.open();
    el.contentDocument!.write('<button data-tour="x">in</button>');
    el.contentDocument!.close();
    stubLayout(el.contentWindow!);
    await vi.advanceTimersByTimeAsync(80);
    await expect(pending).resolves.toMatchObject({ found: true });
  });

  it("lists the elements in frames for the snapshot, nested ones too", () => {
    const outer = frame("outer", ["o"]);
    const inner = frame("inner", ["i"], outer.contentDocument!.body);
    const all = markedElements();
    expect(all.has(outer.contentDocument!.getElementById("outer-o")!)).toBe(true);
    expect(all.has(inner.contentDocument!.getElementById("inner-i")!)).toBe(true);
  });

  it("follows focus into a frame, and stays on the frame when nothing inside it has focus", () => {
    const f = frame("f", ["b"]);
    const button = f.contentDocument!.getElementById("f-b") as HTMLElement;
    f.focus();
    expect(deepActiveElement()).toBe(f);
    button.focus();
    expect(deepActiveElement()).toBe(button);
  });
});

describe("giving focus back into a frame", () => {
  it("focuses an element that belongs to a frame, whose class is not this window's HTMLElement", () => {
    const f = frame("f", ["b"]);
    const button = f.contentDocument!.getElementById("f-b") as HTMLElement;
    expect(button instanceof HTMLElement).toBe(false);
    const focus = vi.spyOn(button, "focus");
    restoreFocus(button);
    expect(focus).toHaveBeenCalledOnce();
  });

  it("still does not focus an element in this page that is not an HTMLElement", () => {
    const heading = document.createElement("h1");
    heading.textContent = "Page";
    document.body.append(heading);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    document.body.append(svg);
    restoreFocus(svg);
    expect(document.activeElement).toBe(heading);
  });
});

describe("where an element in a frame is, in this window", () => {
  const place = (el: Element, left: number, top: number, width: number, height: number): void => {
    el.getBoundingClientRect = () =>
      ({
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON() {},
      }) as DOMRect;
  };
  const size = (el: HTMLElement, width: number, height: number): void => {
    Object.defineProperty(el, "offsetWidth", { configurable: true, value: width });
    Object.defineProperty(el, "offsetHeight", { configurable: true, value: height });
  };
  const styled = (frameEl: Element, style: Record<string, string>): void => {
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) =>
      el === frameEl ? (style as unknown as CSSStyleDeclaration) : real(el, pseudo),
    );
  };

  it("is the plain box for an element in the page", () => {
    const el = light("p", "p");
    place(el, 10, 20, 30, 40);
    expect(boxOf(el)).toEqual({ left: 10, top: 20, width: 30, height: 40, right: 40, bottom: 60 });
  });

  it("adds where the frame's content starts: its position, border and padding", () => {
    const f = frame("f", ["b"]);
    const inner = f.contentDocument!.getElementById("f-b")!;
    place(inner, 5, 7, 50, 20);
    place(f, 100, 200, 320, 240);
    size(f, 320, 240);
    styled(f, { borderLeftWidth: "4px", borderTopWidth: "6px", paddingLeft: "10px", paddingTop: "2px" });
    expect(boxOf(inner)).toEqual({ left: 119, top: 215, width: 50, height: 20, right: 169, bottom: 235 });
  });

  it("scales by how much the frame is scaled on screen", () => {
    const f = frame("f", ["b"]);
    const inner = f.contentDocument!.getElementById("f-b")!;
    place(inner, 20, 40, 100, 60);
    place(f, 10, 10, 200, 150);
    size(f, 400, 300);
    styled(f, { borderLeftWidth: "0px", borderTopWidth: "0px", paddingLeft: "0px", paddingTop: "0px" });
    expect(boxOf(inner)).toEqual({ left: 20, top: 30, width: 50, height: 30, right: 70, bottom: 60 });
  });

  it("adds up through frames inside frames", () => {
    const outer = frame("outer", []);
    const inner = frame("inner", ["b"], outer.contentDocument!.body);
    const target = inner.contentDocument!.getElementById("inner-b")!;
    place(target, 1, 2, 10, 10);
    place(inner, 30, 40, 200, 100);
    size(inner, 200, 100);
    place(outer, 100, 100, 400, 300);
    size(outer, 400, 300);
    const none = () =>
      ({ borderLeftWidth: "0px", borderTopWidth: "0px", paddingLeft: "0px", paddingTop: "0px" }) as CSSStyleDeclaration;
    vi.spyOn(window, "getComputedStyle").mockImplementation(none);
    vi.spyOn(outer.contentWindow!, "getComputedStyle").mockImplementation(none);
    // The frame inside the outer one is at (30, 40) in the outer frame, which is at (100, 100) here.
    expect(boxOf(target)).toMatchObject({ left: 100 + 30 + 1, top: 100 + 40 + 2 });
  });

  it("is zero-sized for a frame that is not displayed", () => {
    const f = frame("f", ["b"]);
    const inner = f.contentDocument!.getElementById("f-b")!;
    place(inner, 5, 5, 50, 20);
    place(f, 0, 0, 0, 0);
    size(f, 0, 0);
    expect(boxOf(inner)).toMatchObject({ width: 50, height: 20 });
  });
});
