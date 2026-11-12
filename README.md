# Speak, Friend

A small React library for accessible product tours and onboarding walkthroughs: a headless engine and a docked guide that leaves the page usable and does not dim it unless you ask. Keyboard first, screen reader friendly, reduced motion respected, and the library has no text of its own.

Demo and workbench: https://speak-friend.dont-mind-ai.com/

```bash
pnpm add speak-friend speak-friend-react
```

Roles decide who is offered a tour, and progress is saved wherever you keep it.

Status: early. The engine and the React guide are working.

## Packages

| Package                                | Description                                                        | State   |
| -------------------------------------- | ------------------------------------------------------------------ | ------- |
| [`speak-friend`](packages/core)        | Engine: tours, chapters, steps, roles, progress. No DOM, no React. | working |
| [`speak-friend-react`](packages/react) | Provider, docked guide and highlight ring for React 18+.           | working |

## Usage

```ts
import { createTours, memoryStore } from "speak-friend";

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
- `isAvailable(step, { navigated })` tells you when `navigate` was just called for the step's page, so the page on screen may still be the previous one. `speak-friend-react` uses it to avoid taking the old page's element for the new page's target. If you can, make `navigate` resolve once the new page has rendered.
- `snapshot().waiting` is `true` when the next step has not been shown for 100 ms, because the page is changing or the target has not appeared. The step on screen stays until the next one is ready. In React the guide uses it; with your own UI you can show a waiting hint.
- A step can set its own `timeout` in milliseconds, to wait less for a target that may be absent.
- `progress(tourId)` returns what the engine last read from or wrote to the store, so a button can say "Continue" without waiting for the store. It is `null` until `offered()`, `start()` or `dismiss()` has run, and for progress of an older version of the tour. It does not follow changes made elsewhere, such as in another tab. `subscribeProgress` tells you when it changes; in React use `useTourProgress`.

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

`pnpm install` registers [lefthook](https://github.com/evilmartians/lefthook) git hooks. On commit they format and lint the staged files and run the type check; on push they run the tests. CI runs the same commit hooks on every file and fails if they change anything.

## Demo

The demo site is at https://speak-friend.dont-mind-ai.com/. Its source is `apps/demo`, which runs the workspace packages, so build them first to run it locally.

```bash
pnpm build
pnpm --filter speak-friend-demo dev
```

## Licence

MIT

## Releasing

1. Set the new version in `packages/*/package.json` and merge it to `main`.
2. Tag it: `git tag v0.1.0-alpha.2 && git push origin v0.1.0-alpha.2`.
3. Approve the staged packages on npmjs.com (Staged Packages tab) or with `npm stage approve <stage-id>`. Approval asks for 2FA.

The release workflow checks that the tag matches both packages, runs the CI checks, stages both packages with provenance (tagged `latest`, prereleases included) and creates a GitHub release. Nothing is installable until step 3.
