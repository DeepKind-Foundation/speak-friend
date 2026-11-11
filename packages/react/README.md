# speak-friend-react

Accessible product tours for React: a docked, keyboard-first tour guide with a highlight ring, built on [`speak-friend`](../core). Screen reader friendly, and it never dims the page. Demo and workbench: https://speak-friend.dont-mind-ai.com/

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
- Escape closes the tour and returns focus to where it was. Starting again resumes from the same step. If that element is no longer on the page, focus goes to `fallbackFocus`, then the first `h1`, then `main`.
- A step whose target is not on the page is skipped and leaves the count.
- While the guide is open, `scroll-padding-bottom` keeps focused elements clear of it.
- Name a target once per page. A name used on two pages can match the old page's element while the route changes, so a step can be shown before the new page has rendered. The ring looks its target up again on every layout change, so it follows the new element when one with that name appears.

## Props of `TourProvider`

`tours`, `store`, `context`, `navigate` and `maxDismissals` are passed to the engine. Two more:

| Prop            | Default         | Description                                                          |
| --------------- | --------------- | -------------------------------------------------------------------- |
| `targetTimeout` | `1500`          | Milliseconds to wait for a step's target before skipping the step.   |
| `onError`       | `console.error` | Called when a step change fails, for example when the store rejects. |

## Props of `TourGuide`

| Prop            | Default  | Description                                                                                                        |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `labels`        | required | Every string: `counter`, `back`, `next`, `finish`, `close`.                                                        |
| `position`      | `end`    | `start` or `end`.                                                                                                  |
| `theme`         |          | `light` or `dark` forces a theme. Default: follows the OS.                                                         |
| `headingLevel`  | `2`      | Heading level of the step title.                                                                                   |
| `announce`      | `focus`  | `focus` or `live`.                                                                                                 |
| `closeOnEscape` | `true`   |                                                                                                                    |
| `fallbackFocus` |          | Where focus goes when the tour ends and the element that started it is gone. Default: the first `h1`, then `main`. |
| `className`     |          | Added to the guide.                                                                                                |

## Styling

`speak-friend-react/styles.css` defines the layout and a neutral light and dark theme. Override the custom properties to
match your app: `--sf-surface`, `--sf-ink`, `--sf-line`, `--sf-accent`, `--sf-accent-ink`, `--sf-primary`,
`--sf-primary-ink`, `--sf-primary-edge`, `--sf-done`, `--sf-halo`, `--sf-width`, `--sf-gap`, `--sf-z`.

The ring and the guide keep their borders in Windows high contrast mode, and animation is off with reduced motion.
