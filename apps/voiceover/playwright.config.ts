import { withGuidepup } from "@guidepup/playwright";
import { devices } from "@playwright/test";

// Runs VoiceOver against the built demo, served on the loopback address only. withGuidepup runs the tests one at a
// time and in a headed browser, which VoiceOver needs. Nothing here may use a secret.
export default withGuidepup({
  testDir: "test",
  outputDir: "output/results",
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  use: { baseURL: "http://127.0.0.1:4173/" },
  projects: [{ name: "voiceover", use: { ...devices["Desktop Safari"] } }],
  webServer: {
    command: "pnpm --filter speak-friend-demo exec vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/",
  },
});
