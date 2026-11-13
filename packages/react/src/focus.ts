/** An element in this page that can take focus, or one in an iframe, whose class is not this window's `HTMLElement`. */
const canFocus = (el: Element | null): el is HTMLElement =>
  el !== null &&
  el.isConnected &&
  (el instanceof HTMLElement ||
    (el.ownerDocument !== document && el.nodeType === 1 && typeof (el as HTMLElement).focus === "function"));

/**
 * Gives focus back to where it was when the tour started. When that element is gone, for example because the tour
 * navigated away from the page it was started on, focus goes to `fallback`, then to the first level 1 heading, then
 * to `main`, so it never ends up on the body.
 */
export function restoreFocus(opener: Element | null, fallback?: () => HTMLElement | null): void {
  if (canFocus(opener)) {
    opener.focus({ preventScroll: true });
    return;
  }
  const given = fallback?.();
  const target = given?.isConnected
    ? given
    : (document.querySelector<HTMLElement>("h1") ?? document.querySelector<HTMLElement>("main"));
  if (!target) return;
  if (target.tabIndex < 0) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}
