/**
 * Pure, framework-agnostic transitions over a {@link CharacterDoc}. Every
 * function returns a NEW document (no mutation), so they are trivially unit-
 * testable without a DOM and safe to use as React state reducers. The builder UI
 * is a thin view over these; persistence (Dexie) and recompute (engine) live
 * elsewhere. Mirrors DESIGN.md §3.1.
 */
import type { AbilityId, CharacterDoc, ItemInstance, SkillId } from "@pf1/schema";

const ABILITY_IDS: AbilityId[] = ["str", "dex", "con", "int", "wis", "cha"];

/** A fresh, valid level-0 document with default scores and no choices made. */
export function createEmptyDoc(id: string): CharacterDoc {
  return {
    schemaVersion: 1,
    id,
    ownerId: "local",
    version: 1,
    updatedAt: new Date().toISOString(),
    identity: { name: "New Adventurer", race: "", classes: [] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [], prepared: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  };
}

export { ABILITY_IDS };

export function setName(doc: CharacterDoc, name: string): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, name } };
}

export function setAlignment(doc: CharacterDoc, alignment: string): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, alignment } };
}

export function setAbility(
  doc: CharacterDoc,
  ability: AbilityId,
  value: number,
): CharacterDoc {
  const clamped = clampInt(value, 1, 50);
  return { ...doc, abilities: { ...doc.abilities, [ability]: clamped } };
}

export function setRace(doc: CharacterDoc, raceId: string): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, race: raceId } };
}

/** Add a class at level 1 (no-op if the tag is already present). */
export function addClass(doc: CharacterDoc, tag: string): CharacterDoc {
  if (doc.identity.classes.some((c) => c.tag === tag)) return doc;
  const classes = [...doc.identity.classes, { tag, level: 1 }];
  const favoredClass = doc.identity.favoredClass ?? tag;
  return { ...doc, identity: { ...doc.identity, classes, favoredClass } };
}

export function removeClass(doc: CharacterDoc, tag: string): CharacterDoc {
  const classes = doc.identity.classes.filter((c) => c.tag !== tag);
  return { ...doc, identity: { ...doc.identity, classes } };
}

export function setClassLevel(
  doc: CharacterDoc,
  tag: string,
  level: number,
): CharacterDoc {
  const lvl = clampInt(level, 1, 20);
  const classes = doc.identity.classes.map((c) =>
    c.tag === tag ? { ...c, level: lvl } : c,
  );
  return { ...doc, identity: { ...doc.identity, classes } };
}

export function setFavoredClass(doc: CharacterDoc, tag: string): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, favoredClass: tag } };
}

export function setSkillRank(
  doc: CharacterDoc,
  skill: SkillId,
  ranks: number,
): CharacterDoc {
  const r = clampInt(ranks, 0, totalLevel(doc));
  const next = { ...doc.build.skillRanks };
  if (r <= 0) delete next[skill];
  else next[skill] = r;
  return { ...doc, build: { ...doc.build, skillRanks: next } };
}

export function toggleFeat(doc: CharacterDoc, featId: string): CharacterDoc {
  const has = doc.build.feats.includes(featId);
  const feats = has
    ? doc.build.feats.filter((f) => f !== featId)
    : [...doc.build.feats, featId];
  return { ...doc, build: { ...doc.build, feats } };
}

export function toggleKnownSpell(doc: CharacterDoc, spellId: string): CharacterDoc {
  const known = doc.build.spells.known;
  const has = known.includes(spellId);
  const next = has ? known.filter((s) => s !== spellId) : [...known, spellId];
  return { ...doc, build: { ...doc.build, spells: { ...doc.build.spells, known: next } } };
}

export function setGear(doc: CharacterDoc, gear: ItemInstance[]): CharacterDoc {
  return { ...doc, build: { ...doc.build, gear } };
}

/** Total character level (sum of class levels). */
export function totalLevel(doc: CharacterDoc): number {
  return doc.identity.classes.reduce((sum, c) => sum + c.level, 0);
}

function clampInt(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
