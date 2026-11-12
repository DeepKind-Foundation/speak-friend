import { useEffect, useState, type RefObject } from "react";
import { chooseDock, type Dock, type Side } from "./placement.js";
import { lookup, useStableWithin, type Within } from "./scope.js";

/** Room kept around the target for its ring, in px. */
const RING_MARGIN = 8;
/** How long to wait for the page to stop scrolling before measuring, in ms. */
const SCROLL_WAIT = 600;

/**
 * Where to dock the guide so it does not cover the target. Measured once the page has scrolled to the target, and
 * again when the window is resized. Null until the first measurement, which means the app's own choice.
 */
export function useDock(
  guide: RefObject<HTMLElement | null>,
  target: string | undefined,
  within: Within | undefined,
  position: Side,
  running: boolean,
): Dock | null {
  const [dock, setDock] = useState<Dock | null>(null);
  const scope = useStableWithin(within);

  // Each tour starts from the app's own choice again.
  useEffect(() => () => setDock(null), [running]);

  useEffect(() => {
    const el = guide.current;
    if (!running || !target || !el) return;
    const place = (): void => {
      const found = lookup(target, scope).el;
      if (!found) return;
      const style = getComputedStyle(el);
      const next = chooseDock({
        target: found.getBoundingClientRect(),
        guide: { width: el.offsetWidth, height: el.offsetHeight },
        viewport: { width: window.innerWidth, height: window.innerHeight },
        gap: parseFloat(style.getPropertyValue("--sf-gap")) || 16,
        side: position,
        rtl: style.direction === "rtl",
        margin: RING_MARGIN,
      });
      setDock((previous) => (previous?.side === next.side && previous.edge === next.edge ? previous : next));
    };
    // Smooth scrolling takes a while: measure when it ends, or after a fixed wait where `scrollend` does not exist.
    const settle = (): void => {
      window.removeEventListener("scrollend", settle);
      roots.forEach((root) => root.removeEventListener("scrollend", settle, { capture: true }));
      clearTimeout(timer);
      place();
    };
    const timer = setTimeout(settle, SCROLL_WAIT);
    // `scrollend` does not leave a shadow tree, so the roots the target is in are listened to as well.
    const roots = lookup(target, scope).roots;
    roots.forEach((root) => root.addEventListener("scrollend", settle, { capture: true }));
    window.addEventListener("scrollend", settle);
    window.addEventListener("resize", place);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("scrollend", settle);
      roots.forEach((root) => root.removeEventListener("scrollend", settle, { capture: true }));
      window.removeEventListener("resize", place);
    };
  }, [guide, running, target, scope, position]);

  return dock;
}
