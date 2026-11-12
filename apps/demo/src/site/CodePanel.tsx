import type { JSX } from "react";
import type { CodeLines, Token, TokenKind } from "./code-lines";

const CLASS: Record<TokenKind, string | undefined> = {
  tag: "tk-t",
  attr: "tk-a",
  string: "tk-s",
  value: "tk-v",
  punct: "tk-p",
  comment: "tk-c",
  plain: undefined,
};

/** One line of coloured tokens. */
export function Tokens({ line }: { line: Token[] }): JSX.Element {
  return (
    <>
      {line.map((token, i) => (
        <span key={i} className={CLASS[token.kind]}>
          {token.text}
        </span>
      ))}
    </>
  );
}

/** Coloured code under a heading, read as one region by assistive technology. */
export function CodePanel({ title, lines }: { title: string; lines: CodeLines }): JSX.Element {
  return (
    <section className="panel" aria-label={title}>
      <p className="label" aria-hidden="true">
        {title}
      </p>
      <pre dir="ltr">
        <code>
          {lines.map((line, row) => (
            <span key={row}>
              <Tokens line={line} />
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </section>
  );
}
