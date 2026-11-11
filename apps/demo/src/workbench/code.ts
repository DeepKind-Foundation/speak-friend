import { skins, type Options, type SkinName } from "./options";

/** What a token is, so the page can colour it. */
export type TokenKind = "tag" | "attr" | "string" | "value" | "punct" | "comment";
/** A piece of code text with its kind. */
export interface Token {
  kind: TokenKind;
  text: string;
}
/** Code as lines of tokens. */
export type CodeLines = Token[][];

const t = (kind: TokenKind, text: string): Token => ({ kind, text });
const prop = (name: string, value: Token[]): Token[] => [t("punct", "  "), t("attr", name), t("punct", "="), ...value];
const stringProp = (name: string, value: string): Token[] => prop(name, [t("string", `"${value}"`)]);

/** The `<TourGuide>` element for the chosen options. The theme prop appears only when it is forced. */
export function componentCode(options: Options): CodeLines {
  return [
    [t("punct", "<"), t("tag", "TourGuide")],
    prop("labels", [t("punct", "{"), t("value", "labels"), t("punct", "}")]),
    stringProp("position", options.position),
    ...(options.theme === "system" ? [] : [stringProp("theme", options.theme)]),
    stringProp("announce", options.announce),
    [t("punct", "/>")],
  ];
}

/** The stylesheet that gives the guide the chosen colours. */
export function stylesheetCode(skin: SkinName): CodeLines {
  if (skin === "default") return [[t("comment", "/* No overrides: the default colours. */")]];
  const { accent, primary } = skins[skin];
  const custom = (name: string, value: string): Token[] => [
    t("punct", "  "),
    t("attr", name),
    t("punct", ": "),
    t("value", value),
    t("punct", ";"),
  ];
  return [
    [t("tag", ".sf-guide"), t("punct", ",")],
    [t("tag", ".sf-ring"), t("punct", " {")],
    custom("--sf-accent", accent),
    custom("--sf-primary", primary),
    [t("punct", "}")],
  ];
}

/** Plain text of code lines. */
export function toText(lines: CodeLines): string {
  return lines.map((line) => line.map((token) => token.text).join("")).join("\n");
}

/** The CSS to inject: exactly the text the page shows, or nothing for the default colours. */
export function stylesheetCss(skin: SkinName): string {
  return skin === "default" ? "" : toText(stylesheetCode(skin));
}
