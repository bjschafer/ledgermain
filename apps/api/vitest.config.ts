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
      miniflare: {
        bindings: {
          // Pinned for tests rather than inherited from `wrangler.jsonc`, which
          // carries production origins only. These tests are about the
          // allowed-vs-disallowed *behavior*, so they supply both kinds of
          // origin themselves — and stay green when the deployed list changes.
          ALLOWED_APP_ORIGINS: "http://localhost:5173,https://ledgermain.whizkid.dev",
          // Likewise pinned: the route tests care that *an* owner is
          // distinguished from everyone else, not which account it is. The
          // unset case is a behavior of its own and is covered directly
          // against `isOwner` (feedbackContacts.test.ts).
          OWNER_ID: "discord:owner-under-test",
        },
      },
    }),
  ],
});
