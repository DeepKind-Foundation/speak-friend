const escapeValue = (value: string): string =>
  typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");

const find = (target: string): HTMLElement | null => {
  const el = document.querySelector<HTMLElement>(`[data-tour="${escapeValue(target)}"]`);
  return el && el.getClientRects().length > 0 ? el : null;
};

/** The visible element marked `data-tour="<target>"`, or null. */
export const findTarget = (target: string): HTMLElement | null =>
  typeof document === "undefined" ? null : find(target);

/** Resolves true when the target is on the page, waiting up to `timeout` ms for it to appear. */
export function waitForTarget(target: string, timeout: number): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if (find(target)) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const done = (found: boolean): void => {
      observer.disconnect();
      clearTimeout(timer);
      resolve(found);
    };
    const observer = new MutationObserver(() => {
      if (find(target)) done(true);
    });
    const timer = setTimeout(() => done(find(target) !== null), timeout);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  });
}
