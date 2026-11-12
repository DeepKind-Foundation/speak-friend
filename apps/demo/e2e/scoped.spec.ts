import { expect, test, type Page } from "@playwright/test";

const FIXTURE = "http://localhost:4174/";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const open = async (page: Page, tour: string): Promise<void> => {
  await page.goto(FIXTURE);
  await page.waitForFunction(() => typeof window.__start === "function");
  await page.evaluate((id) => void window.__start(id), tour);
};

/** Animations move things; measure when they are done. */
const settled = async (page: Page): Promise<void> => {
  await page.waitForFunction(() => document.getAnimations().length === 0);
  await page.waitForTimeout(700);
};

/** Where an element inside a component is, in window coordinates. */
const inside = (page: Page, host: string, selector: string): Promise<Box> =>
  page.evaluate(
    ([h, s]) => {
      const el = document.querySelector(h!)?.shadowRoot?.querySelector(s!);
      if (!el) throw new Error(`Nothing at ${h} ${s}`);
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    },
    [host, selector],
  );

const ring = (page: Page): Promise<Box> =>
  page.evaluate(() => {
    const r = document.querySelector(".sf-ring")?.getBoundingClientRect();
    if (!r) throw new Error("No ring");
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });

const near = (a: Box, b: Box, tolerance = 2): void => {
  expect(Math.abs(a.left - b.left)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(a.height - b.height)).toBeLessThanOrEqual(tolerance);
};

test("rings the element inside the named component, not the same name elsewhere", async ({ page }) => {
  await open(page, "save");
  await expect(page.getByRole("dialog")).toContainText("Save it");
  await settled(page);
  near(await ring(page), await inside(page, "#card-b", '[data-tour="save"]'));
  // The page element and the first card use the same name, and are far from the second card.
  const decoy = await page.evaluate(() => document.getElementById("page-save")!.getBoundingClientRect().top);
  expect(Math.abs((await ring(page)).top - decoy)).toBeGreaterThan(200);
});

test("scrolls the element into view and keeps the guide clear of it", async ({ page }) => {
  await open(page, "save");
  await settled(page);
  const target = await inside(page, "#card-b", '[data-tour="save"]');
  const viewport = page.viewportSize()!;
  expect(target.top).toBeGreaterThanOrEqual(0);
  expect(target.top + target.height).toBeLessThanOrEqual(viewport.height);
  const guide = await page.getByRole("dialog").boundingBox();
  const overlap =
    Math.max(0, Math.min(guide!.x + guide!.width, target.left + target.width) - Math.max(guide!.x, target.left)) *
    Math.max(0, Math.min(guide!.y + guide!.height, target.top + target.height) - Math.max(guide!.y, target.top));
  expect(overlap).toBe(0);
});

test("a host with display: contents works", async ({ page }) => {
  await open(page, "wrapped");
  await expect(page.getByRole("dialog")).toContainText("Wrapped");
  await settled(page);
  near(await ring(page), await inside(page, "#wrap", '[data-tour="wrapped"]'));
});

test("skips a step whose element inside the component is not visible", async ({ page }) => {
  await open(page, "skip");
  await expect(page.getByRole("dialog")).toContainText("Second");
  await expect(page.getByRole("dialog")).toContainText("Step 1 of 1");
});

test("scrolling only the component's own scroller moves the ring", async ({ page }) => {
  await open(page, "deep");
  await expect(page.getByRole("dialog")).toContainText("Deep");
  await settled(page);
  const before = await ring(page);
  await page.evaluate(() => {
    const box = document.querySelector("#scroller")!.shadowRoot!.querySelector("#box")!;
    box.scrollTop += 24;
  });
  await page.waitForTimeout(300);
  const after = await ring(page);
  near(after, await inside(page, "#scroller", '[data-tour="deep"]'));
  expect(Math.abs(before.top - after.top)).toBeGreaterThanOrEqual(10);
});

test("Escape gives focus back to the button inside the component that started the tour", async ({ page }) => {
  await page.goto(FIXTURE);
  await page.waitForFunction(() => typeof window.__start === "function");
  await page.evaluate(() => document.querySelector("#launcher")!.shadowRoot!.getElementById("launch")!.focus());
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  const focus = await page.evaluate(() => {
    const host = document.querySelector("#launcher")!;
    return { onHost: document.activeElement === host, inner: host.shadowRoot!.activeElement?.id ?? null };
  });
  expect(focus).toEqual({ onHost: true, inner: "launch" });
});

test("says why a closed component cannot be used, and shows no guide", async ({ page }) => {
  await open(page, "closed");
  await page.waitForFunction(() => window.__errors.length > 0);
  const errors = await page.evaluate(() => window.__errors);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain('Step "shut"');
  expect(errors[0]).toContain("no open shadow root");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
