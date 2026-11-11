# dont-panic

Headless engine for page tours: tours, chapters, steps, roles and progress. No DOM, no React. Built with a focus on
accessibility; for React see [`dont-panic-react`](https://www.npmjs.com/package/dont-panic-react).

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
- The library has no text of its own; the app supplies every string.

Licence: MIT.
