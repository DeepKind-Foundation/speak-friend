import {
  createElement,
  type JSX,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useDock } from "./dock.js";
import { restoreFocus } from "./focus.js";
import { Ring } from "./ring.js";
import { useRun, useTourState, useTours } from "./provider.js";
import { findTarget } from "./wait-for-target.js";

/** Every string the guide shows. The library has no text of its own. */
export interface GuideLabels {
  /** Text for the step counter, for example `Step 2 of 4`. `index` is 1-based. */
  counter: (index: number, total: number) => string;
  back: string;
  next: string;
  /** Label of the next button on the last step. */
  finish: string;
  close: string;
  /** Shown while the next step is taking a moment, for example `Waiting for the page`. Optional. */
  waiting?: string;
  /** Announced when the tour ends, whatever the reason, for example "Tour closed". Nothing is announced without it. */
  ended?: string;
}

export interface TourGuideProps {
  labels: GuideLabels;
  /** Horizontal side of the dock. Logical, so it mirrors in right-to-left layouts. Default `end`. */
  position?: "start" | "end";
  /** `light` or `dark` forces a theme. By default the guide follows the operating system. */
  theme?: "light" | "dark";
  /** Heading level of the step title. Default 2. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** `focus` moves focus to the step title; `live` keeps focus and announces the step. Default `focus`. */
  announce?: "focus" | "live";
  /** Close the tour on Escape. Default true. */
  closeOnEscape?: boolean;
  /**
   * Where focus goes when the tour ends and the element that started it is no longer on the page. Default: the first
   * level 1 heading, then `main`.
   */
  fallbackFocus?: () => HTMLElement | null;
  /**
   * Where the guide and ring are mounted. Default `document.body`. A page that opens a modal `<dialog>` with
   * `showModal()` makes everything outside the dialog unreachable, including the guide, so return that dialog here
   * while it is open. Called on every render while a tour runs.
   */
  container?: () => HTMLElement | null;
  /**
   * Tint the page around the ring. Visual only: it never blocks clicks or focus and nothing is made inert. It is not
   * drawn when the person asks for more contrast or less transparency, or in forced-colors mode. Default false.
   */
  dim?: boolean;
  className?: string;
}

/** Space kept between the guide and focused or scrolled-to elements, in px. */
const CLEARANCE = 24;

const noSubscription = (): (() => void) => () => undefined;

const reducedMotion = (): boolean =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The docked guide with its highlight ring. Renders only while a tour is running. */
export function TourGuide({
  labels,
  position = "end",
  theme,
  headingLevel = 2,
  announce = "focus",
  closeOnEscape = true,
  fallbackFocus,
  container,
  dim = false,
  className,
}: TourGuideProps): JSX.Element | null {
  const tours = useTours();
  const run = useRun();
  const state = useTourState();
  const id = useId();
  const titleRef = useRef<HTMLElement>(null);
  const guideRef = useRef<HTMLElement>(null);
  const opener = useRef<Element | null>(null);
  const region = useRef<HTMLDivElement>(null);
  const wasActive = useRef(false);
  const fallback = useRef(fallbackFocus);
  // False on the server and during hydration, true afterwards: the guide only exists in the browser.
  const mounted = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  // A tour is active from the moment it starts, even while the first step is still being waited for.
  const active = state.status === "running";
  const running = active && state.step !== null;
  const stepId = state.step?.id;

  useLayoutEffect(() => {
    fallback.current = fallbackFocus;
  }, [fallbackFocus]);

  // Remember where focus was when the tour started and give it back when the tour ends.
  useLayoutEffect(() => {
    if (!active) return;
    opener.current = document.activeElement;
    return () => {
      restoreFocus(opener.current, fallback.current);
      opener.current = null;
    };
  }, [active]);

  useLayoutEffect(() => {
    if (running && announce === "focus") titleRef.current?.focus({ preventScroll: true });
  }, [running, stepId, announce]);

  // One live region that stays in the page for as long as the guide is mounted, so what is put in it is announced as a
  // change. A region that appears together with its text is often not announced.
  const say = useCallback((text: string): void => {
    if (region.current && text) region.current.textContent = text;
  }, []);

  useEffect(() => {
    if (active && !wasActive.current && region.current) region.current.textContent = "";
    if (!active && wasActive.current && labels.ended) say(labels.ended);
    wasActive.current = active;
  }, [active, labels.ended, say]);

  useEffect(() => {
    const el = region.current;
    if (state.waiting && labels.waiting) say(labels.waiting);
    // Take the hint back once the wait is over, so it does not linger as the last thing said.
    else if (el && labels.waiting && (el.textContent ?? "") === labels.waiting) el.textContent = "";
  }, [state.waiting, labels.waiting, say]);

  useEffect(() => {
    if (running && announce === "live" && state.step)
      say(`${labels.counter(state.index + 1, state.total)}: ${state.step.title}`);
    // The text depends on the step only; `labels` and `say` are not what makes a new announcement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, stepId, announce]);

  const dock = useDock(guideRef, state.step?.target, position, running);
  const edge = dock?.edge ?? "bottom";

  // Keep focused elements clear of the dock (WCAG 2.4.11). Scroll padding moves them out from under it. At the bottom
  // the page also gets padding at its end, so the last elements have room to move into. This runs before the scroll
  // to the target below, so the very first step is placed with it in effect.
  useEffect(() => {
    const guide = guideRef.current;
    if (!running || !guide) return;
    const root = document.documentElement;
    const own = parseFloat(getComputedStyle(root).paddingBottom) || 0;
    const properties =
      edge === "top" ? (["scroll-padding-top"] as const) : (["scroll-padding-bottom", "padding-bottom"] as const);
    const restore = properties.map((name) => {
      const before = root.style.getPropertyValue(name);
      return () => (before ? root.style.setProperty(name, before) : root.style.removeProperty(name));
    });
    const apply = (): void => {
      const room = guide.offsetHeight + CLEARANCE;
      if (edge === "top") root.style.setProperty("scroll-padding-top", `${room}px`);
      else {
        root.style.setProperty("scroll-padding-bottom", `${room}px`);
        root.style.setProperty("padding-bottom", `${own + room}px`);
      }
    };
    apply();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(apply);
    observer?.observe(guide);
    return () => {
      observer?.disconnect();
      restore.forEach((undo) => undo());
    };
  }, [running, edge]);

  useEffect(() => {
    if (!running || !state.step) return;
    const el = findTarget(state.step.target);
    if (!el) return;
    // A target taller than what the guide leaves free cannot be centred, so its top is brought into view instead.
    const free = window.innerHeight - (guideRef.current?.offsetHeight ?? 0) - CLEARANCE;
    const tall = el.getBoundingClientRect().height > free;
    el.scrollIntoView({ block: tall ? "start" : "center", behavior: reducedMotion() ? "auto" : "smooth" });
  }, [running, state.step]);

  useEffect(() => {
    if (!active || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape" && !e.defaultPrevented && !e.isComposing) run(tours.close());
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, closeOnEscape, tours, run]);

  if (!mounted) return null;
  const host = container?.() ?? document.body;
  const { step, index, total } = state;
  const announcer = createPortal(
    <div ref={region} className="sf-visually-hidden" role="status" aria-live="polite" aria-atomic="true" />,
    host,
  );
  // The announcer is always the first child, so it is never remounted while the guide comes and goes.
  if (!active) return <>{announcer}</>;
  if (!step) {
    // The first step is not on the page yet. Say so once the wait is noticeable, and let the person give up.
    if (!state.waiting || !labels.waiting) return <>{announcer}</>;
    return (
      <>
        {announcer}
        {createPortal(
          <section
            role="group"
            aria-label={labels.waiting}
            aria-busy="true"
            className={className ? `sf-guide sf-starting ${className}` : "sf-guide sf-starting"}
            data-position={position}
            data-edge="bottom"
            data-theme={theme}
          >
            <div className="sf-body">
              <p className="sf-waiting">{labels.waiting}</p>
              <div className="sf-actions">
                <button type="button" className="sf-button sf-quiet" onClick={() => run(tours.close())}>
                  {labels.close}
                </button>
              </div>
            </div>
          </section>,
          host,
        )}
      </>
    );
  }
  const last = index === total - 1;
  const counter = labels.counter(index + 1, total);

  return (
    <>
      {announcer}
      <Ring key={step.id} target={step.target} theme={theme} dim={dim} container={host} />
      {createPortal(
        <section
          ref={guideRef}
          role="dialog"
          aria-labelledby={id}
          className={className ? `sf-guide ${className}` : "sf-guide"}
          aria-busy={state.waiting || undefined}
          data-position={dock?.side ?? position}
          data-edge={edge}
          data-theme={theme}
        >
          <div className="sf-band">
            <span className="sf-count" id={`${id}-count`}>
              {counter}
            </span>
            <span className="sf-progress" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <i key={i} className={i < index ? "sf-done" : i === index ? "sf-current" : undefined} />
              ))}
            </span>
          </div>
          <div className="sf-body">
            {createElement(
              `h${headingLevel}`,
              { id, ref: titleRef, tabIndex: -1, className: "sf-title", "aria-describedby": `${id}-count` },
              step.title,
            )}
            <p className="sf-text">{step.body}</p>
            {labels.waiting && <p className="sf-waiting">{state.waiting ? labels.waiting : ""}</p>}
            <div className="sf-actions">
              <button type="button" className="sf-button" onClick={() => run(tours.back())} disabled={index === 0}>
                {labels.back}
              </button>
              <button type="button" className="sf-button sf-primary" onClick={() => run(tours.next())}>
                {last ? labels.finish : labels.next}
              </button>
              <button type="button" className="sf-button sf-quiet" onClick={() => run(tours.close())}>
                {labels.close}
              </button>
            </div>
          </div>
        </section>,
        host,
      )}
    </>
  );
}
