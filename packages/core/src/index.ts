/** Popover position relative to the target. Logical sides, so right-to-left layouts mirror. */
export type Placement = "top" | "bottom" | "start" | "end" | "auto";

export interface Step<C = unknown> {
  id: string;
  /** Value of the target element's `data-tour` attribute. */
  target: string;
  title: string;
  body: string;
  placement?: Placement;
  /** Leaves the step out for this context. */
  skipIf?: (context: C) => boolean;
}

export interface Chapter<C = unknown> {
  id: string;
  /** Page the steps are on. */
  route: string;
  steps: Step<C>[];
}

export interface Tour<C = unknown> {
  id: string;
  /** Raising it offers the tour again to people who finished an older version. */
  version: number;
  /** Who the tour is for; everyone when omitted. */
  appliesTo?: (context: C) => boolean;
  chapters: Chapter<C>[];
}

export type ProgressStatus = "started" | "completed" | "dismissed";

/** Stored per user and tour. */
export interface Progress {
  status: ProgressStatus;
  version: number;
  chapter: number;
  step: number;
  /** Number of times the offer was dismissed. */
  dismissals: number;
}

/** Persistence for progress. */
export interface ProgressStore {
  get(tourId: string): Promise<Progress | null>;
  set(tourId: string, progress: Progress): Promise<void>;
}

export interface Snapshot<C = unknown> {
  status: "idle" | "running";
  tourId: string | null;
  chapter: Chapter<C> | null;
  step: Step<C> | null;
  /** Zero-based position among the steps that will be shown. */
  index: number;
  /** Number of steps that will be shown. */
  total: number;
}

export interface Options<C> {
  tours: Tour<C>[];
  store: ProgressStore;
  context: C;
  /** Called when the next step is on a different page. */
  navigate?: (route: string) => void | Promise<void>;
  /** Whether the target is on the page; unavailable steps are skipped. May wait for rendering. */
  isAvailable?: (step: Step<C>) => boolean | Promise<boolean>;
  /** Dismissals after which a tour is no longer offered. Default 2. */
  maxDismissals?: number;
}

export interface Tours<C> {
  offered(): Promise<Tour<C>[]>;
  start(tourId: string): Promise<void>;
  restart(tourId: string): Promise<void>;
  next(): Promise<void>;
  back(): Promise<void>;
  /** Stops the running tour; starting it again resumes from the same step. */
  close(): Promise<void>;
  /** Records a dismissal of the offer. */
  dismiss(tourId: string): Promise<void>;
  snapshot(): Snapshot<C>;
  subscribe(listener: (snapshot: Snapshot<C>) => void): () => void;
}

/** In-memory store, for tests and demos. */
export function memoryStore(initial: Record<string, Progress> = {}): ProgressStore {
  const data = new Map(Object.entries(initial));
  return {
    get: async (id) => data.get(id) ?? null,
    set: async (id, progress) => void data.set(id, { ...progress }),
  };
}

type Place<C> = { chapterIndex: number; stepIndex: number; chapter: Chapter<C>; step: Step<C> };

const IDLE = { status: "idle", tourId: null, chapter: null, step: null, index: 0, total: 0 } as const;

export function createTours<C>(options: Options<C>): Tours<C> {
  const { tours, store, context, navigate, isAvailable, maxDismissals = 2 } = options;
  const listeners = new Set<(s: Snapshot<C>) => void>();
  let current: Snapshot<C> = { ...IDLE };
  let places: Place<C>[] = [];
  let tour: Tour<C> | null = null;

  const publish = (next: Snapshot<C>) => {
    current = next;
    for (const l of [...listeners]) l(current);
  };

  const find = (id: string): Tour<C> => {
    const t = tours.find((x) => x.id === id);
    if (!t) throw new Error(`Unknown tour: ${id}`);
    return t;
  };

  const placesOf = (t: Tour<C>): Place<C>[] =>
    t.chapters.flatMap((chapter, chapterIndex) =>
      chapter.steps
        .map((step, stepIndex) => ({ chapterIndex, stepIndex, chapter, step }))
        .filter((p) => !p.step.skipIf?.(context)),
    );

  const save = (t: Tour<C>, patch: Partial<Progress> & Pick<Progress, "status">, old: Progress | null) =>
    store.set(t.id, { version: t.version, chapter: 0, step: 0, dismissals: old?.dismissals ?? 0, ...patch });

  /** Shows the first available step from `from` in `direction`, or finishes the tour. */
  async function show(from: number, direction: 1 | -1) {
    if (!tour) return;
    let i = from;
    while (i >= 0 && i < places.length) {
      const place = places[i]!;
      const previous = current.chapter;
      if (previous?.id !== place.chapter.id) await navigate?.(place.chapter.route);
      if (!isAvailable || (await isAvailable(place.step))) {
        publish({
          status: "running",
          tourId: tour.id,
          chapter: place.chapter,
          step: place.step,
          index: i,
          total: places.length,
        });
        await save(
          tour,
          { status: "started", chapter: place.chapterIndex, step: place.stepIndex },
          await store.get(tour.id),
        );
        return;
      }
      // Not on the page: drop it from the count, so the position and the total stay honest.
      places.splice(i, 1);
      if (direction === -1) i -= 1;
    }
    if (direction === 1) await finish();
    else if (places.length) await show(0, 1);
  }

  async function finish() {
    if (!tour) return;
    const t = tour;
    await save(
      t,
      { status: "completed", chapter: places.at(-1)?.chapterIndex ?? 0, step: places.at(-1)?.stepIndex ?? 0 },
      await store.get(t.id),
    );
    tour = null;
    places = [];
    publish({ ...IDLE });
  }

  async function begin(id: string, resume: boolean) {
    const t = find(id);
    const progress = await store.get(id);
    tour = t;
    places = placesOf(t);
    current = { ...IDLE };
    let from = 0;
    if (resume && progress?.status === "started" && progress.version === t.version) {
      const saved = places.findIndex(
        (p) =>
          p.chapterIndex > progress.chapter || (p.chapterIndex === progress.chapter && p.stepIndex >= progress.step),
      );
      from = saved === -1 ? 0 : saved;
    }
    await show(from, 1);
  }

  return {
    async offered() {
      const out: Tour<C>[] = [];
      for (const t of tours) {
        if (t.appliesTo && !t.appliesTo(context)) continue;
        const p = await store.get(t.id);
        const current = p !== null && p.version >= t.version;
        if (current && p.status === "completed") continue;
        if (current && p.status === "dismissed" && p.dismissals >= maxDismissals) continue;
        out.push(t);
      }
      return out;
    },
    start: (id) => begin(id, true),
    restart: (id) => begin(id, false),
    next: async () => {
      if (current.status === "running") await show(current.index + 1, 1);
    },
    back: async () => {
      if (current.status === "running" && current.index > 0) await show(current.index - 1, -1);
    },
    async close() {
      if (current.status !== "running") return;
      tour = null;
      places = [];
      publish({ ...IDLE });
    },
    async dismiss(id) {
      const t = find(id);
      const old = await store.get(id);
      await save(t, { status: "dismissed", dismissals: (old?.version === t.version ? old.dismissals : 0) + 1 }, null);
    },
    snapshot: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
