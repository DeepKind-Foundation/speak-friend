import type { JSX } from "react";

/** The gate drawn from a standalone svg, tinted by the theme through a CSS mask. */
export function Door(): JSX.Element {
  return (
    <figure className="door-figure" aria-hidden="true">
      <div className="door" />
      <figcaption className="door-caption">Speak, friend, and enter.</figcaption>
    </figure>
  );
}
