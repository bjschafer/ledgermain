---
name: playwright
description: Set up and run this repo's Playwright e2e suite (apps/web/e2e). Use whenever running, writing, or debugging e2e tests, or verifying a UI change against a real browser via Playwright. Covers the bun-specific invocation, the pinned-port dev-server reuse gotcha (critical in worktrees / parallel agents), and browser installation.
---

# Playwright e2e (apps/web)

Config: `apps/web/playwright.config.ts`. Specs: `apps/web/e2e/*.spec.ts` (must
end `.spec.ts` — kept separate from `apps/web/test/`, which `bun test` owns).
Toolchain is **bun**, not npm/npx.

**Don't run `bunx playwright test`** — see the two-instances gotcha below. Use
the package scripts, or `apps/web/node_modules/.bin/playwright` directly.

## First run in a new checkout or worktree

Playwright browsers are cached globally (`~/.cache/ms-playwright` on Linux,
`~/Library/Caches/ms-playwright` on macOS), so they usually don't need
reinstalling per-worktree — but `node_modules` is per-checkout and worktrees
don't have it.

```bash
bun install         # once per worktree — node_modules isn't shared
bun run e2e:install # browsers; idempotent, fast no-op if already cached
```

`e2e:install` pulls **all three** engines, matching both CI and the three
projects in `playwright.config.ts`. Installing only chromium leaves the
firefox and webkit projects failing with `browserType.launch: Executable
doesn't exist at …/firefox-<rev>/firefox` — which reads like a broken pin but
is just a browser that was never fetched. Firefox is not optional here: it is
the maintainer's own browser and the reason the cross-engine setup exists at
all.

### WebKit needs system libraries, and can't get them on Arch

The browser download is self-contained; its **host dependencies** are not.
`playwright install --with-deps` (what CI runs) shells out to `apt`, so on a
Debian/Ubuntu box it just works. On Arch/EndeavourOS there is no apt, and
WebKit wants old-ABI libraries the rolling repos no longer carry: `libicu*.so.74`
(Arch is on 78), `libxml2.so.2` (Arch is on .so.16), plus `libflite*.so.1`,
`libbacktrace.so.0`, and `libjxl.so.0.8`. Sourcing those means AUR builds of
pinned legacy packages.

So on Arch: chromium and firefox run locally, WebKit does not. Don't chase it
— `webkit-layout` is one spec (`layout.spec.ts`), CI runs it on Ubuntu every
push, and it fails loudly there if it regresses. Run `--project=chromium
--project=firefox` locally and let CI own the third engine.

## Running tests

```bash
bun run e2e                              # full suite, from repo root
bun run e2e -- e2e/smoke.spec.ts         # one file (note the `--`)
bun run e2e -- -g "toggling a condition" # by test name
bun run e2e -- --project=chromium        # one engine (see the WebKit note above)
cd apps/web && node_modules/.bin/playwright test   # equivalent, run directly
```

Runs headless — don't add `--headed`, there's no display in an agent session.
All three projects run by default, so a missing browser surfaces as a failed
project rather than a skipped one.

## Never `bunx playwright test` (the two-instances gotcha)

`bunx` may resolve Playwright to its **own downloaded copy** rather than the
one in `node_modules` — it prints `Resolving dependencies / Saved lockfile`
and fetches a second install, even at the identical version. The runner is
then a different module instance than the one `playwright.config.ts` and the
specs import, so every spec fails to register with:

```text
Error: Playwright Test did not expect test() to be called here.
...
- You are calling test() from an async test.describe() block.
Error: No tests found.
```

That message is **misleading** — it points at `test()`/`test.use()` syntax,
so it reads like a broken spec. The spec is fine; the runner is the wrong
copy. It also bites intermittently: `bunx` can use the local copy for a few
runs and then switch to its own, so a spec that passed twice starts failing
untouched.

Use `bun run e2e` / `bun run screenshots`, or `apps/web/node_modules/.bin/playwright`
(verified working). `bunx playwright install` bites too, differently: when
bunx fetches its own (newer) copy, it downloads that version's browser
revisions, and the pinned `@playwright/test` then fails at launch with
`Executable doesn't exist … chromium_headless_shell-<rev>`. A warm global
browser cache masks this locally; a clean machine (CI runner, fresh
workstation) hits it every time. Install via the local bin path above.

## The dev-server gotcha (read this before trusting a green run)

`apps/web/vite.config.ts` pins `server: { port: 5173, strictPort: true }` —
deliberately, so the origin (and thus the IndexedDB store) stays stable
across restarts. `playwright.config.ts`'s `webServer` has
`reuseExistingServer: !process.env.CI`, meaning **locally it will happily
reuse whatever is already listening on 5173** rather than booting one from
the code you're testing.

This is silently wrong in exactly the situations this harness creates:
several worktrees/background jobs running concurrently, or the user's own
`bun run dev` already up. If some _other_ checkout's server is on 5173, your
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

## Regenerating the README screenshots

**Don't hand-roll a screenshot spec — this already exists.**
`docs/images/{tracker,builder}.png` are generated by
`apps/web/screenshots/capture.ts`:

```bash
bun run screenshots        # from the repo root or apps/web
```

It drives the real app against the bundled sample character (Kordrek
Ironvein, L5 cleric — `apps/web/src/data/sample-character.json`), repointing
the `pf1-tracker:activeCharacterId` localStorage key at it since a fresh
store seeds the sample but leaves a blank character active.

It has its **own** config (`screenshots/playwright.config.ts`, `testMatch:
capture.ts`) deliberately kept out of `testDir: ./e2e`, so `bun run e2e`
never runs it and rewrites the committed PNGs. It rewrites the PNGs in place
— always `git diff` / eyeball the results before committing.

Tracker is captured at 1440x1180 and builder at 1440x960; the tracker is
taller because HP + conditions + both timed buffs must fit its README
caption, and it asserts the buff rows are in viewport so a new panel pushing
them past the fold fails the run instead of committing a cropped image.

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
