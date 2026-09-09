/**
 * The schema-migration chain for stored {@link CharacterDoc}s — the only
 * safety net for every character the Worker has ever persisted, so it is an
 * ordered list of small steps rather than one function that grows a branch
 * per backfill.
 *
 * A step declares the `schemaVersion` a document carries once it has run;
 * {@link migrateDoc} applies every step above the document's own version and
 * then stamps {@link CURRENT_SCHEMA_VERSION}. Several steps may share a `to`
 * (they shipped together), and each is independently idempotent, so a step
 * that has effectively already run is a no-op rather than a corruption.
 *
 * Adding a backfill means appending a step — a new `to` one above the current
 * version, bumping {@link CURRENT_SCHEMA_VERSION} to match — and a test for
 * it. Never edit a shipped step: documents in the wild already carry the
 * version that says it ran.
 */
import type { CharacterDoc } from "@pf1/schema";

import { normalizeAlignmentCode } from "./names.js";

/**
 * The version {@link migrateDoc} brings documents up to, and the one
 * `createEmptyDoc` stamps on a new character.
 *
 * History: v1 was the original shape. v2 separated the spellbook from the
 * daily prepare/cast loop and added cleric domain slots. v3 collects the two
 * backfills that shipped afterwards as optional fields without a bump — every
 * document stored before v3 predates both, so gating them at v3 reaches all
 * of them.
 */
export const CURRENT_SCHEMA_VERSION = 3;

interface Migration {
  /** The `schemaVersion` a document carries once this step has run. */
  readonly to: number;
  /** Stable identifier for the step, used by its test. */
  readonly id: string;
  /** Idempotent; returns `doc` unchanged when there is nothing to do. */
  readonly apply: (doc: CharacterDoc) => CharacterDoc;
}

/** Preparation moved to live state; older docs have no `live.spells` at all. */
function addLiveSpells(doc: CharacterDoc): CharacterDoc {
  if (doc.live.spells) return doc;
  return { ...doc, live: { ...doc.live, spells: { prepared: [] } } };
}

/** `build.spells.prepared` was always empty and unused — keep only `known`. */
function dropLegacyPreparedList(doc: CharacterDoc): CharacterDoc {
  const spells = doc.build.spells as
    | (CharacterDoc["build"]["spells"] & { prepared?: unknown })
    | undefined;
  if (!spells || !("prepared" in spells)) return doc;
  return { ...doc, build: { ...doc.build, spells: { known: spells.known ?? [] } } };
}

/** Backfill the canonical empty array so `includes` checks can't crash. */
function addClericDomains(doc: CharacterDoc): CharacterDoc {
  if (doc.build.clericDomains) return doc;
  return { ...doc, build: { ...doc.build, clericDomains: [] } };
}

/** Same treatment for the archetype list. */
function addArchetypes(doc: CharacterDoc): CharacterDoc {
  if (doc.build.archetypes) return doc;
  return { ...doc, build: { ...doc.build, archetypes: [] } };
}

/**
 * Alignment stored as a full label ("Neutral Good") instead of a code ("NG"):
 * older imports and pre-normalization saves carry the label form, which the
 * Identity select can't match (it silently showed "—"). Unknown strings are
 * kept as-is — the sheet renders them raw.
 */
function normalizeAlignment(doc: CharacterDoc): CharacterDoc {
  const { alignment } = doc.identity;
  if (!alignment) return doc;
  const code = normalizeAlignmentCode(alignment);
  if (!code || code === alignment) return doc;
  return { ...doc, identity: { ...doc.identity, alignment: code } };
}

/** Ordered by `to`, ascending. Enforced by `migrations.test.ts`. */
export const MIGRATIONS: readonly Migration[] = [
  { to: 2, id: "live-spells", apply: addLiveSpells },
  { to: 2, id: "drop-legacy-prepared", apply: dropLegacyPreparedList },
  { to: 2, id: "cleric-domains", apply: addClericDomains },
  { to: 3, id: "archetypes", apply: addArchetypes },
  { to: 3, id: "alignment-code", apply: normalizeAlignment },
];

function versionOf(doc: CharacterDoc): number {
  return Number.isFinite(doc.schemaVersion) ? doc.schemaVersion : 0;
}

/**
 * Bring a document we stored ourselves (Dexie, or a sync pull from another
 * device) up to {@link CURRENT_SCHEMA_VERSION}. Returns `doc` unchanged when
 * it is already current — or newer, which happens when a device on an older
 * build reads what a newer one wrote; downgrading it would lose data the
 * other device still needs.
 */
export function migrateDoc(doc: CharacterDoc): CharacterDoc {
  const from = versionOf(doc);
  if (from >= CURRENT_SCHEMA_VERSION) return doc;
  let next = doc;
  for (const step of MIGRATIONS) {
    if (from < step.to) next = step.apply(next);
  }
  return { ...next, schemaVersion: CURRENT_SCHEMA_VERSION };
}

/**
 * Same chain, but every step runs regardless of the version the file claims.
 * Import is the one place untrusted JSON enters the system: a hand-edited or
 * foreign export can carry a current `schemaVersion` over a shape that never
 * went through these steps, and a stamp we didn't write isn't evidence they
 * ran. Every step is idempotent, so re-running them costs nothing.
 */
export function migrateImportedDoc(doc: CharacterDoc): CharacterDoc {
  let next = doc;
  for (const step of MIGRATIONS) next = step.apply(next);
  return next.schemaVersion === CURRENT_SCHEMA_VERSION
    ? next
    : { ...next, schemaVersion: Math.max(versionOf(next), CURRENT_SCHEMA_VERSION) };
}
