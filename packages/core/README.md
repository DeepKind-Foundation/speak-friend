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
- A step's optional `within` names the web component (a selector, or a list for components inside components) whose open shadow tree holds the target. The engine only carries it; `speak-friend-react` does the search.
- Steps can be omitted per user (`skipIf`) or when their target is not on the page (`isAvailable`).
- `isAvailable(step, { navigated })` tells you when `navigate` was just called for the step's page, so the page on screen may still be the previous one. `speak-friend-react` uses it to avoid taking the old page's element for the new page's target. If you can, make `navigate` resolve once the new page has rendered.
- `snapshot().waiting` is `true` when the next step has not been shown for 100 ms, because the page is changing or the target has not appeared. The step on screen stays until the next one is ready; when it is the first step, `status` is `running` and `step` is `null` until it is. In React the guide uses it; with your own UI you can show a waiting hint.
- Resuming looks for the saved step by its id first, then by its saved position, so adding or removing steps does not move the person. Anything that comes back from the store and is not progress is ignored.
- A store that throws does not stop a tour: `onError` is called and the tour runs without persistence. `webStorageStore()` keeps progress in `localStorage` and falls back to memory for the session when the browser refuses.
- `progressLoaded(tourId)` is `false` until the store has been asked (`offered()`, `start()` or `dismiss()`), so a button can wait instead of showing "Start" and then "Continue".
- The library has no text of its own; the app supplies every string.

Licence: MIT.
