/**
 * Fetches all four pinned upstream repos (Foundry PF1 system + the archetype
 * dataset fork + the PF1 Content community feats module + Pf Data 1e) at
 * their EXACT pinned SHAs into the gitignored cache.
 *
 * Uses a shallow fetch of a single commit (no branch checkout), which is fast and
 * deterministic. Safe to re-run: a clone already sitting at its pinned SHA is a
 * no-op.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";

import {
  ARCHETYPE_CLONE_DIR,
  ARCHETYPE_REPO,
  ARCHETYPE_SHA,
  CACHE_DIR,
  CLONE_DIR,
  FOUNDRY_REPO,
  FOUNDRY_SHA,
  PF_CONTENT_CLONE_DIR,
  PF_CONTENT_REPO,
  PF_CONTENT_SHA,
  PFDATA_CLONE_DIR,
  PFDATA_REPO,
  PFDATA_SHA,
} from "../config.js";

function git(args: string[], cwd?: string): string {
  return execFileSync("git", args, {
    cwd,
    stdio: ["ignore", "pipe", "inherit"],
    encoding: "utf8",
  }).trim();
}

function currentSha(dir: string): string | null {
  try {
    return git(["rev-parse", "HEAD"], dir);
  } catch {
    return null;
  }
}

/** Shallow-fetch a single pinned commit into `dir`, replacing any stale clone. */
function fetchPinned(label: string, repo: string, sha: string, dir: string): void {
  if (currentSha(dir) === sha) {
    console.log(`[fetch] ${label}: clone already at pinned SHA ${sha} — skipping.`);
    return;
  }

  // Start clean to avoid mixing histories from a previous (different) SHA.
  if (existsSync(dir)) {
    console.log(`[fetch] ${label}: removing stale clone at ${dir}`);
    rmSync(dir, { recursive: true, force: true });
  }
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(dir, { recursive: true });

  console.log(`[fetch] ${label}: initializing clone for ${repo}`);
  git(["init", "-q"], dir);
  git(["remote", "add", "origin", repo], dir);

  console.log(`[fetch] ${label}: fetching pinned commit ${sha} (depth 1)`);
  git(["fetch", "--depth", "1", "origin", sha], dir);
  git(["checkout", "-q", "FETCH_HEAD"], dir);

  const got = currentSha(dir);
  if (got !== sha) {
    throw new Error(`[fetch] ${label}: post-checkout SHA mismatch: expected ${sha}, got ${got}`);
  }
  console.log(`[fetch] ${label}: done — clone is at ${got}`);
}

function main(): void {
  fetchPinned("foundry-pf1", FOUNDRY_REPO, FOUNDRY_SHA, CLONE_DIR);
  fetchPinned("pf1e-archetypes", ARCHETYPE_REPO, ARCHETYPE_SHA, ARCHETYPE_CLONE_DIR);
  fetchPinned("pf1-content", PF_CONTENT_REPO, PF_CONTENT_SHA, PF_CONTENT_CLONE_DIR);
  fetchPinned("pfdata", PFDATA_REPO, PFDATA_SHA, PFDATA_CLONE_DIR);
}

main();
