import { type JSX } from "react";
import { quickStart } from "../guide/quickstart";
import { Tokens } from "../site/CodePanel";
import { Door } from "../site/Door";
import { highlight } from "../site/highlight";
import { mount } from "../site/mount";
import "./og.css";

function Og(): JSX.Element {
  return (
    <div className="og">
      <p className="og-mark">
        <span className="mini-door" aria-hidden="true" />
        Speak, Friend
      </p>
      <div className="og-body">
        <div className="og-copy">
          <p className="eyebrow">speak-friend-react</p>
          <h1>Accessible product tours for React.</h1>
          <code className="install">
            <Tokens line={highlight(quickStart.install)[0] ?? []} />
          </code>
        </div>
        <Door />
      </div>
    </div>
  );
}

mount(<Og />);
