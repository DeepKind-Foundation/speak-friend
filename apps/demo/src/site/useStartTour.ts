import { useTours } from "speak-friend-react";

/** Returns a handler that starts the tour, and logs the error if starting fails. */
export function useStartTour(tourId: string): () => void {
  const tours = useTours();
  return () => {
    tours.start(tourId).catch((error: unknown) => console.error(error));
  };
}
