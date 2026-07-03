import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/**
 * Runs the Worker's route tests inside Miniflare via vitest-pool-workers —
 * no deployed environment, no real Cloudflare account resources touched.
 * This is why apps/api has its own `test` script (`vitest run`) instead of
 * `bun test`: bun's built-in runner doesn't know how to boot a Workers
 * runtime. `bun run --filter '*' test` (the root `test` script) still picks
 * this up automatically — it just runs each package's own `test` script,
 * and this one happens to shell out to `vitest` under bun. See README.md if
 * you want to run just this package's tests.
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
});
