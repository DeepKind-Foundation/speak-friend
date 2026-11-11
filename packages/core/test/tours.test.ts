import { describe, expect, it, vi } from "vitest";
import { createTours, memoryStore, type Tour } from "../src/index";

type Ctx = { roles: string[] };

const step = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  target: id,
  title: `T ${id}`,
  body: `B ${id}`,
  ...extra,
});

const welcome: Tour<Ctx> = {
  id: "welcome",
  version: 1,
  appliesTo: (c) => c.roles.includes("member"),
  chapters: [
    { id: "start", route: "/", steps: [step("card")] },
    {
      id: "tasks",
      route: "/zadania",
      steps: [step("list"), step("submit", { skipIf: (c: Ctx) => c.roles.includes("mentor") })],
    },
  ],
};
const mentorTour: Tour<Ctx> = {
  id: "mentor",
  version: 1,
  appliesTo: (c) => c.roles.includes("mentor"),
  chapters: [{ id: "queue", route: "/mentor", steps: [step("queue")] }],
};

const setup = (roles = ["member"], extra: Record<string, unknown> = {}) => {
  const store = memoryStore();
  const navigate = vi.fn();
  const tours = createTours<Ctx>({ tours: [welcome, mentorTour], store, context: { roles }, navigate, ...extra });
  return { store, navigate, tours };
};

describe("what is offered", () => {
  it("offers the tours that apply to the person's roles", async () => {
    expect((await setup(["member"]).tours.offered()).map((t) => t.id)).toEqual(["welcome"]);
    expect((await setup(["mentor"]).tours.offered()).map((t) => t.id)).toEqual(["mentor"]);
    expect((await setup(["member", "mentor"]).tours.offered()).map((t) => t.id)).toEqual(["welcome", "mentor"]);
  });

  it("stops offering a completed tour and a tour dismissed twice", async () => {
    const { tours, store } = setup();
    await store.set("welcome", { status: "completed", version: 1, chapter: 0, step: 0, dismissals: 0 });
    expect(await tours.offered()).toEqual([]);
    await store.set("welcome", { status: "dismissed", version: 1, chapter: 0, step: 0, dismissals: 1 });
    expect((await tours.offered()).map((t) => t.id)).toEqual(["welcome"]);
    await store.set("welcome", { status: "dismissed", version: 1, chapter: 0, step: 0, dismissals: 2 });
    expect(await tours.offered()).toEqual([]);
  });

  it("offers a completed tour again when its version is raised", async () => {
    const { tours, store } = setup();
    await store.set("welcome", { status: "completed", version: 0, chapter: 0, step: 0, dismissals: 0 });
    expect((await tours.offered()).map((t) => t.id)).toEqual(["welcome"]);
  });

  it("keeps a started tour on offer so it can be continued", async () => {
    const { tours, store } = setup();
    await store.set("welcome", { status: "started", version: 1, chapter: 1, step: 0, dismissals: 0 });
    expect((await tours.offered()).map((t) => t.id)).toEqual(["welcome"]);
  });
});

describe("walking a tour", () => {
  it("goes through the steps and chapters, navigating when the page changes, and completes", async () => {
    const { tours, navigate, store } = setup();
    await tours.start("welcome");
    expect(tours.snapshot()).toMatchObject({ tourId: "welcome", index: 0, total: 3, step: { id: "card" } });
    await tours.next();
    expect(navigate).toHaveBeenCalledWith("/zadania");
    expect(tours.snapshot()).toMatchObject({ index: 1, step: { id: "list" }, chapter: { id: "tasks" } });
    await tours.next();
    expect(tours.snapshot()).toMatchObject({ index: 2, step: { id: "submit" } });
    await tours.next();
    expect(tours.snapshot()).toMatchObject({ tourId: null, status: "idle" });
    expect((await store.get("welcome"))?.status).toBe("completed");
  });

  it("goes back across a chapter boundary", async () => {
    const { tours, navigate } = setup();
    await tours.start("welcome");
    await tours.next();
    await tours.back();
    expect(navigate).toHaveBeenLastCalledWith("/");
    expect(tours.snapshot()).toMatchObject({ index: 0, step: { id: "card" } });
    await tours.back();
    expect(tours.snapshot()).toMatchObject({ index: 0 });
  });

  it("skips a step that the person's context rules out and a step whose target is not on the page", async () => {
    const { tours } = setup(["member", "mentor"], { isAvailable: (s: { id: string }) => s.id !== "list" });
    await tours.start("welcome");
    await tours.next();
    expect(tours.snapshot()).toMatchObject({ tourId: null, status: "idle" });
  });

  it("drops a step whose target is missing from the position and the total", async () => {
    const { tours } = setup(["member"], { isAvailable: (s: { id: string }) => s.id !== "list" });
    await tours.start("welcome");
    expect(tours.snapshot().total).toBe(3);
    await tours.next();
    expect(tours.snapshot()).toMatchObject({ step: { id: "submit" }, index: 1, total: 2 });
    await tours.back();
    expect(tours.snapshot()).toMatchObject({ step: { id: "card" }, index: 0, total: 2 });
  });

  it("counts only the steps that will be shown", async () => {
    const { tours } = setup(["member", "mentor"]);
    await tours.start("welcome");
    expect(tours.snapshot().total).toBe(2);
  });

  it("closing keeps the place, and starting again continues from it", async () => {
    const { tours, store, navigate } = setup();
    await tours.start("welcome");
    await tours.next();
    await tours.close();
    expect(tours.snapshot().status).toBe("idle");
    expect(await store.get("welcome")).toMatchObject({ status: "started", chapter: 1, step: 0 });
    navigate.mockClear();
    await tours.start("welcome");
    expect(tours.snapshot()).toMatchObject({ index: 1, step: { id: "list" } });
    expect(navigate).toHaveBeenCalledWith("/zadania");
  });

  it("restart begins from the first step even after completion", async () => {
    const { tours, store } = setup();
    await store.set("welcome", { status: "completed", version: 1, chapter: 1, step: 1, dismissals: 0 });
    await tours.restart("welcome");
    expect(tours.snapshot()).toMatchObject({ index: 0, step: { id: "card" } });
  });

  it("refuses to start a tour that does not exist", async () => {
    await expect(setup().tours.start("nope")).rejects.toThrow("Unknown tour");
  });
});

describe("dismissing an offer", () => {
  it("counts the dismissal and remembers it", async () => {
    const { tours, store } = setup();
    await tours.dismiss("welcome");
    expect(await store.get("welcome")).toMatchObject({ status: "dismissed", dismissals: 1 });
    await tours.dismiss("welcome");
    expect(await store.get("welcome")).toMatchObject({ dismissals: 2 });
    expect(await tours.offered()).toEqual([]);
  });

  it("allows a different limit", async () => {
    const { tours } = setup(["member"], { maxDismissals: 1 });
    await tours.dismiss("welcome");
    expect(await tours.offered()).toEqual([]);
  });
});

describe("listening", () => {
  it("tells subscribers about every change until they unsubscribe", async () => {
    const { tours } = setup();
    const seen: string[] = [];
    const off = tours.subscribe((s) => seen.push(`${s.status}:${s.index}`));
    await tours.start("welcome");
    await tours.next();
    off();
    await tours.next();
    expect(seen).toEqual(["running:0", "running:1"]);
  });

  it("works without a navigate function", async () => {
    const tours = createTours<Ctx>({ tours: [welcome], store: memoryStore(), context: { roles: ["member"] } });
    await tours.start("welcome");
    await tours.next();
    expect(tours.snapshot().step?.id).toBe("list");
  });
});
