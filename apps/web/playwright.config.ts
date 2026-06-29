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
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
