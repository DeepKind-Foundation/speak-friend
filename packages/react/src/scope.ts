import { useMemo } from "react";

/** Where a step's target lives when it is inside a web component: a host selector, or a path of them. */
export type Within = string | readonly string[];

const escapeValue = (value: string): string =>
  typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");

/** The host selectors to walk, or null when the step is not scoped. `"invalid"` when something is not a selector. */
export function pathOf(within: Within | null | undefined): readonly string[] | null | "invalid" {
  if (within === undefined || within === null) return null;
  const path = typeof within === "string" ? [within] : within;
  if (path.length === 0) return null;
  return path.every((selector) => typeof selector === "string" && selector.trim() !== "") ? path : "invalid";
}

/** What a lookup found, and what it learned about the place it looked in. */
export interface Lookup {
  /** The first visible target that is not in `skip`. */
  el: HTMLElement | null;
  /** Shadow roots and frame documents that were searched, so callers can watch them. Empty for a page lookup. */
  roots: readonly (ShadowRoot | Document)[];
  /** Iframes that were walked through, whether or not their document could be entered. */
  frames: readonly HTMLIFrameElement[];
  /** True when a host matched but nothing could be entered anywhere: no open shadow root, no same-origin document. */
  blocked: boolean;
  /** True when `within` is not made of usable selectors. */
  invalid: boolean;
}

const isFrame = (el: Element): el is HTMLIFrameElement => el.localName === "iframe";

/** What a host can be searched through: its open shadow root, or the document of a same-origin iframe. */
const enter = (host: Element): ShadowRoot | Document | null => {
  if (host.shadowRoot) return host.shadowRoot;
  if (!isFrame(host)) return null;
  try {
    return host.contentDocument;
  } catch {
    return null;
  }
};

const visible = (scope: ParentNode, target: string, skip?: ReadonlySet<Element>): HTMLElement | null => {
  const candidates = scope.querySelectorAll<HTMLElement>(`[data-tour="${escapeValue(target)}"]`);
  return Array.from(candidates).find((el) => !skip?.has(el) && el.getClientRects().length > 0) ?? null;
};

/**
 * Looks for the first visible element marked `data-tour="<target>"`. Without `within` that is the whole page. With it,
 * only the hosts it names are searched, through their open shadow tree or, for an iframe, its same-origin document:
 * each selector is resolved inside what the one before reached, and every matching host counts (the old page's copy
 * may still be on screen next to the new one). Hosts need no visibility of their own, so `display: contents` wrappers
 * work.
 */
export function lookup(target: string, within?: Within | null, skip?: ReadonlySet<Element>): Lookup {
  const none: Lookup = { el: null, roots: [], frames: [], blocked: false, invalid: false };
  if (typeof document === "undefined") return none;
  const path = pathOf(within);
  if (path === "invalid") return { ...none, invalid: true };
  if (path === null) return { ...none, el: visible(document, target, skip) };
  let scopes: (ShadowRoot | Document)[] = [document];
  const frames: HTMLIFrameElement[] = [];
  let sawHostWithoutRoot = false;
  for (const selector of path) {
    const next: (ShadowRoot | Document)[] = [];
    for (const scope of scopes) {
      let hosts: Element[];
      try {
        hosts = Array.from(scope.querySelectorAll(selector));
      } catch {
        return { ...none, invalid: true };
      }
      for (const host of hosts) {
        if (isFrame(host)) frames.push(host);
        const inside = enter(host);
        if (inside) next.push(inside);
        else sawHostWithoutRoot = true;
      }
    }
    scopes = next;
  }
  const roots = scopes;
  for (const root of roots) {
    const el = visible(root, target, skip);
    if (el) return { el, roots, frames, blocked: false, invalid: false };
  }
  return { el: null, roots, frames, blocked: roots.length === 0 && sawHostWithoutRoot, invalid: false };
}

/** The element that has focus, looking through open shadow trees and same-origin iframes to the one that really does. */
export function deepActiveElement(): Element | null {
  if (typeof document === "undefined") return null;
  let active: Element | null = document.activeElement;
  while (active) {
    let inner: Element | null = active.shadowRoot?.activeElement ?? null;
    if (!inner && isFrame(active)) {
      const doc = enter(active) as Document | null;
      // A frame with nothing focused reports its body: the frame itself is then the answer.
      if (doc && doc.activeElement && doc.activeElement !== doc.body) inner = doc.activeElement;
    }
    if (!inner) break;
    active = inner;
  }
  return active;
}

/** Every element marked `data-tour` on the page, inside its open shadow trees and in its same-origin iframes. */
export function markedElements(): ReadonlySet<Element> {
  const out = new Set<Element>();
  if (typeof document === "undefined") return out;
  const walk = (root: ParentNode): void => {
    root.querySelectorAll("[data-tour]").forEach((el) => out.add(el));
    root.querySelectorAll("*").forEach((el) => {
      const inside = enter(el);
      if (inside) walk(inside);
    });
  };
  walk(document);
  return out;
}

/** Whether any step of any tour is scoped, so the extra work is only done by apps that use it. */
export function usesWithin(
  tours: readonly { chapters: readonly { steps: readonly { within?: Within }[] }[] }[],
): boolean {
  return tours.some((t) => t.chapters.some((c) => c.steps.some((s) => pathOf(s.within) !== null)));
}

/** The same `within`, with the same identity while its content does not change, so effects do not re-run each render. */
export function useStableWithin(within: Within | null | undefined): Within | null {
  const key = JSON.stringify(within ?? null);
  return useMemo(() => JSON.parse(key) as Within | null, [key]);
}
