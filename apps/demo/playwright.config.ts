import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:4173/", trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command: "pnpm exec vite preview --port 4173 --strictPort",
      url: "http://localhost:4173/",
      reuseExistingServer: !process.env.CI,
    },
    {
      // The web component fixture: built first, then served on its own port. It is not part of the demo.
      command:
        "pnpm exec vite build -c vite.fixtures.config.ts && pnpm exec vite preview -c vite.fixtures.config.ts --port 4174 --strictPort",
      url: "http://localhost:4174/",
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
