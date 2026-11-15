import { type VoiceOverPlaywright } from "@guidepup/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { writeFileSync } from "node:fs";

// Guidepup only records speech that follows one of its own commands. Speech caused by the page (focus moving to the
// guide, a status message) is recorded by wrapping the page action in voiceOver.capture, which waits for VoiceOver to
// finish speaking.

/** Writes everything VoiceOver said during the test to a transcript a person can read, with optional notes below it. */
export const saveTranscript = async (
  voiceOver: VoiceOverPlaywright,
  testInfo: TestInfo,
  notes: readonly string[] = [],
): Promise<void> => {
  const file = testInfo.outputPath("spoken.txt");
  const spoken = (await voiceOver.spokenPhraseLog()).join("\n");
  writeFileSync(file, `${spoken}\n${notes.length ? `\n--- notes\n${notes.join("\n")}\n` : ""}`);
  await testInfo.attach("spoken", { path: file, contentType: "text/plain" });
};

/** Opens the demo and puts VoiceOver in the page. */
export const openDemo = async (page: Page, voiceOver: VoiceOverPlaywright): Promise<void> => {
  await page.goto("/");
  await page.getByRole("button", { name: "Take the tour" }).waitFor();
  await voiceOver.navigateToWebContent();
  await voiceOver.clearSpokenPhraseLog();
};

/** Starts the tour from the keyboard, as a person would, and returns what VoiceOver said while it opened. */
export const startTour = async (page: Page, voiceOver: VoiceOverPlaywright): Promise<string> => {
  const begin = page.getByRole("button", { name: "Take the tour" });
  const { spokenPhrase } = await voiceOver.capture(
    async () => {
      await begin.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
    },
    { capture: true },
  );
  return spokenPhrase;
};

/** Closes the tour with Escape in the guide and returns what VoiceOver said until it was quiet again. */
export const closeTour = async (page: Page, voiceOver: VoiceOverPlaywright): Promise<string> => {
  const { spokenPhrase } = await voiceOver.capture(
    async () => {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
    },
    { capture: true },
  );
  return spokenPhrase;
};
