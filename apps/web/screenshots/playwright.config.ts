import { defineConfig, devices } from "@playwright/test";

/**
 * Standalone config for the README screenshot generator (`./capture.ts`). Kept
 * separate from the main e2e config (`../playwright.config.ts`, `testDir: ./e2e`)
 * so `bun run e2e` never runs it and rewrites the committed PNGs. Reuses the
 * same Vite dev-server boot. Invoke via `bun run screenshots`.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "capture.ts",
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
