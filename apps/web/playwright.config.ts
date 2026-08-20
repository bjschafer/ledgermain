import { defineConfig, devices } from "@playwright/test";
import { hasNativeWebkitDeps } from "./scripts/webkit-deps.ts";

// Announced rather than silent: a project that vanishes without a word reads as
// coverage that passed. Workers re-load this config, and only they get
// TEST_WORKER_INDEX, so the notice prints once instead of once per worker.
const webkitRunsHere = hasNativeWebkitDeps();
if (!webkitRunsHere && process.env.TEST_WORKER_INDEX === undefined) {
  console.warn(
    "[playwright] skipping webkit-layout: this host is missing libraries WebKit needs. Run `bun run e2e:webkit`.",
  );
}

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
  //
  // WebKit is dropped, not failed, on hosts whose libraries it can't link
  // against (`bun run e2e:webkit` runs it there via a container instead). It
  // would otherwise fail every local run with a launch error that reads like a
  // layout regression.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    ...(webkitRunsHere
      ? [
          {
            name: "webkit-layout",
            testMatch: /layout\.spec\.ts/,
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
