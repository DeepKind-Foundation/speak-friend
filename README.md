# Don't Panic

Accessible page tours for React: a small headless engine, role-aware and resumable, with progress stored wherever you like.

Built with a focus on accessibility: keyboard support, screen readers, reduced motion.

Status: early. The engine and the React guide are working.

## Packages

| Package                              | Description                                                        | State           |
| ------------------------------------ | ------------------------------------------------------------------ | --------------- |
| [`dont-panic`](packages/core)        | Engine: tours, chapters, steps, roles, progress. No DOM, no React. | working         |
| [`dont-panic-react`](packages/react) | Provider, popover and highlight for React 18+.                     | not implemented |

## Usage

```ts
import { createTours, memoryStore } from "dont-panic";

const tours = createTours({
  tours: [
    {
      id: "welcome",
      version: 1,
      appliesTo: (c) => c.roles.includes("member"),
      chapters: [
        { id: "start", route: "/", steps: [{ id: "card", target: "next-step", title: "Next step", body: "..." }] },
        { id: "tasks", route: "/tasks", steps: [{ id: "list", target: "task-list", title: "Tasks", body: "..." }] },
      ],
    },
  ],
  store: memoryStore(), // replace with a database table, localStorage, ...
  context: { roles: ["member"] },
  navigate: (route) => router.push(route),
});

await tours.offered(); // tours to offer now
await tours.start("welcome"); // starts, or resumes where the user stopped
await tours.next();
tours.subscribe((state) => render(state)); // current step, position, total
```

- Closing a tour keeps its position; starting it again resumes.
- A tour dismissed twice (configurable) is no longer offered.
- Raising a tour's `version` offers it again to users who finished an older one.
- Steps can be omitted per user (`skipIf`) or when their target is not on the page (`isAvailable`).

## Languages

The library contains no user-facing text. Titles, bodies, button labels and the step counter all come from the app, in any
language; the counter is built from `snapshot.index` and `snapshot.total`. Placement uses logical sides (`start`,
`end`) so right-to-left layouts mirror, and layouts must tolerate text that is much longer than English.

## Accessibility

The UI packages follow these rules:

- Non-modal popover: `role="dialog"`, no `aria-modal`, labelled by the step title, closes on Escape, Tab can leave it.
- Focus moves to the popover on open and returns on close.
- Step changes are announced through a polite live region.
- No timers; no animation with `prefers-reduced-motion`.
- The popover does not cover the focused element (WCAG 2.4.11).

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
```

## Licence

MIT
