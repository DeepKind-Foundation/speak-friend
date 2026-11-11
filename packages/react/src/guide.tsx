import { createElement, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ring } from "./ring.js";
import { useTourState, useTours } from "./provider.js";
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
}

export interface TourGuideProps {
  labels: GuideLabels;
  /** Horizontal side of the dock. Logical, so it mirrors in right-to-left layouts. Default `end`. */
  position?: "start" | "end";
  /** Heading level of the step title. Default 2. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** `focus` moves focus to the step title; `live` keeps focus and announces the step. Default `focus`. */
  announce?: "focus" | "live";
  /** Close the tour on Escape. Default true. */
  closeOnEscape?: boolean;
  className?: string;
}

const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The docked guide with its highlight ring. Renders only while a tour is running. */
export function TourGuide({
  labels,
  position = "end",
  headingLevel = 2,
  announce = "focus",
  closeOnEscape = true,
  className,
}: TourGuideProps) {
  const tours = useTours();
  const state = useTourState();
  const id = useId();
  const titleRef = useRef<HTMLElement>(null);
  const guideRef = useRef<HTMLElement>(null);
  const opener = useRef<Element | null>(null);
  const [mounted, setMounted] = useState(false);
  const running = state.status === "running" && state.step !== null;
  const stepId = state.step?.id;

  useEffect(() => setMounted(true), []);

  // Remember where focus was when the tour started and give it back when the tour ends.
  useLayoutEffect(() => {
    if (!running) return;
    opener.current = document.activeElement;
    return () => {
      const el = opener.current;
      if (el instanceof HTMLElement && el.isConnected) el.focus({ preventScroll: true });
      opener.current = null;
    };
  }, [running]);

  useLayoutEffect(() => {
    if (running && announce === "focus") titleRef.current?.focus({ preventScroll: true });
  }, [running, stepId, announce]);

  useEffect(() => {
    if (!running || !state.step) return;
    findTarget(state.step.target)?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
  }, [running, state.step]);

  // Keep focused elements clear of the dock (WCAG 2.4.11).
  useEffect(() => {
    const guide = guideRef.current;
    if (!running || !guide) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty("scroll-padding-bottom", `${guide.offsetHeight + 24}px`);
    apply();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(apply);
    observer?.observe(guide);
    return () => {
      observer?.disconnect();
      root.style.removeProperty("scroll-padding-bottom");
    };
  }, [running]);

  useEffect(() => {
    if (!running || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && !e.isComposing) void tours.close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [running, closeOnEscape, tours]);

  if (!mounted || !running || !state.step) return null;
  const { step, index, total } = state;
  const last = index === total - 1;
  const counter = labels.counter(index + 1, total);

  return (
    <>
      <Ring target={step.target} />
      {createPortal(
        <section
          ref={guideRef}
          role="dialog"
          aria-labelledby={id}
          className={className ? `sf-guide ${className}` : "sf-guide"}
          data-position={position}
        >
          <div className="sf-band">
            <span className="sf-count">{counter}</span>
            <span className="sf-progress" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <i key={i} className={i < index ? "sf-done" : i === index ? "sf-current" : undefined} />
              ))}
            </span>
          </div>
          <div className="sf-body">
            {createElement(`h${headingLevel}`, { id, ref: titleRef, tabIndex: -1, className: "sf-title" }, step.title)}
            <p className="sf-text">{step.body}</p>
            <div className="sf-actions">
              <button type="button" className="sf-button" onClick={() => void tours.back()} disabled={index === 0}>
                {labels.back}
              </button>
              <button type="button" className="sf-button sf-primary" onClick={() => void tours.next()}>
                {last ? labels.finish : labels.next}
              </button>
              <button type="button" className="sf-button sf-quiet" onClick={() => void tours.close()}>
                {labels.close}
              </button>
            </div>
          </div>
          {announce === "live" && (
            <div className="sf-visually-hidden" role="status">
              {`${counter}: ${step.title}`}
            </div>
          )}
        </section>,
        document.body,
      )}
    </>
  );
}
