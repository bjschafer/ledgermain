<!-- Describe the change and the why. See CONTRIBUTING.md for conventions. -->

## Checklist

- [ ] `bun run typecheck`, `lint`, `fmt:check`, `test` green locally (CI re-checks)
- [ ] Engine changes have hand-computed fixture tests that cite the rulebook source
- [ ] Player-visible change → entry in `apps/web/src/model/changelog.ts` (or N/A)
- [ ] `apps/web/src/model/coverageNotes.ts` touched at all (gap filled, gap found, or copy reworded) → `bun run coverage:issue --write` run to re-sync #74; on a fork, say so here instead and a maintainer syncs it (or N/A)
- [ ] No Foundry system source copied, transcribed, or consulted while implementing (behavioral test oracle only)
