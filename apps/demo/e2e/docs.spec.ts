import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { sections } from "../src/docs/sections";

test("the page never scrolls sideways", async ({ page }) => {
  await page.goto("docs/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const scheme of ["light", "dark"] as const) {
  test(`has no detectable accessibility violations in ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("docs/");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(violations).toEqual([]);
  });
}

test("is reachable from the header and its contents jump to the answers", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Docs" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "React product tour documentation" })).toBeVisible();
  const question = sections.find((section) => section.id === "web-components")?.question ?? "";
  await page.getByRole("link", { name: question }).click();
  await expect(page).toHaveURL(/#web-components$/);
  await expect(page.getByRole("heading", { level: 2, name: question })).toBeInViewport();
});
