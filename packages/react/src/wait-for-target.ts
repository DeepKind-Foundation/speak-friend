import { lookup, type Within } from "./scope.js";

/** The first visible element marked `data-tour="<target>"`, or null. With `within`, only that component's tree. */
export const findTarget = (target: string, within?: Within | null): HTMLElement | null => lookup(target, within).el;

/** How long the page must stay unchanged after a navigation before an element from before it counts, in ms. */
export const SETTLE = 300;

/** How often a scoped wait looks again, in ms. A shadow tree that attaches and renders later changes nothing else. */
const POLL = 50;

export interface WaitOptions {
  /**
   * Elements that were on the page before a navigation. One of them may be the old page's copy of the target, still
   * on screen while the new page renders, so it only counts once the page has stopped changing for `settle` ms.
   * An element that was not there before counts at once.
   */
  stale?: ReadonlySet<Element>;
  /** Overrides `SETTLE`. */
  settle?: number;
  /** Look only inside the open shadow tree of this host (or path of hosts). See `Step.within`. */
  within?: Within;
}

/** How a wait ended. `blocked` and `invalid` explain a `found: false` that is not just "not there". */
export interface WaitResult {
  found: boolean;
  /** A host matched but had no open shadow root: it is closed, or has not rendered. */
  blocked: boolean;
  /** `within` is not made of usable selectors. */
  invalid: boolean;
}

const OBSERVE = { childList: true, subtree: true, attributes: true } as const;

/** Like `waitForTarget`, and says why it gave up. */
export function waitForScoped(
  target: string,
  timeout: number,
  { stale, settle = SETTLE, within }: WaitOptions = {},
): Promise<WaitResult> {
  const result = (found: boolean, blocked = false, invalid = false): WaitResult => ({ found, blocked, invalid });
  if (typeof document === "undefined") return Promise.resolve(result(false));
  const first = lookup(target, within, stale);
  if (first.invalid) return Promise.resolve(result(false, false, true));
  if (first.el) return Promise.resolve(result(true));
  const maybeStale = stale !== undefined && stale.size > 0;
  if (!maybeStale && lookup(target, within).el) return Promise.resolve(result(true));
  const scoped = within !== undefined && within !== null;
  return new Promise<WaitResult>((resolve) => {
    let quiet: ReturnType<typeof setTimeout> | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    const watched = new Set<Node>();
    const end = (): WaitResult => {
      const last = lookup(target, within);
      return result(last.el !== null, last.blocked, false);
    };
    const done = (outcome: WaitResult): void => {
      observer.disconnect();
      clearTimeout(timer);
      clearTimeout(quiet);
      clearInterval(poll);
      resolve(outcome);
    };
    // Mutations inside a shadow tree do not reach an observer on the page, so each root that is searched is watched too.
    const watch = (roots: readonly (ShadowRoot | Document)[]): void => {
      for (const root of roots) {
        if (watched.has(root)) continue;
        watched.add(root);
        observer.observe(root, OBSERVE);
      }
    };
    // A copy that was already there counts once nothing has changed for a while.
    const restart = (): void => {
      clearTimeout(quiet);
      if (maybeStale) quiet = setTimeout(() => done(end()), settle);
    };
    const check = (): boolean => {
      const now = lookup(target, within, stale);
      watch(now.roots);
      if (!now.el) return false;
      done(result(true));
      return true;
    };
    const observer = new MutationObserver(() => {
      if (!check()) restart();
    });
    const timer = setTimeout(() => done(end()), timeout);
    observer.observe(document.body, OBSERVE);
    watch(first.roots);
    // Looking again changes nothing for the settle timer: a new element counts at once, an old one waits.
    if (scoped) poll = setInterval(check, POLL);
    restart();
  });
}

/** Resolves true when the target is on the page, waiting up to `timeout` ms for it to appear. */
export function waitForTarget(target: string, timeout: number, options: WaitOptions = {}): Promise<boolean> {
  return waitForScoped(target, timeout, options).then((r) => r.found);
}
