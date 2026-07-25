/**
 * Runs the mechanical half of a reference-data bump — fetch, then build,
 * then format — in the order that avoids the whitespace-diff trap
 * documented in docs/refdata-update.md (the emitter writes one-element-per-
 * line JSON; skipping `fmt` makes every vendored file show as changed).
 *
 * Does NOT edit `FOUNDRY_SHA` / `SYSTEM_VERSION` (packages/data-pipeline/src/config.ts)
 * or a hand-authored supplement (e.g. supplements.ts) — that's the
 * deliberate, reviewed part of the procedure and stays a manual edit. Run
 * this script after making that edit. See docs/refdata-update.md for the
 * full procedure.
 *
 * Run via `bun run data:bump`.
 */
import { execFileSync, spawnSync } from "node:child_process";

function run(command: string, args: string[]): void {
  console.log(`\n[refdata-bump] $ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`[refdata-bump] "${command} ${args.join(" ")}" failed (exit ${result.status}).`);
    process.exit(result.status ?? 1);
  }
}

function configChanged(): boolean {
  try {
    const diff = execFileSync(
      "git",
      ["diff", "--name-only", "HEAD", "--", "packages/data-pipeline/src/config.ts"],
      { encoding: "utf8" },
    ).trim();
    return diff.length > 0;
  } catch {
    // Not a git checkout, or git unavailable — don't block on it.
    return true;
  }
}

if (!configChanged()) {
  console.warn(
    "[refdata-bump] warning: packages/data-pipeline/src/config.ts has no pending changes. " +
      "Bump FOUNDRY_SHA / SYSTEM_VERSION (or edit a data supplement) before running this, " +
      "or the fetch+build will just reproduce the current pin.",
  );
}

run("bun", ["run", "data:fetch"]);
run("bun", ["run", "data:build"]);
run("bun", ["run", "fmt"]);

console.log(`
[refdata-bump] Done. Next:
  1. Review the diff:      git diff --stat packages/data-pipeline/data
  2. Run engine tests:     bun run --filter @pf1/engine test
  3. Run the full suite if the diff looks broad: bun run test
  4. Commit config.ts (or the supplement) together with packages/data-pipeline/data.
`);
