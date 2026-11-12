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
  /** Shadow roots that were searched, so callers can watch them. Empty for a page lookup. */
  roots: readonly ShadowRoot[];
  /** True when a host matched but no open shadow root could be entered anywhere (closed, or not rendered yet). */
  blocked: boolean;
  /** True when `within` is not made of usable selectors. */
  invalid: boolean;
}

const visible = (scope: ParentNode, target: string, skip?: ReadonlySet<Element>): HTMLElement | null => {
  const candidates = scope.querySelectorAll<HTMLElement>(`[data-tour="${escapeValue(target)}"]`);
  return Array.from(candidates).find((el) => !skip?.has(el) && el.getClientRects().length > 0) ?? null;
};

/**
 * Looks for the first visible element marked `data-tour="<target>"`. Without `within` that is the whole page. With it,
 * only the open shadow trees of the hosts it names are searched: each selector is resolved inside what the one before
 * reached, and every matching host counts (the old page's copy may still be on screen next to the new one). Hosts need
 * no visibility of their own, so `display: contents` wrappers work.
 */
export function lookup(target: string, within?: Within | null, skip?: ReadonlySet<Element>): Lookup {
  const none: Lookup = { el: null, roots: [], blocked: false, invalid: false };
  if (typeof document === "undefined") return none;
  const path = pathOf(within);
  if (path === "invalid") return { ...none, invalid: true };
  if (path === null) return { ...none, el: visible(document, target, skip) };
  let scopes: ParentNode[] = [document];
  let sawHostWithoutRoot = false;
  for (const selector of path) {
    const next: ShadowRoot[] = [];
    for (const scope of scopes) {
      let hosts: Element[];
      try {
        hosts = Array.from(scope.querySelectorAll(selector));
      } catch {
        return { ...none, invalid: true };
      }
      for (const host of hosts) {
        if (host.shadowRoot) next.push(host.shadowRoot);
        else sawHostWithoutRoot = true;
      }
    }
    scopes = next;
  }
  const roots = scopes as ShadowRoot[];
  for (const root of roots) {
    const el = visible(root, target, skip);
    if (el) return { el, roots, blocked: false, invalid: false };
  }
  return { el: null, roots, blocked: roots.length === 0 && sawHostWithoutRoot, invalid: false };
}

/** The element that has focus, looking through open shadow trees to the one that really does. */
export function deepActiveElement(): Element | null {
  if (typeof document === "undefined") return null;
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/** Every element marked `data-tour` on the page and inside its open shadow trees. */
export function markedElements(): ReadonlySet<Element> {
  const out = new Set<Element>();
  if (typeof document === "undefined") return out;
  const walk = (root: ParentNode): void => {
    root.querySelectorAll("[data-tour]").forEach((el) => out.add(el));
    root.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) walk(el.shadowRoot);
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
