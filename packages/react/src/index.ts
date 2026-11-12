/** Creates the tour controller and shares it with the components below. `useTourProgress` reads saved progress. */
export { TourProvider, useTours, useTourState, useTourProgress } from "./provider.js";
/** Props of `TourProvider`. */
export type { TourProviderProps } from "./provider.js";
/** The docked guide with its highlight ring; renders only while a tour is running. */
export { TourGuide } from "./guide.js";
/** Strings and props of `TourGuide`. */
export type { GuideLabels, TourGuideProps } from "./guide.js";
/** A ring around the element marked `data-tour`. */
export { Ring } from "./ring.js";
/** Resolves true when a `data-tour` target is on the page, waiting up to a timeout. */
export { waitForTarget } from "./wait-for-target.js";
