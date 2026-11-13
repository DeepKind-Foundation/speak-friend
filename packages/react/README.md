# speak-friend-react

Accessible product tours for React: a docked, keyboard-first tour guide with a highlight ring, built on [`speak-friend`](../core). Screen reader friendly, and it leaves the page usable. It does not dim it unless you ask. Demo and workbench: https://speak-friend.dont-mind-ai.com/

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
- A ring marks the target. The page stays usable.
- `dim` is off by default. Turn it on and the page around the ring gets a light tint. It is only a tint: clicks, focus and the keyboard are not affected and nothing is made inert. It is left out when the person asks for more contrast (`prefers-contrast: more`) or less transparency (`prefers-reduced-transparency`), and in forced-colors mode, where the ring remains. Change the strength with `--sf-dim`.
- The guide is non-modal: it is a `role="dialog"` without `aria-modal`, nothing traps focus, and Tab leaves it after its last button and continues into the page.
- `theme` overrides the system setting in both directions: `theme="dark"` stays dark on a light system and `theme="light"` stays light on a dark one.
- Focus moves to the step title on every step, and the title is described by "Step N of M", so both are read together. `announce="live"` keeps focus and announces the step instead.
- One polite live region stays in the page for as long as the guide is mounted, empty until something is said, so what goes into it is announced as a change. It carries the step (with `announce="live"`), the waiting hint, and `labels.ended` when the tour ends, whatever the reason. Nothing is announced at the end without `labels.ended`.
- Every way a tour can end (Escape, the close button, finishing, `close()` from your code, the last targets disappearing, the guide unmounting) returns focus to where it was. Starting again resumes from the same step. If that element is no longer on the page, focus goes to `fallbackFocus`, then the first `h1`, then `main`.
- A step whose target is not on the page is skipped and leaves the count.
- A target larger than the window is scrolled to its top and ringed where it can be seen. The ring is clipped to the window, with room for its outline, and is not drawn while none of the target is on screen. Small targets work best on phones, where the guide covers the lower part of the screen.
- While the guide is open, `scroll-padding-bottom` and extra padding at the end of the page keep focused elements clear of it, including the last ones on the page.
- A page that opens a modal `<dialog>` with `showModal()` makes everything outside it unreachable, the guide included. Pass `container={() => document.querySelector("dialog[open]")}` and the guide and ring mount inside it. A page that only sets `inert` on its own root is fine: the guide sits next to the root.
- A target name can be used on more than one page. After `navigate`, an element that was already on the page counts as the target only once the page has stopped changing for 300 ms; a new element counts at once. So the old page's copy is not taken for the new page's, and an element that really stays, such as a header, is found after a short pause. If your route takes longer to render than that, make `navigate` return a promise that resolves when the new page is on screen.
- While the next step takes a moment (100 ms or more), the guide stays on the current step, is marked `aria-busy`, and shows `labels.waiting` in a live region if you gave one. The same goes for the first step: if its target is not on the page yet, a small panel with `labels.waiting` and a Close button appears after 100 ms, Escape closes it, and it gives way to the guide when the step arrives. Without `labels.waiting` nothing is shown until then.
- The guide keeps clear of the element it points at. Once the page has scrolled to it, a guide that would cover it moves to the other side, then to the top edge; if nothing is clear it stays where you put it. The ring follows the element on every layout change.

## Targets inside web components and iframes

A step finds its target with `document.querySelector`, which cannot see inside a web component's shadow tree or an iframe. Name the host with `within` on the step and only that host is searched, through its open shadow tree or, for an iframe, its document:

```ts
{ id: "play", target: "play", within: "#player", title: "Play", body: "Starts the recording." }
```

`within` is a CSS selector for the host element, or a list of them for hosts inside hosts (`["#app", "#player"]`: each is looked up inside the one before, and the list can mix components and iframes). It is on purpose never a page-wide search: shadow trees exist so that names cannot clash, and a search across all of them could ring the wrong element without any error. A step without `within` behaves exactly as before.

- The host needs no box of its own, so `display: contents` wrappers work. The target must be visible.
- A closed shadow root cannot be entered. The step is skipped and `onError` is called once with the step id and the selector. A component that has not rendered yet is waited for, up to the step's timeout.
- Focus given back at the end of a tour goes to the inner element when the tour was started from inside a component, once any step uses `within`.
- An element that is slotted into a component from the page is in the page, so a step finds it without `within`.
- `Ring` takes the same `within` prop.
- An iframe works when its document is from the same origin. The ring and the guide's placement account for the frame's position, border, padding and scaling, also for frames inside frames. A frame from another origin, or one that has not loaded, cannot be read: the step is skipped and `onError` says so. Escape also closes the tour while focus is inside a frame the step looks into, and focus given back at the end goes into the frame when the tour was started from inside it.
- A tour that runs inside an iframe and points at the page around it is not supported.

## Reading progress

`useTourProgress(tourId)` returns the saved progress the engine last read or wrote, or `null`, and re-renders when it changes. Call `offered()` once when the page opens to load it. Until it has, `null` does not mean the person has not started: `useTourProgressLoaded(tourId)` is `false` until the store has answered (even if it failed), so show nothing or a neutral button instead of flashing "Start" and then "Continue".

```tsx
const tours = useTours();
const progress = useTourProgress("welcome");
const loaded = useTourProgressLoaded("welcome");
useEffect(() => void tours.offered(), [tours]);
if (!loaded) return null;
return <button onClick={() => tours.start("welcome")}>{progress?.status === "started" ? "Continue" : "Start"}</button>;
```

If the store cannot be read or saved, the tour still runs and `onError` is called. For `localStorage` use `webStorageStore()` from `speak-friend`, which keeps progress in memory when the browser refuses to store it.

## Props of `TourProvider`

`tours`, `store`, `context`, `navigate` and `maxDismissals` are passed to the engine. Two more:

| Prop            | Default         | Description                                                                                     |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `targetTimeout` | `1500`          | Milliseconds to wait for a step's target before skipping the step. A step's own `timeout` wins. |
| `onError`       | `console.error` | Called when a step change fails or the store cannot be read or saved.                           |

## Props of `TourGuide`

| Prop            | Default  | Description                                                                                                        |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `labels`        | required | Every string: `counter`, `back`, `next`, `finish`, `close`, and optionally `waiting`.                              |
| `position`      | `end`    | `start` or `end`.                                                                                                  |
| `theme`         |          | `light` or `dark` forces a theme. Default: follows the OS.                                                         |
| `headingLevel`  | `2`      | Heading level of the step title.                                                                                   |
| `announce`      | `focus`  | `focus` or `live`.                                                                                                 |
| `closeOnEscape` | `true`   |                                                                                                                    |
| `fallbackFocus` |          | Where focus goes when the tour ends and the element that started it is gone. Default: the first `h1`, then `main`. |
| `container`     |          | Function returning the element the guide and ring mount in, for example an open modal `<dialog>`. Default `body`.  |
| `dim`           | `false`  | Tint the page around the ring. Never blocks the page.                                                              |
| `className`     |          | Added to the guide.                                                                                                |

## Styling

`speak-friend-react/styles.css` defines the layout and a neutral light and dark theme. Override the custom properties to
match your app: `--sf-surface`, `--sf-ink`, `--sf-line`, `--sf-accent`, `--sf-accent-ink`, `--sf-primary`,
`--sf-primary-ink`, `--sf-primary-edge`, `--sf-done`, `--sf-halo`, `--sf-width`, `--sf-gap`, `--sf-z`.

The colour properties (`--sf-surface` to `--sf-halo`) are defined on `.sf-guide` and `.sf-ring` themselves, so override them with those selectors, after the stylesheet. Setting them on `:root` or another ancestor has no effect. `--sf-width`, `--sf-gap` and `--sf-z` are only read, so they can be set anywhere.

```css
.sf-guide,
.sf-ring {
  --sf-accent: oklch(48% 0.14 45);
  --sf-primary: oklch(86% 0.14 75);
}
```

The ring and the guide keep their borders in Windows high contrast mode, and animation is off with reduced motion.
