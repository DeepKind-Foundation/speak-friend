import type { JSX } from "react";
import { CodePanel } from "../site/CodePanel";
import { Header } from "../site/Header";
import { highlight } from "../site/highlight";
import { sections } from "./sections";

/** The documentation page: the behaviour the front page does not cover, one question at a time. */
export function DocsPage(): JSX.Element {
  return (
    <main className="page">
      <Header current="docs" />
      <h1 className="docs-title">Documentation</h1>
      <p className="docs-lead">
        The details behind the quick start: targets in web components and iframes, saving progress, the keyboard, and
        what is not covered. The package READMEs hold the same reference.
      </p>
      <nav className="docs-contents" aria-label="On this page">
        <ul className="links">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.question}</a>
            </li>
          ))}
        </ul>
      </nav>
      {sections.map((section) => (
        <section key={section.id} className="doc" aria-labelledby={section.id}>
          <h2 id={section.id}>{section.question}</h2>
          {section.paragraphs.map((text) => (
            <p key={text}>{text}</p>
          ))}
          {section.code && <CodePanel title={section.code.title} lines={highlight(section.code.source)} />}
          {section.points && (
            <ul className="links">
              {section.points.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
