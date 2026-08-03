import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Specs live in ./e2e and are named *.spec.ts so the bun unit-test
 * runner (scoped to ./test) never picks them up. Playwright boots the Vite dev
 * server itself and reuses one if it's already running.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // The `github` reporter only annotates the run — it writes nothing to disk,
  // so CI's artifact upload had no report (and no retry traces) to collect.
  // Pair it with the HTML reporter, which is what actually produces the
  // uploaded directory and embeds the traces as attachments.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  // Chromium and Firefox both run the whole suite. WebKit runs only the layout
  // sweep: engine differences show up in sizing far more than in behavior, and
  // a third full pass costs more CI time than it has ever caught.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    {
      name: "webkit-layout",
      testMatch: /layout\.spec\.ts/,
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
