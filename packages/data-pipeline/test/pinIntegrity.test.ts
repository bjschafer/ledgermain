import { describe, expect, it } from "bun:test";

import {
  ARCHETYPE_SHA,
  FOUNDRY_SHA,
  loadRefData,
  PF_CONTENT_SHA,
  PFDATA_SHA,
  SCHEMA_VERSION,
  SYSTEM_VERSION,
} from "../src/index.js";

/**
 * The vendored `data/` directory is generated from four pinned upstream SHAs,
 * and nothing about editing a pin forces the regeneration that should follow
 * it. CI never touches the network, so a pin-only change would otherwise go
 * green while `data/` still describes the old commit.
 *
 * That gap is what makes automated pin bumps safe to accept at all: Renovate
 * can move a pin but cannot regenerate the data behind it (see
 * `.github/workflows/refdata-sync.yml`, which does the regeneration on the
 * branch). If that workflow is skipped, silently fails, or is removed, these
 * assertions are what turns the result into a red check rather than a dataset
 * whose provenance is a lie.
 *
 * Failing here means one thing: run `bun run data:bump` and commit `data/`
 * alongside the pin. See docs/refdata-update.md.
 */
const ref = loadRefData();

const FAILURE_HINT = "run `bun run data:bump` and commit packages/data-pipeline/data/ with the pin";

describe("pin integrity", () => {
  it("records every pinned source the data was generated from", () => {
    expect(ref.meta.sourcePins, FAILURE_HINT).toEqual({
      foundry: FOUNDRY_SHA,
      archetypes: ARCHETYPE_SHA,
      pfContent: PF_CONTENT_SHA,
      pfData: PFDATA_SHA,
    });
  });

  it("agrees with the legacy Foundry-only provenance fields", () => {
    expect(ref.meta.sourceSha, FAILURE_HINT).toBe(FOUNDRY_SHA);
    expect(ref.meta.sourcePins.foundry).toBe(ref.meta.sourceSha);
    expect(ref.meta.systemVersion, FAILURE_HINT).toBe(SYSTEM_VERSION);
    expect(ref.meta.dataVersion).toBe(`${SYSTEM_VERSION}+${FOUNDRY_SHA.slice(0, 12)}`);
  });

  it("was emitted by the current schema version", () => {
    expect(ref.meta.schemaVersion, FAILURE_HINT).toBe(SCHEMA_VERSION);
  });

  it("pins full 40-character commits, never a branch or short SHA", () => {
    for (const [source, sha] of Object.entries(ref.meta.sourcePins)) {
      expect(sha, `${source} pin`).toMatch(/^[0-9a-f]{40}$/);
    }
  });
});
