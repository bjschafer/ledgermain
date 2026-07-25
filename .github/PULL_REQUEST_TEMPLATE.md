<!-- Describe the change and the why. See CONTRIBUTING.md for conventions. -->

## Checklist

- [ ] `bun run typecheck`, `lint`, `fmt:check`, `test` green locally (CI re-checks)
- [ ] Engine changes have hand-computed fixture tests that cite the rulebook source
- [ ] Player-visible change → entry in `apps/web/src/model/changelog.ts` (or N/A)
- [ ] Coverage gap filled/found → `apps/web/src/model/coverageNotes.ts` updated and `bun run coverage:issue` output synced to #74 (or N/A)
- [ ] No Foundry system source copied, transcribed, or consulted while implementing (behavioral test oracle only)
