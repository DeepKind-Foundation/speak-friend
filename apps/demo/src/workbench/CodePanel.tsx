import type { JSX } from "react";
import type { CodeLines, TokenKind } from "./code";

const CLASS: Record<TokenKind, string> = {
  tag: "tk-t",
  attr: "tk-a",
  string: "tk-s",
  value: "tk-v",
  punct: "tk-p",
  comment: "tk-c",
};

/** Coloured code under a heading, read as one region by assistive technology. */
export function CodePanel({ title, lines }: { title: string; lines: CodeLines }): JSX.Element {
  return (
    <section className="panel" aria-label={title}>
      <h2 className="label" aria-hidden="true">
        {title}
      </h2>
      <pre dir="ltr">
        <code>
          {lines.map((line, row) => (
            <span key={row}>
              {line.map((token, i) => (
                <span key={i} className={CLASS[token.kind]}>
                  {token.text}
                </span>
              ))}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </section>
  );
}
