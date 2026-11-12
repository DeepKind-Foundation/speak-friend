import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Waits until the guide's entry animation is over, so colours and positions are the settled ones. */
const settled = (page: Page): Promise<unknown> => page.waitForFunction(() => document.getAnimations().length === 0);

const open = async (page: Page, scheme: "light" | "dark" = "light"): Promise<void> => {
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto("workbench/");
};

test("the page never scrolls sideways", async ({ page }) => {
  await open(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const scheme of ["light", "dark"] as const) {
  test(`has no detectable accessibility violations in ${scheme}, idle and running`, async ({ page }) => {
    await open(page, scheme);
    const scan = (): Promise<unknown[]> =>
      new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
        .then((r) => r.violations);
    expect(await scan()).toEqual([]);
    await page.getByRole("button", { name: "Start tour" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await settled(page);
    expect(await scan()).toEqual([]);
  });
}

test("the running guide docks inside the frame and leaves the first target uncovered", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Start tour" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await settled(page);
  const [frame, guide, target] = await Promise.all([
    page.locator(".stage-screen").boundingBox(),
    dialog.boundingBox(),
    page.locator('[data-tour="new-task"]').boundingBox(),
  ]);
  expect(guide!.x).toBeGreaterThanOrEqual(frame!.x - 1);
  expect(guide!.y + guide!.height).toBeLessThanOrEqual(frame!.y + frame!.height + 1);
  const overlaps =
    guide!.x < target!.x + target!.width &&
    guide!.x + guide!.width > target!.x &&
    guide!.y < target!.y + target!.height &&
    guide!.y + guide!.height > target!.y;
  expect(overlaps).toBe(false);
});

test("Escape ends the tour and focus returns to Start tour", async ({ page }) => {
  await open(page);
  const start = page.getByRole("button", { name: "Start tour" });
  await start.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(start).toBeFocused();
});

test("choosing an option changes the code at once, and Copy confirms", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.getByRole("radio", { name: "start", exact: true }).check();
  await expect(page.getByRole("tabpanel")).toContainText('position="start"');
  await page.getByRole("button", { name: "Copy" }).click();
  await expect(page.getByText("Copied Root.tsx")).toBeAttached();
});

test("the code shows every line of the file, one under another", async ({ page }) => {
  await open(page);
  const rows = page.locator(".code-panel .row");
  expect(await rows.count()).toBeGreaterThan(10);
  const [first, last] = await Promise.all([rows.first().boundingBox(), rows.last().boundingBox()]);
  expect(last!.y).toBeGreaterThan(first!.y + 100);
});
