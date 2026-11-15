import { voiceOverTest as test } from "@guidepup/playwright";
import { expect } from "@playwright/test";
import { closeTour, openDemo, saveTranscript, startTour } from "./helpers";

// The checks are deliberately loose: they look for the words the guide puts on the page, not for how VoiceOver
// phrases its roles, which differs between macOS versions.

test("says the step and its count when the tour starts", async ({ page, voiceOver }, testInfo) => {
  await openDemo(page, voiceOver);
  try {
    // The counter is drawn in capitals, and VoiceOver reads it as it is drawn.
    expect(await startTour(page, voiceOver)).toMatch(/step 1 of \d+/i);
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
    expect(await closeTour(page, voiceOver)).toMatch(/Tour closed/);
  } finally {
    await saveTranscript(voiceOver, testInfo);
  }
});
