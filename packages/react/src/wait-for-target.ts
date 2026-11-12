const escapeValue = (value: string): string =>
  typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");

const find = (target: string, skip?: ReadonlySet<Element>): HTMLElement | null => {
  const candidates = document.querySelectorAll<HTMLElement>(`[data-tour="${escapeValue(target)}"]`);
  return Array.from(candidates).find((el) => !skip?.has(el) && el.getClientRects().length > 0) ?? null;
};

/** The first visible element marked `data-tour="<target>"`, or null. */
export const findTarget = (target: string): HTMLElement | null =>
  typeof document === "undefined" ? null : find(target);

/** How long the page must stay unchanged after a navigation before an element from before it counts, in ms. */
export const SETTLE = 300;

export interface WaitOptions {
  /**
   * Elements that were on the page before a navigation. One of them may be the old page's copy of the target, still
   * on screen while the new page renders, so it only counts once the page has stopped changing for `settle` ms.
   * An element that was not there before counts at once.
   */
  stale?: ReadonlySet<Element>;
  /** Overrides `SETTLE`. */
  settle?: number;
}

/** Resolves true when the target is on the page, waiting up to `timeout` ms for it to appear. */
export function waitForTarget(
  target: string,
  timeout: number,
  { stale, settle = SETTLE }: WaitOptions = {},
): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if (find(target, stale)) return Promise.resolve(true);
  const maybeStale = stale !== undefined && stale.size > 0;
  if (!maybeStale && find(target)) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    let quiet: ReturnType<typeof setTimeout> | undefined;
    const done = (found: boolean): void => {
      observer.disconnect();
      clearTimeout(timer);
      clearTimeout(quiet);
      resolve(found);
    };
    // A copy that was already there counts once nothing has changed for a while.
    const restart = (): void => {
      clearTimeout(quiet);
      if (maybeStale) quiet = setTimeout(() => done(find(target) !== null), settle);
    };
    const observer = new MutationObserver(() => {
      if (find(target, stale)) done(true);
      else restart();
    });
    const timer = setTimeout(() => done(find(target) !== null), timeout);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    restart();
  });
}
