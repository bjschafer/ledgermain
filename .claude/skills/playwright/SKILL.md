---
name: playwright
description: Set up and run this repo's Playwright e2e suite (apps/web/e2e). Use whenever running, writing, or debugging e2e tests, or verifying a UI change against a real browser via Playwright. Covers the bun-specific invocation, the pinned-port dev-server reuse gotcha (critical in worktrees / parallel agents), and browser installation.
---

# Playwright e2e (apps/web)

Config: `apps/web/playwright.config.ts`. Specs: `apps/web/e2e/*.spec.ts` (must
end `.spec.ts` — kept separate from `apps/web/test/`, which `bun test` owns).
Toolchain is **bun**, not npm/npx — use `bunx`, not `npx`.

## First run in a new checkout or worktree

Playwright browsers are cached globally (`~/Library/Caches/ms-playwright` on
macOS), so they usually don't need reinstalling per-worktree — but
`node_modules` is per-checkout and worktrees don't have it.

```bash
bun install                      # once per worktree — node_modules isn't shared
bunx playwright install chromium # idempotent; fast no-op if already cached
```

## Running tests

```bash
bun run e2e                              # full suite, from repo root
bun run e2e -- e2e/smoke.spec.ts         # one file (note the `--`)
bun run e2e -- -g "toggling a condition" # by test name
cd apps/web && bunx playwright test      # equivalent, run directly
```

Runs headless by default (`chromium` project only) — don't add `--headed`,
there's no display in an agent session.

## The dev-server gotcha (read this before trusting a green run)

`apps/web/vite.config.ts` pins `server: { port: 5173, strictPort: true }` —
deliberately, so the origin (and thus the IndexedDB store) stays stable
across restarts. `playwright.config.ts`'s `webServer` has
`reuseExistingServer: !process.env.CI`, meaning **locally it will happily
reuse whatever is already listening on 5173** rather than booting one from
the code you're testing.

This is silently wrong in exactly the situations this harness creates:
several worktrees/background jobs running concurrently, or the user's own
`bun run dev` already up. If some *other* checkout's server is on 5173, your
test run passes or fails against **that** code, not the one in your working
tree, and nothing tells you.

- Before running e2e, check what's actually on the port:
  `lsof -i :5173 -sTCP:LISTEN` (matches the root CLAUDE.md rule: always check
  before killing/starting the dev server).
- To get a trustworthy run regardless, prefix with `CI=1`:
  `CI=1 bun run e2e`. This flips `reuseExistingServer` to `false`; combined
  with `strictPort: true` it now **fails loudly** ("port already in use")
  instead of silently testing the wrong code if 5173 is occupied, and
  otherwise boots a fresh server from your actual worktree.
- The `dev`/`build` npm-lifecycle `predev`/`prebuild` hooks (which copy
  vendored RefData into `public/data/`) fire automatically when Playwright's
  `webServer` runs `bun run dev`, so you don't need to run
  `copy-refdata.ts` by hand.

## Debugging a failure

- Traces are captured `on-first-retry`; artifacts land in `test-results/` /
  `playwright-report/` (gitignored). View with
  `bunx playwright show-trace test-results/<test>/trace.zip`.
- `bunx playwright test --debug` for step-through (needs a display — not
  useful in a headless agent session; prefer reading the trace/report).

## Writing new specs

Follow the existing pattern in `apps/web/e2e/tracker.spec.ts`:

- Every test wires up the `guard(page)` console/pageerror collector and
  asserts both arrays are empty at the end — an unexpected console error or
  uncaught exception should fail the test even if the assertions pass.
- Prefer `getByRole` / `getByText` locators over CSS; the sheet does use a
  couple of stable CSS hooks worth reusing (`.seal` / `.seal-value` for stat
  values) rather than reinventing a selector.
- `gotoPlay(page)` already encodes "wait for RefData to load, then switch to
  the Play tab" — reuse it instead of duplicating the wait.
