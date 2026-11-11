const escape = (v: string) => v.replace(/["\\]/g, "\\$&");

const find = (target: string): HTMLElement | null => {
  const el = document.querySelector<HTMLElement>(`[data-tour="${escape(target)}"]`);
  return el && el.getClientRects().length > 0 ? el : null;
};

export const findTarget = (target: string): HTMLElement | null =>
  typeof document === "undefined" ? null : find(target);

/** Resolves true when the target is on the page, waiting up to `timeout` ms for it to appear. */
export function waitForTarget(target: string, timeout: number): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  if (find(target)) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = (found: boolean) => {
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
