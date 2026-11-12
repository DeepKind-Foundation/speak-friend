/** Side of the window the guide docks to. Logical, so it mirrors with the page direction. */
export type Position = "start" | "end";
/** `system` leaves the `theme` prop unset, so the guide follows the operating system. */
export type ThemeChoice = "system" | "light" | "dark";
/** Whether a step moves focus to its title or is announced by a live region. */
export type Announce = "focus" | "live";
/** Whether the page around the ring is tinted. */
export type Dim = "off" | "on";
/** Reading direction of the whole page. */
export type Direction = "ltr" | "rtl";
/** Colour presets for the guide. `default` overrides nothing. */
export type SkinName = "default" | "ember" | "forest";

/** Everything the workbench lets you change. */
export interface Options {
  position: Position;
  theme: ThemeChoice;
  announce: Announce;
  dim: Dim;
  skin: SkinName;
  direction: Direction;
}

/** The library's own defaults. */
export const defaults: Options = {
  position: "end",
  theme: "system",
  announce: "focus",
  dim: "off",
  skin: "default",
  direction: "ltr",
};

/** A starting point: a name, what it is for, and the options it changes. */
export interface Preset {
  name: string;
  patch: Partial<Options>;
}

export const presets: readonly Preset[] = [
  { name: "Default", patch: {} },
  { name: "Night, page dimmed", patch: { theme: "dark", dim: "on" } },
  { name: "Right to left", patch: { direction: "rtl" } },
  { name: "Your colours", patch: { skin: "ember" } },
];

/** The options a preset stands for. */
export const optionsOf = (preset: Preset): Options => ({ ...defaults, ...preset.patch });

/** True when every option is the same. */
export const sameOptions = (a: Options, b: Options): boolean =>
  (Object.keys(a) as (keyof Options)[]).every((key) => a[key] === b[key]);

/** The two custom properties a skin overrides. Values are written so they work in both themes. */
export const skins: Record<Exclude<SkinName, "default">, { accent: string; primary: string }> = {
  ember: { accent: "light-dark(oklch(48% 0.14 45), oklch(80% 0.11 60))", primary: "oklch(86% 0.14 75)" },
  forest: { accent: "light-dark(oklch(42% 0.09 160), oklch(80% 0.1 160))", primary: "oklch(87% 0.15 150)" },
};
