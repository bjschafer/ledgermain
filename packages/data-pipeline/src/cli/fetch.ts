/**
 * Fetches the Foundry PF1 repo at the EXACT pinned SHA into the gitignored cache.
 *
 * Uses a shallow fetch of a single commit (no branch checkout), which is fast and
 * deterministic. Safe to re-run: if the clone already sits at the pinned SHA it
 * is a no-op.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";

import { CACHE_DIR, CLONE_DIR, FOUNDRY_REPO, FOUNDRY_SHA } from "../config.js";

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    stdio: ["ignore", "pipe", "inherit"],
    encoding: "utf8",
  }).trim();
}

function currentSha(): string | null {
  try {
    return git(["rev-parse", "HEAD"], CLONE_DIR);
  } catch {
    return null;
  }
}

function main(): void {
  if (currentSha() === FOUNDRY_SHA) {
    console.log(`[fetch] clone already at pinned SHA ${FOUNDRY_SHA} — skipping.`);
    return;
  }

  // Start clean to avoid mixing histories from a previous (different) SHA.
  if (existsSync(CLONE_DIR)) {
    console.log(`[fetch] removing stale clone at ${CLONE_DIR}`);
    rmSync(CLONE_DIR, { recursive: true, force: true });
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(CLONE_DIR, { recursive: true });

  console.log(`[fetch] initializing clone for ${FOUNDRY_REPO}`);
  git(["init", "-q"], CLONE_DIR);
  git(["remote", "add", "origin", FOUNDRY_REPO], CLONE_DIR);

  console.log(`[fetch] fetching pinned commit ${FOUNDRY_SHA} (depth 1)`);
  git(["fetch", "--depth", "1", "origin", FOUNDRY_SHA], CLONE_DIR);
  git(["checkout", "-q", "FETCH_HEAD"], CLONE_DIR);

  const sha = currentSha();
  if (sha !== FOUNDRY_SHA) {
    throw new Error(
      `[fetch] post-checkout SHA mismatch: expected ${FOUNDRY_SHA}, got ${sha}`,
    );
  }
  console.log(`[fetch] done — clone is at ${sha}`);
}

main();
