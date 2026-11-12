import { expect, test, type Page } from "@playwright/test";

const open = async (page: Page): Promise<void> => {
  await page.goto("/");
  await page.getByRole("button", { name: "Take the tour" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
};

test("the guide is a non-modal dialog named by the step title", async ({ page }) => {
  await open(page);
  const guide = page.getByRole("dialog");
  await expect(guide).not.toHaveAttribute("aria-modal", /.*/);
  const title = await guide.getAttribute("aria-labelledby");
  await expect(page.locator(`[id="${title}"]`)).toBeFocused();
  await expect(guide).toMatchAriaSnapshot(`
    - dialog:
      - heading [level=2]
      - paragraph
      - button "Back" [disabled]
      - button "Next"
      - button "Close"
  `);
});

test("focus follows the title on every step and Escape returns it to the opener", async ({ page }) => {
  await open(page);
  const guide = page.getByRole("dialog");
  for (let i = 0; i < 3; i++) {
    const before = await guide.getByRole("heading").textContent();
    await guide.getByRole("button", { name: "Next" }).click();
    await expect(guide.getByRole("heading")).not.toHaveText(before ?? "");
    await expect(guide.getByRole("heading")).toBeFocused();
  }
  await page.keyboard.press("Escape");
  await expect(guide).toBeHidden();
  await expect(page.getByRole("button", { name: "Take the tour" })).toBeFocused();
});

test("the page stays usable: Tab reaches page controls and the guide never covers the focused one", async ({
  page,
}) => {
  await open(page);
  await page.locator(".wordmark").focus();
  const covered: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const hit = await page.evaluate(() => {
      const focused = document.activeElement;
      if (!focused || focused === document.body || focused.closest(".sf-guide")) return null;
      const r = focused.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return focused.contains(top) || top?.contains(focused) ? "clear" : focused.outerHTML.slice(0, 80);
    });
    if (hit && hit !== "clear") covered.push(hit);
  }
  expect(covered).toEqual([]);
});

test("the ring stays inside the window for every step", async ({ page }) => {
  await open(page);
  const guide = page.getByRole("dialog");
  const size = page.viewportSize();
  for (let i = 0; i < 6; i++) {
    const ring = page.locator(".sf-ring");
    if (await ring.count()) {
      const box = await ring.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.y).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size!.width + 1);
    }
    const next = guide.getByRole("button", { name: /Next|Finish/ });
    if ((await next.textContent()) === "Finish") break;
    await next.click();
  }
});

test("reduced motion is honoured", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  const animated = await page.evaluate(
    () =>
      document
        .getAnimations()
        .filter((a) => (a as CSSAnimation).animationName !== undefined && a.effect?.getTiming().iterations === Infinity)
        .length,
  );
  expect(animated).toBe(0);
});

test.describe("dimming", () => {
  /** How many shadows the ring has: its halo, plus the tint when dimming is drawn. */
  const shadows = async (page: Page): Promise<number> => {
    await page.goto("workbench/");
    await page.getByRole("radio", { name: "on", exact: true }).check();
    await page.getByRole("button", { name: /tour/i }).first().click();
    await expect(page.locator(".sf-ring[data-dim]")).toBeVisible();
    const value = await page.locator(".sf-ring").evaluate((el) => getComputedStyle(el).boxShadow);
    return value.match(/0px 0px 0px/g)?.length ?? 0;
  };

  test("tints the page, and the page stays clickable", async ({ page }) => {
    expect(await shadows(page)).toBe(2);
    const events = await page.locator(".sf-ring").evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(events).toBe("none");
  });

  test("is left out when more contrast is asked for", async ({ page }) => {
    await page.emulateMedia({ contrast: "more" });
    expect(await shadows(page)).toBe(1);
  });

  test("is left out in forced-colors mode", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    // The browser drops shadows itself in this mode; the tint must not come back.
    expect(await shadows(page)).toBeLessThan(2);
  });
});

/** True when the guide and the ring around the first target overlap. */
const overlap = (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const ring = document.querySelector(".sf-ring")?.getBoundingClientRect();
    const dock = document.querySelector(".sf-guide")?.getBoundingClientRect();
    if (!ring || !dock) return true;
    return ring.left < dock.right && ring.right > dock.left && ring.top < dock.bottom && ring.bottom > dock.top;
  });

const pinFirstTarget = async (page: Page, css: string): Promise<void> => {
  await page.goto("/");
  await page.addStyleTag({
    content: `[data-tour^="ledger-"]:first-of-type { position: fixed !important; z-index: 1; ${css} }`,
  });
  await page.getByRole("button", { name: "Take the tour" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForFunction(() => document.getAnimations().length === 0);
  await page.waitForTimeout(900);
};

test("moves away from a target pinned in the corner the guide would dock in", async ({ page, isMobile }) => {
  await pinFirstTarget(page, "inset-inline-end: 24px; inset-block-end: 24px; inline-size: 220px; block-size: 64px;");
  const guide = page.getByRole("dialog");
  expect(await overlap(page)).toBe(false);
  // A floating guide goes to the other side; a full-width sheet cannot, so it goes to the top edge.
  if (isMobile) await expect(guide).toHaveAttribute("data-edge", "top");
  else await expect(guide).toHaveAttribute("data-position", "start");
});

test("goes to the top edge when a target spans the bottom of the window", async ({ page }) => {
  await pinFirstTarget(page, "inset-inline: 24px; inset-block-end: 24px; block-size: 64px;");
  expect(await overlap(page)).toBe(false);
  await expect(page.getByRole("dialog")).toHaveAttribute("data-edge", "top");
});

test("on a phone the guide spans the width of the window", async ({ page, isMobile }) => {
  test.skip(!isMobile, "only the phone layout is a full-width sheet");
  await open(page);
  const { left, right, width } = await page.evaluate(() => {
    const r = document.querySelector(".sf-guide")!.getBoundingClientRect();
    return { left: r.left, right: r.right, width: window.innerWidth };
  });
  expect(left).toBe(0);
  expect(right).toBe(width);
});
