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

const ring = (page: Page): Promise<Box> =>
  page.evaluate(() => {
    const r = document.querySelector(".sf-ring")?.getBoundingClientRect();
    if (!r) throw new Error("No ring");
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  });

const near = (a: Box, b: Box, tolerance = 3): void => {
  expect(Math.abs(a.left - b.left)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(a.top - b.top)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(a.height - b.height)).toBeLessThanOrEqual(tolerance);
};

/**
 * Where Playwright itself says an element in a frame is, in layout-viewport coordinates like the ring. Independent of
 * the code under test. Playwright reports positions in the visual viewport, which a phone can have scrolled away from
 * the layout viewport, so that offset is added back.
 */
const oracle = async (page: Page, frames: string[], selector: string): Promise<Box> => {
  let scope: Page | ReturnType<Page["frameLocator"]> = page;
  for (const frame of frames) scope = scope.frameLocator(frame);
  const box = await scope.locator(selector).boundingBox();
  if (!box) throw new Error("No box");
  const view = await page.evaluate(() => ({
    x: window.visualViewport?.offsetLeft ?? 0,
    y: window.visualViewport?.offsetTop ?? 0,
  }));
  return { left: box.x + view.x, top: box.y + view.y, width: box.width, height: box.height };
};

test("rings an element inside a same-origin iframe, with its border and padding", async ({ page }) => {
  await open(page, "frame");
  await expect(page.getByRole("dialog")).toContainText("In a frame");
  await settled(page);
  near(await ring(page), await oracle(page, ["#frame"], "#inframe"));
  // The other frames hold the same name; none of them is the one that is meant.
  const other = await oracle(page, ["#scaled"], "#inframe");
  expect(Math.abs((await ring(page)).top - other.top)).toBeGreaterThan(20);
});

test("rings an element in a frame that is scaled on screen", async ({ page }) => {
  await open(page, "scaled");
  await expect(page.getByRole("dialog")).toContainText("Scaled");
  await settled(page);
  near(await ring(page), await oracle(page, ["#scaled"], "#inframe"));
});

test("rings an element in a frame inside a frame", async ({ page }) => {
  await open(page, "nested");
  await expect(page.getByRole("dialog")).toContainText("Nested");
  await settled(page);
  near(await ring(page), await oracle(page, ["#outer", "#inner"], "#inframe"));
});

test("scrolling the frame's own document moves the ring", async ({ page }) => {
  await open(page, "frame");
  await expect(page.getByRole("dialog")).toContainText("In a frame");
  await settled(page);
  const before = await ring(page);
  await page
    .frameLocator("#frame")
    .locator("body")
    .evaluate(() => window.scrollBy(0, 40));
  await page.waitForTimeout(300);
  const after = await ring(page);
  near(after, await oracle(page, ["#frame"], "#inframe"));
  expect(Math.abs(before.top - after.top)).toBeGreaterThanOrEqual(20);
});

test("Escape in a frame the page owns does not close the tour; Escape in the guide does", async ({ page }) => {
  await open(page, "frame");
  await expect(page.getByRole("dialog")).toBeVisible();
  await settled(page);
  await page.frameLocator("#frame").locator("#field").focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Next|Finish/ })
    .focus();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("gives focus back to the field inside the frame that had it when the tour started", async ({ page }) => {
  await page.goto(FIXTURE);
  await page.waitForFunction(() => typeof window.__start === "function");
  await page.frameLocator("#frame").locator("#field").focus();
  await page.evaluate(() => void window.__start("frame"));
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.frameLocator("#frame").locator("#field")).toBeFocused();
});

test("says why a frame from another origin cannot be used, and shows no guide", async ({ page }) => {
  await open(page, "foreign");
  await page.waitForFunction(() => window.__errors.length > 0);
  const errors = await page.evaluate(() => window.__errors);
  expect(errors).toHaveLength(1);
  expect(errors[0]).toContain('Step "foreign"');
  expect(errors[0]).toContain("same-origin document");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("skips a step in a frame that is not displayed, without an error", async ({ page }) => {
  await open(page, "hiddenframe");
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => window.__errors)).toEqual([]);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
