import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests of the static export (`npm run build:e2e` first), with the
 * API answered from fixtures (e2e/support.ts): no API, network or clock of
 * the day is involved. Run in the Playwright Docker image (see README).
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Locally, a few: by default Playwright starts one browser per two cores,
  // and on a large machine that is more than the single static server keeps
  // up with (pages stall on their font loads).
  workers: process.env.CI ? undefined : 4,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    locale: "ja-JP",
    // Not Japan: the site works out "now" and "today" in Japan whatever the
    // visitor's own time zone, and these tests hold it to that.
    timezoneId: "America/Los_Angeles",
    trace: "retain-on-failure",
  },
  projects: [
    {
      // A phone first: that is where the site is used.
      name: "phone",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "node e2e/serve.mjs",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: !process.env.CI,
  },
});
