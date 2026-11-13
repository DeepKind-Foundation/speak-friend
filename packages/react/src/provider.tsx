import { createContext, useContext, useMemo, useSyncExternalStore, type JSX, type ReactNode } from "react";
import { createTours, type Options, type Progress, type Snapshot, type Tours } from "speak-friend";
import { markedElements, usesWithin } from "./scope.js";
import { waitForScoped } from "./wait-for-target.js";

interface TourContextValue {
  tours: Tours<never>;
  onError: (error: unknown) => void;
  /** Whether any step names a `within`, so the extra work for web components is only done by apps that need it. */
  scoped: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

const logError = (error: unknown): void => console.error(error);

export interface TourProviderProps<C> extends Omit<Options<C>, "isAvailable"> {
  children: ReactNode;
  /** How long to wait for a step's target to appear before skipping the step, in ms. A step's own `timeout` wins. Default 1500. */
  targetTimeout?: number;
  /** Called when a step change fails or the progress store cannot be read or saved. Default `console.error`. */
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
    const scoped = usesWithin(tours);
    // The elements on the page when a navigation started. Some may be the old page's copy of a target. Open shadow trees
    // are only searched when some step uses `within`.
    let before: ReadonlySet<Element> | undefined;
    const go = navigate
      ? async (route: string): Promise<void> => {
          before =
            typeof document === "undefined"
              ? undefined
              : scoped
                ? markedElements()
                : new Set(document.querySelectorAll("[data-tour]"));
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
        onError,
        isAvailable: (step, { navigated }) => {
          const stale = navigated ? before : undefined;
          if (!navigated) before = undefined;
          return waitForScoped(step.target, step.timeout ?? targetTimeout, { stale, within: step.within }).then((r) => {
            if (r.invalid) onError(new Error(`Step "${step.id}": within is not a selector or a list of selectors.`));
            else if (r.blocked)
              onError(
                new Error(
                  `Step "${step.id}": the element matching ${JSON.stringify(step.within)} has no open shadow root and no same-origin document (it is closed, cross-origin, or has not loaded).`,
                ),
              );
            return r.found;
          });
        },
      }) as unknown as Tours<never>,
      onError,
      scoped,
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

/** Whether any step names a `within`. */
export function useScoped(): boolean {
  return useContextValue().scoped;
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

/**
 * Whether the store has been asked about a tour yet. While it is false, `useTourProgress` returning null does not mean
 * the person has not started, so show nothing or a neutral button instead of "Start". Call `offered()` to load it.
 */
export function useTourProgressLoaded(tourId: string): boolean {
  const t = useTours();
  return useSyncExternalStore(
    (notify) => t.subscribeProgress(notify),
    () => t.progressLoaded(tourId),
    () => false,
  );
}
