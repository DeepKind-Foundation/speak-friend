import { useEffect, useState, type JSX } from "react";
import { createPortal } from "react-dom";
import { boxOf } from "./box.js";
import { lookup, useStableWithin, type Within } from "./scope.js";

/** The outline, its offset and the halo reach about 7px outside the box, so the box stays this far from the window edge. */
const INSET = 8;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Follows the target's box through scrolling, resizing and layout changes. Content added or resized above the target
 * moves it without resizing it, so the document and the DOM are watched as well as the target itself. The element is
 * looked up again on every measure, so a target that is replaced or removed is followed or dropped, and the ring is
 * never left on a detached element. The ring is clipped to the window, with room for its outline, so a target larger
 * than the window is ringed where it can be seen, and nothing is drawn while none of it is on screen.
 */
function useBox(target: string, within: Within | undefined): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  const scope = useStableWithin(within);
  useEffect(() => {
    let frame = 0;
    let observed: HTMLElement | null = null;
    // Shadow roots and frame documents the target is searched in. Scrolling and changes inside them do not reach the
    // page, so they are listened to as well. Frames are watched for their size and for loading a new document.
    const roots = new Set<ShadowRoot | Document>();
    const frames = new Set<HTMLIFrameElement>();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => schedule());
    const mutations = new MutationObserver(() => schedule());
    const measure = (): void => {
      frame = 0;
      const found = lookup(target, scope);
      const el = found.el;
      for (const root of found.roots) {
        if (roots.has(root)) continue;
        roots.add(root);
        root.addEventListener("scroll", schedule, { capture: true, passive: true });
        mutations.observe(root, { childList: true, subtree: true, attributes: true });
      }
      for (const frame of found.frames) {
        if (frames.has(frame)) continue;
        frames.add(frame);
        observer?.observe(frame);
        frame.addEventListener("load", schedule);
      }
      if (el !== observed) {
        if (observed) observer?.unobserve(observed);
        if (el) observer?.observe(el);
        observed = el;
      }
      if (!el) {
        setBox(null);
        return;
      }
      const r = boxOf(el);
      const top = Math.max(r.top, INSET);
      const left = Math.max(r.left, INSET);
      const height = Math.min(r.bottom, window.innerHeight - INSET) - top;
      const width = Math.min(r.right, window.innerWidth - INSET) - left;
      if (width <= 0 || height <= 0) {
        setBox(null);
        return;
      }
      setBox((p) =>
        p && p.top === top && p.left === left && p.width === width && p.height === height
          ? p
          : { top, left, width, height },
      );
    };
    const schedule = (): void => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    observer?.observe(document.body);
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => {
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
      mutations.disconnect();
      roots.forEach((root) => root.removeEventListener("scroll", schedule, { capture: true }));
      frames.forEach((frame) => frame.removeEventListener("load", schedule));
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target, scope]);
  return box;
}

/** A ring around the element marked `data-tour="<target>"`. It never blocks pointer events. */
export function Ring({
  target,
  within,
  theme,
  dim,
  container,
}: {
  target: string;
  /** Look only inside the open shadow tree of this host, or path of hosts. See `Step.within`. */
  within?: Within;
  theme?: "light" | "dark";
  dim: boolean;
  container: HTMLElement;
}): JSX.Element | null {
  const box = useBox(target, within);
  if (!box || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="sf-ring"
      data-theme={theme}
      data-dim={dim || undefined}
      aria-hidden="true"
      style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
    />,
    container,
  );
}
