/**
 * Gives focus back to where it was when the tour started. When that element is gone, for example because the tour
 * navigated away from the page it was started on, focus goes to `fallback`, then to the first level 1 heading, then
 * to `main`, so it never ends up on the body.
 */
export function restoreFocus(opener: Element | null, fallback?: () => HTMLElement | null): void {
  if (opener instanceof HTMLElement && opener.isConnected) {
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
