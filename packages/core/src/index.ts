/** Popover position relative to the target. Logical sides, so right-to-left layouts mirror. */
export type Placement = "top" | "bottom" | "start" | "end" | "auto";

export interface Step<C = unknown> {
  id: string;
  /** Value of the target element's `data-tour` attribute. */
  target: string;
  /**
   * Where to look when the target is inside a web component or an iframe: a CSS selector for the host element, or a
   * path of selectors from the page inward for hosts inside hosts. Only that host's open shadow tree, or the
   * same-origin document of that iframe, is searched, so a name used elsewhere on the page is never matched by
   * mistake. Without it the page is searched.
   * `speak-friend-react` uses it; the engine only carries it.
   */
  within?: string | readonly string[];
  title: string;
  body: string;
  placement?: Placement;
  /** Leaves the step out for this context. */
  skipIf?: (context: C) => boolean;
  /**
   * How long to wait for the target to appear, in ms, before the step is skipped. Used by `speak-friend-react`, where
   * it overrides the provider's `targetTimeout`; a custom `isAvailable` decides for itself.
   */
  timeout?: number;
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
  /** The id of the step that was shown. Resuming looks for it first, so edits to the tour do not move the person. */
  stepId?: string;
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
  /**
   * True while a tour is running and the step it was asked to move to has not been shown for a noticeable moment
   * (100 ms), because the page is still changing or the target has not appeared. `step` is still the one on screen,
   * or `null` when it is the first step being waited for: the snapshot is then `running` with no step yet.
   */
  waiting: boolean;
}

/** What the engine knows about the moment a step is checked. */
export interface AvailabilityInfo {
  navigated: boolean;
}

export interface Options<C> {
  tours: Tour<C>[];
  store: ProgressStore;
  context: C;
  /** Called when the next step is on a different page. */
  navigate?: (route: string) => void | Promise<void>;
  /**
   * Whether the target is on the page; unavailable steps are skipped. May wait for rendering. `navigated` is true
   * when `navigate` was just called for this step's page, so the page on screen may still be the previous one.
   */
  isAvailable?: (step: Step<C>, info: AvailabilityInfo) => boolean | Promise<boolean>;
  /** Dismissals after which a tour is no longer offered. Default 2. */
  maxDismissals?: number;
  /**
   * Called when the store fails to read or save. The tour carries on without persistence: a store that is blocked or
   * full must not stop anyone from seeing the tour.
   */
  onError?: (error: unknown) => void;
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
  /**
   * What the engine last read from or wrote to the store for a tour, so a button can say "Continue" without waiting
   * for the store. It is null until `offered()`, `start()` or `dismiss()` has run, and for progress that belongs to an
   * older version of the tour. It is a per-engine view: it does not follow changes made elsewhere, such as another tab.
   * The same object is returned until the progress changes.
   */
  progress(tourId: string): Progress | null;
  /**
   * Whether the store has been asked about this tour, by `offered()`, `start()` or `dismiss()`, even if it failed. Until
   * then `progress()` returning null does not mean the person has not started, so wait before showing "Start".
   */
  progressLoaded(tourId: string): boolean;
  /** Calls the listener whenever `progress()` or `progressLoaded()` may return something different. */
  subscribeProgress(listener: () => void): () => void;
}

/** In-memory store, for tests and demos. */
export function memoryStore(initial: Record<string, Progress> = {}): ProgressStore {
  const data = new Map(Object.entries(initial));
  return {
    get: async (id) => data.get(id) ?? null,
    set: async (id, progress) => void data.set(id, { ...progress }),
  };
}

const STATUSES: readonly string[] = ["started", "completed", "dismissed"];

/** Whether what came back from a store has the shape of progress; anything else is treated as nothing saved. */
function validProgress(value: unknown): Progress | null {
  if (typeof value !== "object" || value === null) return null;
  const p = value as Record<string, unknown>;
  const numbers = [p.version, p.chapter, p.step, p.dismissals];
  if (typeof p.status !== "string" || !STATUSES.includes(p.status)) return null;
  if (!numbers.every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  if (p.stepId !== undefined && typeof p.stepId !== "string") return null;
  return value as Progress;
}

/** The part of the browser's `Storage` that is used. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Keeps progress in `localStorage` (or any `Storage`). When the browser refuses, because storage is blocked, full or
 * missing, it keeps the progress in memory for the session instead of failing. Text that is not progress is ignored.
 */
export function webStorageStore(options: { storage?: StorageLike; prefix?: string } = {}): ProgressStore {
  const prefix = options.prefix ?? "speak-friend:";
  const memory = memoryStore();
  const storage = (): StorageLike | null => {
    try {
      return options.storage ?? (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
    } catch {
      return null;
    }
  };
  return {
    async get(id) {
      try {
        const raw = storage()?.getItem(prefix + id);
        if (raw) return validProgress(JSON.parse(raw));
      } catch {
        // Blocked or not JSON: fall through to what this session kept.
      }
      return memory.get(id);
    },
    async set(id, progress) {
      await memory.set(id, progress);
      try {
        storage()?.setItem(prefix + id, JSON.stringify(progress));
      } catch {
        // Kept in memory above.
      }
    },
  };
}

type Place<C> = { chapterIndex: number; stepIndex: number; chapter: Chapter<C>; step: Step<C> };

/** How long a step change may take before the snapshot says it is waiting, so quick changes do not flash. */
const WAITING_AFTER = 100;

const IDLE = { status: "idle", tourId: null, chapter: null, step: null, index: 0, total: 0, waiting: false } as const;

export function createTours<C>(options: Options<C>): Tours<C> {
  const { tours, store, context, navigate, isAvailable, maxDismissals = 2, onError } = options;
  const listeners = new Set<(s: Snapshot<C>) => void>();
  const known: Record<string, Progress> = {};
  const progressListeners = new Set<() => void>();
  const loaded = new Set<string>();
  // Set when progress() or progressLoaded() may answer differently; flush() tells the listeners once per operation.
  let dirty = false;
  const flush = () => {
    if (!dirty) return;
    dirty = false;
    for (const l of [...progressListeners]) l();
  };
  let current: Snapshot<C> = { ...IDLE };
  let places: Place<C>[] = [];
  let tour: Tour<C> | null = null;
  // Bumped whenever a run is replaced or closed, so work still awaiting the store, the router or the page is dropped.
  let epoch = 0;
  let queue: Promise<unknown> = Promise.resolve();
  let shown = false;

  /** Runs one step change after the ones before it, unless the tour was closed or restarted in the meantime. */
  const enqueue = (fn: (run: number) => Promise<void>): Promise<void> => {
    const run = epoch;
    const result = queue.then(() => (run === epoch ? fn(run) : undefined));
    queue = result.catch(() => undefined);
    return result;
  };

  const publish = (next: Snapshot<C>) => {
    current = next;
    for (const l of [...listeners]) l(current);
  };

  /** Keeps what the store holds for a tour, and tells the listeners when it is different from what was kept. */
  const remember = (id: string, progress: Progress | null) => {
    const old = known[id];
    if (
      !progress ||
      (old &&
        old.status === progress.status &&
        old.version === progress.version &&
        old.chapter === progress.chapter &&
        old.step === progress.step &&
        old.dismissals === progress.dismissals)
    )
      return;
    known[id] = progress;
    dirty = true;
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

  /** Asks the store. A failure is reported and counts as nothing saved, so the tour still works without it. */
  const read = async (id: string): Promise<Progress | null> => {
    let progress: Progress | null = null;
    try {
      progress = validProgress(await store.get(id));
    } catch (error) {
      onError?.(error);
    }
    if (!loaded.has(id)) {
      loaded.add(id);
      dirty = true;
    }
    return progress;
  };

  const save = async (t: Tour<C>, patch: Partial<Progress> & Pick<Progress, "status">, old: Progress | null) => {
    const progress: Progress = { version: t.version, chapter: 0, step: 0, dismissals: old?.dismissals ?? 0, ...patch };
    try {
      await store.set(t.id, progress);
    } catch (error) {
      onError?.(error);
    }
    remember(t.id, progress);
    flush();
  };

  /** Shows the first available step from `from` in `direction`, or finishes the tour. */
  async function show(from: number, direction: 1 | -1, run: number): Promise<void> {
    if (!tour || run !== epoch) return;
    let i = from;
    while (i >= 0 && i < places.length) {
      const place = places[i]!;
      // The step on screen stays until the next one is ready; if that takes a while, say so.
      const notice = setTimeout(() => {
        if (run !== epoch || !tour || current.waiting) return;
        // Before the first step there is nothing on screen yet: the snapshot is running with no step.
        publish({ ...current, status: "running", tourId: tour.id, total: places.length, waiting: true });
      }, WAITING_AFTER);
      const navigated = current.chapter?.id !== place.chapter.id;
      let available: boolean;
      try {
        if (navigated) await navigate?.(place.chapter.route);
        available = run === epoch && (!isAvailable || (await isAvailable(place.step, { navigated })));
      } finally {
        clearTimeout(notice);
      }
      if (run !== epoch) return;
      if (available) {
        shown = true;
        publish({
          status: "running",
          tourId: tour.id,
          chapter: place.chapter,
          step: place.step,
          index: i,
          total: places.length,
          waiting: false,
        });
        await save(
          tour,
          { status: "started", chapter: place.chapterIndex, step: place.stepIndex, stepId: place.step.id },
          await read(tour.id),
        );
        return;
      }
      // Not on the page: drop it from the count, so the position and the total stay honest.
      places.splice(i, 1);
      if (direction === -1) i -= 1;
    }
    if (direction === 1) await finish(run);
    else if (places.length) await show(0, 1, run);
  }

  async function finish(run: number): Promise<void> {
    if (!tour || run !== epoch) return;
    const t = tour;
    // Nothing was ever on the page: end quietly instead of recording a tour nobody saw as completed.
    if (!shown) {
      tour = null;
      places = [];
      publish({ ...IDLE });
      return;
    }
    await save(
      t,
      { status: "completed", chapter: places.at(-1)?.chapterIndex ?? 0, step: places.at(-1)?.stepIndex ?? 0 },
      await read(t.id),
    );
    tour = null;
    places = [];
    publish({ ...IDLE });
  }

  async function begin(id: string, resume: boolean): Promise<void> {
    const t = find(id);
    const run = ++epoch;
    shown = false;
    const progress = await read(id);
    remember(id, progress);
    flush();
    if (run !== epoch) return;
    tour = t;
    places = placesOf(t);
    current = { ...IDLE };
    let from = 0;
    if (resume && progress?.status === "started" && progress.version === t.version) {
      const byId = progress.stepId === undefined ? -1 : places.findIndex((p) => p.step.id === progress.stepId);
      const saved =
        byId !== -1
          ? byId
          : places.findIndex(
              (p) =>
                p.chapterIndex > progress.chapter ||
                (p.chapterIndex === progress.chapter && p.stepIndex >= progress.step),
            );
      from = saved === -1 ? 0 : saved;
    }
    await show(from, 1, run);
  }

  return {
    async offered() {
      const out: Tour<C>[] = [];
      for (const t of tours) {
        if (t.appliesTo && !t.appliesTo(context)) continue;
        const p = await read(t.id);
        remember(t.id, p);
        const current = p !== null && p.version >= t.version;
        if (current && p.status === "completed") continue;
        if (current && p.status === "dismissed" && p.dismissals >= maxDismissals) continue;
        out.push(t);
      }
      flush();
      return out;
    },
    start: (id) => begin(id, true),
    restart: (id) => begin(id, false),
    next: () => enqueue(async (run) => (current.step ? show(current.index + 1, 1, run) : undefined)),
    back: () =>
      enqueue(async (run) => (current.step && current.index > 0 ? show(current.index - 1, -1, run) : undefined)),
    async close() {
      epoch++;
      tour = null;
      places = [];
      if (current.status === "running") publish({ ...IDLE });
    },
    async dismiss(id) {
      const t = find(id);
      const old = await read(id);
      await save(t, { status: "dismissed", dismissals: (old?.version === t.version ? old.dismissals : 0) + 1 }, null);
    },
    snapshot: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    progress(id) {
      const p = known[id];
      const t = tours.find((x) => x.id === id);
      return p && t && p.version >= t.version ? p : null;
    },
    progressLoaded: (id) => loaded.has(id),
    subscribeProgress(listener) {
      progressListeners.add(listener);
      return () => void progressListeners.delete(listener);
    },
  };
}
