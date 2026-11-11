# speak-friend-react

React bindings for [`speak-friend`](../core): a docked tour guide with a highlight ring. Built with a focus on accessibility.

```tsx
import { TourGuide, TourProvider, useTours } from "speak-friend-react";
import "speak-friend-react/styles.css";

<TourProvider tours={tours} store={store} context={{ roles }} navigate={(route) => router.push(route)}>
  <App />
  <TourGuide
    labels={{
      counter: (n, total) => `Step ${n} of ${total}`,
      back: "Back",
      next: "Next",
      finish: "Finish",
      close: "Close",
    }}
  />
</TourProvider>;
```

Mark each step's target with `data-tour`:

```tsx
<section data-tour="next-step">...</section>
```

Start a tour from anywhere under the provider:

```tsx
const tours = useTours();
await tours.start("welcome");
```

## Behaviour

- The guide docks at the bottom, on the `end` side by default (`position="start"` mirrors it). On narrow screens it
  becomes a bottom sheet.
- A ring marks the target. The page is not dimmed and stays usable.
- Focus moves to the step title on every step. `announce="live"` keeps focus and announces the step instead.
- Escape closes the tour and returns focus to where it was. Starting again resumes from the same step.
- A step whose target is not on the page is skipped and leaves the count.
- While the guide is open, `scroll-padding-bottom` keeps focused elements clear of it.

## Props of `TourProvider`

`tours`, `store`, `context`, `navigate` and `maxDismissals` are passed to the engine. Two more:

| Prop            | Default         | Description                                                          |
| --------------- | --------------- | -------------------------------------------------------------------- |
| `targetTimeout` | `1500`          | Milliseconds to wait for a step's target before skipping the step.   |
| `onError`       | `console.error` | Called when a step change fails, for example when the store rejects. |

## Props of `TourGuide`

| Prop            | Default  | Description                                                 |
| --------------- | -------- | ----------------------------------------------------------- |
| `labels`        | required | Every string: `counter`, `back`, `next`, `finish`, `close`. |
| `position`      | `end`    | `start` or `end`.                                           |
| `headingLevel`  | `2`      | Heading level of the step title.                            |
| `announce`      | `focus`  | `focus` or `live`.                                          |
| `closeOnEscape` | `true`   |                                                             |
| `className`     |          | Added to the guide.                                         |

## Styling

`speak-friend-react/styles.css` defines the layout and a neutral light and dark theme. Override the custom properties to
match your app: `--sf-surface`, `--sf-ink`, `--sf-line`, `--sf-accent`, `--sf-accent-ink`, `--sf-primary`,
`--sf-primary-ink`, `--sf-primary-edge`, `--sf-done`, `--sf-halo`, `--sf-width`, `--sf-gap`, `--sf-z`.

The ring and the guide keep their borders in Windows high contrast mode, and animation is off with reduced motion.
