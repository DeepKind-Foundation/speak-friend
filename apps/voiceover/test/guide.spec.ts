import { voiceOverTest as test, type VoiceOverPlaywright } from "@guidepup/playwright";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { writeFileSync } from "node:fs";

// What VoiceOver says is written to a transcript for every test, pass or fail, so it can be read by a person.
//
// Guidepup only records speech that follows one of its own commands. Speech caused by the page (focus moving to the
// guide, a status message) is recorded by wrapping the page action in voiceOver.capture, which waits for VoiceOver to
// finish speaking. The checks are deliberately loose: they look for the words the guide puts on the page, not for how
// VoiceOver phrases its roles, which differs between macOS versions.

const saveTranscript = async (voiceOver: VoiceOverPlaywright, testInfo: TestInfo): Promise<void> => {
  const file = testInfo.outputPath("spoken.txt");
  writeFileSync(file, `${(await voiceOver.spokenPhraseLog()).join("\n")}\n`);
  await testInfo.attach("spoken", { path: file, contentType: "text/plain" });
};

/** Opens the demo and puts VoiceOver in the page. */
const openDemo = async (page: Page, voiceOver: VoiceOverPlaywright): Promise<void> => {
  await page.goto("/");
  await page.getByRole("button", { name: "Take the tour" }).waitFor();
  await voiceOver.navigateToWebContent();
  await voiceOver.clearSpokenPhraseLog();
};

/** Starts the tour from the keyboard, as a person would, and returns what VoiceOver said while it opened. */
const startTour = async (page: Page, voiceOver: VoiceOverPlaywright): Promise<string> => {
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

test("says the step and its count when the tour starts", async ({ page, voiceOver }, testInfo) => {
  await openDemo(page, voiceOver);
  try {
    expect(await startTour(page, voiceOver)).toMatch(/Step 1 of \d+/);
  } finally {
    await saveTranscript(voiceOver, testInfo);
  }
});

test("reaches the Next and Close buttons by moving forward from the step", async ({ page, voiceOver }, testInfo) => {
  test.setTimeout(240_000);
  await openDemo(page, voiceOver);
  try {
    await startTour(page, voiceOver);
    // Each phrase has to name the control and say that it is a button, so text elsewhere in the page cannot satisfy it.
    const wanted = [/\bNext\b.*\bbutton\b|\bbutton\b.*\bNext\b/i, /\bClose\b.*\bbutton\b|\bbutton\b.*\bClose\b/i];
    const found = [false, false];
    for (let i = 0; i < 60 && !found.every(Boolean); i++) {
      await voiceOver.next();
      const phrase = await voiceOver.lastSpokenPhrase();
      // A control is read as a short phrase; a step description that mentions the button is much longer.
      if (phrase.length > 40) continue;
      wanted.forEach((pattern, index) => (found[index] ||= pattern.test(phrase)));
    }
    expect(found, "Next and Close were each read as a button").toEqual([true, true]);
  } finally {
    await saveTranscript(voiceOver, testInfo);
  }
});

test("says that the tour closed when Escape is pressed in the guide", async ({ page, voiceOver }, testInfo) => {
  await openDemo(page, voiceOver);
  try {
    await startTour(page, voiceOver);
    const { spokenPhrase } = await voiceOver.capture(
      async () => {
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeHidden();
      },
      { capture: true },
    );
    expect(spokenPhrase).toMatch(/Tour closed/);
  } finally {
    await saveTranscript(voiceOver, testInfo);
  }
});
