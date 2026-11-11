import type { CodeLines, Token } from "./code-lines";

const KEYWORDS = new Set([
  "import",
  "from",
  "export",
  "const",
  "let",
  "function",
  "return",
  "await",
  "async",
  "type",
  "true",
  "false",
  "null",
]);

// Comment, string, word, number, space, anything else. Every character matches one of them, so no text is lost.
const TOKEN =
  /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|([A-Za-z_$][\w$-]*)|(\d+(?:\.\d+)?)|(\s+)|([\s\S])/g;

function highlightLine(line: string): Token[] {
  const tokens: Token[] = [];
  for (const match of line.matchAll(TOKEN)) {
    const [text, comment, string, word, number, space] = match;
    const end = (match.index ?? 0) + text.length;
    if (comment) tokens.push({ kind: "comment", text });
    else if (string) tokens.push({ kind: "string", text });
    else if (word) {
      const afterOpening = /<\/?$/.test(line.slice(0, match.index));
      const kind = afterOpening ? "tag" : KEYWORDS.has(text) || line[end] === "=" ? "attr" : "plain";
      tokens.push({ kind, text });
    } else if (number) tokens.push({ kind: "value", text });
    else if (space) tokens.push({ kind: "plain", text });
    else tokens.push({ kind: "punct", text });
  }
  return tokens;
}

/** Splits TypeScript or JSX source into coloured tokens, line by line. The tokens always add up to the source. */
export function highlight(source: string): CodeLines {
  return source.split("\n").map(highlightLine);
}
