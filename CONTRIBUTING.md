# Contributing to Ledgermain

Bug reports, rules corrections, and PRs are all welcome. This doc covers the
conventions that aren't obvious from the code. Orientation reading order:

1. [`README.md`](./README.md) -- what the project is and how to run it.
2. [`docs/design.md`](./docs/design.md) -- architecture rationale; the source of
   truth for _why_ things are shaped the way they are.
3. [`docs/engine-cookbook.md`](./docs/engine-cookbook.md) -- a maintainer's guide
   to the rules engine: the compute pipeline, the stacking and formula cores,
   and step-by-step recipes for the common kinds of change.

## Setup

The toolchain is [Bun](https://bun.sh) `1.3+` with workspaces; nothing else to
install.

```bash
bun install
bun run dev          # http://localhost:5173 (copies reference data, then starts Vite)
bun run dev:ref      # http://localhost:5174 the companion quick-reference site
```

## The gates

CI runs all of these on every push and PR; they must stay green.

```bash
bun run typecheck    # tsc --noEmit across all packages — the primary gate
bun run lint         # oxlint (errors block; warnings tolerated — don't add new ones)
bun run fmt:check    # oxfmt --check
bun run test         # unit tests (engine + data-pipeline + web + api)
bun run e2e          # Playwright (Chromium); boots its own dev server
```

Run `bun run fmt` before committing. If you disagree with a formatting result,
change your code; don't fight the tool or hand-format around it.
`bun run lint:fix` auto-fixes the safe lint rules.

One wrinkle in `bun run test`: everything runs on `bun test` except `apps/api`,
whose Worker routes need a real Workers runtime
(`@cloudflare/vitest-pool-workers`). Its test script shells out to `vitest run`,
and the root script picks it up automatically.

## Deployment, and the check that always fails

There is no deploy command. All three Workers -- `apps/web`
(ledgermain.whizkid.dev), `apps/api` (api.ledgermain.whizkid.dev), and
`apps/reference` (ref.ledgermain.whizkid.dev) -- deploy through **Cloudflare
Workers Builds**, a git-connected build configured in the Cloudflare dashboard
rather than in this repo. A merge to `main` is the deploy.
`.github/workflows/ci.yml` runs the gates only; it has no deploy step. Don't run
`wrangler deploy`.

**The "Workers Builds: ledgermain" check fails on every PR branch, and that is
not your PR's fault.** On a non-production branch Workers Builds swaps the
deploy for a preview `wrangler versions upload`, which fails for the web
Worker -- it is assets-only (no `main`, just `assets` plus a custom-domain
route). The same push produces a green `ledgermain-api` build, the local gates
pass, and the deploy from `main` succeeds after merge. It has been red on every
branch since early July 2026.

So: judge a PR by the CI gates above, not by that check. The real error is
visible only in the Cloudflare dashboard build log, and a fix means changing the
worker's preview command there.

## Where code goes

> **The client is authoritative for all game logic. The server is dumb
> persistence.**

That one rule governs everything (rationale in `docs/design.md` §2). In
practice:

- Game logic is pure and tested. It lives in `packages/engine` or
  `apps/web/src/model/`, never in React components. Components are thin views.
- Derived values are never stored. `CharacterDoc` holds build choices and live
  session state; `compute(doc, refData)` returns every displayed number.
  Recomputing is cheap, so recompute rather than memoize cleverly.
- Nothing that toggles a buff, applies damage, or computes a modifier may
  require a server round-trip. The Worker in `apps/api` stores opaque blobs; it
  must **never** grow game logic.

## Engine changes

- Add hand-computed fixture tests following the pattern in
  `packages/engine/test/`. They run against the real vendored data slice via
  `loadRefData()`.
- Cite the rulebook source for expected values in new fixtures (a Core Rulebook
  page, a rule name) so a future maintainer can re-derive the numbers instead of
  trusting them.
- Feat prerequisites are hybrid by policy: hard-block only on structured signals
  (ability minimums, BAB, caster level, required `@UUID` feats); prose-only
  prerequisites soft-warn and never block. Don't promise perfect prereq
  enforcement.

## Player-visible changes

Two ledgers track what players see, and both are easy to forget:

- The changelog. When a change alters what a player sees or can do, add an entry
  to `apps/web/src/model/changelog.ts`: id `YYYY-MM-DD-slug`, newest first,
  written in play language with no issue numbers. It renders as the "What's New"
  panel in Settings, and the Settings tab's notification dot keys off the top
  entry's id, so **never rewrite a shipped id**. Notable changes only: refactors,
  data regens, and internal fixes don't earn a line.
- The coverage notes. `apps/web/src/model/coverageNotes.ts` is the single source
  of truth for content Ledgermain doesn't cover; it renders as the "What's Not
  Covered" panel in Settings. Filling a gap means deleting its entry; finding one
  means adding it.

  The GitHub inventory issue (#74) is a generated mirror of that file, so any
  edit -- a filled gap, a new gap, or a reworded sentence -- leaves it stale.
  Run `bun run coverage:issue --write`, which rewrites the issue body for you.
  Never hand-edit the issue.

  Editing #74 needs write access to the repo, which you won't have on a fork.
  That's fine and expected: `--write` detects it, skips the write, and prints
  the body instead. Just mention in your PR that `coverageNotes.ts` changed,
  and a maintainer syncs the issue when the PR lands.

## Reference data

The Foundry reference data is pinned and vendored: normalized JSON under
`packages/data-pipeline/data/`, committed. Never regenerate it as a side effect
of another change. To bump the pin, follow
[`docs/refdata-update.md`](./docs/refdata-update.md). There's a formatting trap
that produces a thousands-of-lines spurious diff if the steps run out of order.

## Comments

Comments explain the unexpected, and are brief. Keep ephemeral context out of
code and committed docs: no pointers to dated audits, planning docs, or working
notes. A comment should say _why_ the code is surprising and stand on its own.
(A bare issue reference for still-open tracked work is fine.)

## Licensing -- clean-room discipline (important)

The engine is a **clean-room reimplementation** from the published PF1 rules,
licensed `AGPL-3.0-or-later` (see [`NOTICE.md`](./NOTICE.md) §1 for why).
Foundry's GPL-3.0 system code may be used **only as a behavioral test oracle --
never copied, transcribed, or ported**. When validating engine behavior, compare
_outputs_ (given input X, both produce Y), not code structure. Don't paste
upstream source into this repo, and don't read upstream source while
implementing. Compendium _data_ is used under the OGL and Paizo Community Use
Policy with attribution intact, which also means Ledgermain must stay free to
use, with no paywalls or sign-up gates.

## Commits and PRs

- History on `main` is linear; messages follow a light conventional style --
  `feat(web): …`, `fix(engine): …`, `chore(data): …` -- with the _why_ in the
  body when it isn't obvious.
- Provenance narrative (which audit found a bug, what plan phase a change belongs
  to) goes in the commit message, never in source comments.
- The PR template's checklist mirrors the conventions above. It exists because
  nothing else enforces the changelog and coverage-notes pairing.
