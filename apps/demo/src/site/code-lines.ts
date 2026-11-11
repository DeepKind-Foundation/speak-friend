/** What a token is, so the page can colour it. */
export type TokenKind = "tag" | "attr" | "string" | "value" | "punct" | "comment" | "plain";
/** A piece of code text with its kind. */
export interface Token {
  kind: TokenKind;
  text: string;
}
/** Code as lines of tokens. */
export type CodeLines = Token[][];

/** Plain text of code lines. */
export function toText(lines: CodeLines): string {
  return lines.map((line) => line.map((token) => token.text).join("")).join("\n");
}
