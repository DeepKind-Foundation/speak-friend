import { voiceOverTest as test } from "@guidepup/playwright";
import { type Page } from "@playwright/test";
import { closeTour, openDemo, saveTranscript, startTour } from "./helpers";

// Not a check: it records and only fails when the page is not as expected. The guide returns focus when the tour ends
// and writes "Tour closed" into its status region a few milliseconds later, and VoiceOver has been heard saying the
// focus move and not the message. Each test puts a probe message into the same region, once VoiceOver is quiet or a
// given time after the tour closed, so the transcripts show whether VoiceOver says a message that follows a focus move
// and how long after it has to arrive. A probe that was spoken shows up in "heard"; one that was not, does not.

interface Region {
  before: string;
  after: string;
}

/** Replaces the text of the guide's status region, as the guide does, and says what it was and is. */
const probe = async (page: Page, text: string): Promise<Region> => {
  const region = await page.evaluate((next) => {
    const element = document.querySelector(".sf-visually-hidden[role=status]");
    if (!element) return null;
    const before = element.textContent ?? "";
    element.textContent = next;
    return { before, after: element.textContent };
  }, text);
  if (!region) throw new Error("The guide's status region is not in the page.");
  return region;
};

test("records whether a status message is spoken once VoiceOver is quiet after the tour closed", async ({
  page,
  voiceOver,
}, testInfo) => {
  await openDemo(page, voiceOver);
  const notes: string[] = [];
  try {
    await startTour(page, voiceOver);
    notes.push(`closing: ${await closeTour(page, voiceOver)}`);
    const { result, spokenPhrase } = await voiceOver.capture(() => probe(page, "Probe once quiet"), { capture: true });
    notes.push(`region: ${JSON.stringify(result)}`, `heard: ${spokenPhrase}`);
  } finally {
    await saveTranscript(voiceOver, testInfo, notes);
  }
});

for (const delay of [0, 300, 1000]) {
  test(`records whether a status message ${delay} ms after the tour closed is spoken`, async ({
    page,
    voiceOver,
  }, testInfo) => {
    await openDemo(page, voiceOver);
    const notes: string[] = [];
    try {
      await startTour(page, voiceOver);
      const { result, spokenPhrase } = await voiceOver.capture(
        async () => {
          await page.keyboard.press("Escape");
          await page.getByRole("dialog").waitFor({ state: "hidden" });
          await page.waitForTimeout(delay);
          return probe(page, `Probe after ${delay} milliseconds`);
        },
        { capture: true },
      );
      notes.push(`region: ${JSON.stringify(result)}`, `heard: ${spokenPhrase}`);
    } finally {
      await saveTranscript(voiceOver, testInfo, notes);
    }
  });
}
