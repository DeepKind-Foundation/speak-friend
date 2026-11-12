import { createContext, useContext, useMemo, useSyncExternalStore, type JSX, type ReactNode } from "react";
import { createTours, type Options, type Progress, type Snapshot, type Tours } from "speak-friend";
import { waitForTarget } from "./wait-for-target.js";

interface TourContextValue {
  tours: Tours<never>;
  onError: (error: unknown) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

const logError = (error: unknown): void => console.error(error);

export interface TourProviderProps<C> extends Omit<Options<C>, "isAvailable"> {
  children: ReactNode;
  /** How long to wait for a step's target to appear before skipping the step, in ms. A step's own `timeout` wins. Default 1500. */
  targetTimeout?: number;
  /** Called when a step change fails, for example when the progress store rejects. Default `console.error`. */
  onError?: (error: unknown) => void;
}

/** Creates the tour controller and shares it with the components below. */
export function TourProvider<C>({
  children,
  targetTimeout = 1500,
  onError = logError,
  ...options
}: TourProviderProps<C>): JSX.Element {
  const { tours, store, context, navigate, maxDismissals } = options;
  const value = useMemo<TourContextValue>(() => {
    // The elements on the page when a navigation started. Some may be the old page's copy of a target.
    let before: ReadonlySet<Element> | undefined;
    const go = navigate
      ? async (route: string): Promise<void> => {
          before = typeof document === "undefined" ? undefined : new Set(document.querySelectorAll("[data-tour]"));
          await navigate(route);
        }
      : undefined;
    return {
      tours: createTours<C>({
        tours,
        store,
        context,
        navigate: go,
        maxDismissals,
        isAvailable: (step, { navigated }) => {
          const stale = navigated ? before : undefined;
          if (!navigated) before = undefined;
          return waitForTarget(step.target, step.timeout ?? targetTimeout, { stale });
        },
      }) as unknown as Tours<never>,
      onError,
    };
  }, [tours, store, context, navigate, maxDismissals, targetTimeout, onError]);
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

const useContextValue = (): TourContextValue => {
  const value = useContext(TourContext);
  if (!value) throw new Error("useTours must be used inside TourProvider");
  return value;
};

/** The tour controller: offered, start, next, back, close, restart, dismiss. */
export function useTours<C = unknown>(): Tours<C> {
  return useContextValue().tours as unknown as Tours<C>;
}

/** Runs a step change and reports a failure through the provider's `onError`. */
export function useRun(): (action: Promise<void>) => void {
  const { onError } = useContextValue();
  return (action) => void action.catch(onError);
}

/** The current state; re-renders on every change. */
export function useTourState<C = unknown>(): Snapshot<C> {
  const t = useTours<C>();
  return useSyncExternalStore((notify) => t.subscribe(notify), t.snapshot, t.snapshot);
}

/**
 * What the engine last read from or wrote to the store for a tour, or null. Re-renders when it changes. Call
 * `offered()` once to load it, for example when the page opens.
 */
export function useTourProgress(tourId: string): Progress | null {
  const t = useTours();
  return useSyncExternalStore(
    (notify) => t.subscribeProgress(notify),
    () => t.progress(tourId),
    () => null,
  );
}
