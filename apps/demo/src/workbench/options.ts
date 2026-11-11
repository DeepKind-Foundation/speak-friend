/** Side of the window the guide docks to. Logical, so it mirrors with the page direction. */
export type Position = "start" | "end";
/** `system` leaves the `theme` prop unset, so the guide follows the operating system. */
export type ThemeChoice = "system" | "light" | "dark";
/** Whether a step moves focus to its title or is announced by a live region. */
export type Announce = "focus" | "live";
/** Reading direction of the whole page. */
export type Direction = "ltr" | "rtl";
/** Colour presets for the guide. `default` overrides nothing. */
export type SkinName = "default" | "ember" | "forest";

/** Everything the workbench lets you change. */
export interface Options {
  position: Position;
  theme: ThemeChoice;
  announce: Announce;
  skin: SkinName;
  direction: Direction;
}

/** The library's own defaults. */
export const defaults: Options = {
  position: "end",
  theme: "system",
  announce: "focus",
  skin: "default",
  direction: "ltr",
};

/** The two custom properties a skin overrides. Values are written so they work in both themes. */
export const skins: Record<Exclude<SkinName, "default">, { accent: string; primary: string }> = {
  ember: { accent: "light-dark(oklch(48% 0.14 45), oklch(80% 0.11 60))", primary: "oklch(86% 0.14 75)" },
  forest: { accent: "light-dark(oklch(42% 0.09 160), oklch(80% 0.1 160))", primary: "oklch(87% 0.15 150)" },
};
