import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { createTours, type Options, type Snapshot, type Tours } from "dont-panic";
import { waitForTarget } from "./wait-for-target";

const TourContext = createContext<Tours<never> | null>(null);

export interface TourProviderProps<C> extends Omit<Options<C>, "isAvailable"> {
  children: ReactNode;
  /** How long to wait for a step's target to appear before skipping the step, in ms. Default 1500. */
  targetTimeout?: number;
}

export function TourProvider<C>({ children, targetTimeout = 1500, ...options }: TourProviderProps<C>) {
  const { tours, store, context, navigate, maxDismissals } = options;
  const controller = useMemo(
    () =>
      createTours<C>({
        tours,
        store,
        context,
        navigate,
        maxDismissals,
        isAvailable: (step) => waitForTarget(step.target, targetTimeout),
      }),
    [tours, store, context, navigate, maxDismissals, targetTimeout],
  );
  return <TourContext.Provider value={controller as unknown as Tours<never>}>{children}</TourContext.Provider>;
}

/** The tour controller: offered, start, next, back, close, restart, dismiss. */
export function useTours<C = unknown>(): Tours<C> {
  const t = useContext(TourContext);
  if (!t) throw new Error("useTours must be used inside TourProvider");
  return t as unknown as Tours<C>;
}

/** The current state; re-renders on every change. */
export function useTourState<C = unknown>(): Snapshot<C> {
  const t = useTours<C>();
  return useSyncExternalStore((notify) => t.subscribe(notify), t.snapshot, t.snapshot);
}
