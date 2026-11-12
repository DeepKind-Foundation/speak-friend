import type { JSX } from "react";
import { CodePanel } from "../site/CodePanel";
import { highlight } from "../site/highlight";
import { NPM, REPO } from "../seo/site";
import { guideProps } from "./propsTable";
import { quickStart } from "./quickstart";

const installLines = highlight(quickStart.install);
const exampleLines = highlight(quickStart.code);

/** The answer to "how do I add a tour", with the install command, a complete example and the props. */
export function QuickStart(): JSX.Element {
  return (
    <>
      <section className="doc" aria-labelledby="quick-start">
        <h2 id="quick-start">{quickStart.question}</h2>
        <p>{quickStart.answer}</p>
        <CodePanel title="Install" lines={installLines} />
        <CodePanel title="Example" lines={exampleLines} />
      </section>
      <section className="doc" aria-labelledby="props">
        <h2 id="props">Which props does the guide take?</h2>
        <table aria-label="Props of TourGuide">
          <thead>
            <tr>
              <th scope="col">Prop</th>
              <th scope="col">Default</th>
              <th scope="col">What it does</th>
            </tr>
          </thead>
          <tbody>
            {guideProps.map((prop) => (
              <tr key={prop.name}>
                <th scope="row">{prop.name}</th>
                <td>{prop.defaultValue}</td>
                <td>{prop.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="doc" aria-labelledby="status">
        <h2 id="status">What do I need, and where is it?</h2>
        <p>
          React 18 or later, and a bundler that handles ES modules. Both packages are MIT licensed and in alpha, so the
          API can still change. The <a href="./workbench/">workbench</a> lets you try every option and see the code it
          produces.
        </p>
        <ul className="links">
          <li>
            <a href={NPM.engine}>speak-friend on npm</a> is the engine. It has no DOM or React dependency and runs on
            the server.
          </li>
          <li>
            <a href={NPM.react}>speak-friend-react on npm</a> is the guide for React.
          </li>
          <li>
            <a href={REPO}>Source and issues on GitHub</a>
          </li>
        </ul>
      </section>
    </>
  );
}
