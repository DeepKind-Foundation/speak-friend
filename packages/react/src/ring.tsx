import { useEffect, useState, type JSX } from "react";
import { createPortal } from "react-dom";
import { findTarget } from "./wait-for-target.js";

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Follows the target's box through scrolling, resizing and layout changes. Content added or resized above the target
 * moves it without resizing it, so the document and the DOM are watched as well as the target itself.
 */
function useBox(target: string): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    const el = findTarget(target);
    if (!el) return;
    let frame = 0;
    const measure = (): void => {
      frame = 0;
      const r = el.getBoundingClientRect();
      setBox((p) =>
        p && p.top === r.top && p.left === r.left && p.width === r.width && p.height === r.height
          ? p
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      );
    };
    const schedule = (): void => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    observer?.observe(el);
    observer?.observe(document.body);
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => {
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
      mutations.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target]);
  return box;
}

/** A ring around the element marked `data-tour="<target>"`. It never blocks pointer events. */
export function Ring({ target, theme }: { target: string; theme?: "light" | "dark" }): JSX.Element | null {
  const box = useBox(target);
  if (!box || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="sf-ring"
      data-theme={theme}
      aria-hidden="true"
      style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
    />,
    document.body,
  );
}
