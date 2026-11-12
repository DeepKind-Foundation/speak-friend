# speak-friend

Headless engine for accessible product tours and onboarding walkthroughs: tours, chapters, steps, roles and progress. No
DOM, no React. For React see [`speak-friend-react`](https://www.npmjs.com/package/speak-friend-react). Demo: https://speak-friend.dont-mind-ai.com/

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
- `snapshot().waiting` is `true` when the next step has not been shown for 100 ms, because the page is changing or the target has not appeared. The step on screen stays until the next one is ready; when it is the first step, `status` is `running` and `step` is `null` until it is. In React the guide uses it; with your own UI you can show a waiting hint.
- The library has no text of its own; the app supplies every string.

Licence: MIT.
