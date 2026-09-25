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
 * of them. v4 moved picks off catalog entries that were dropped as duplicates
 * of another entry.
 */
export const CURRENT_SCHEMA_VERSION = 4;

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

/** The system pack's Skill Focus, which takes its skill through a picker. */
export const SKILL_FOCUS_ID = "7zJTztNW7hdaqjKc";

/**
 * The community pack's one-per-skill copies of Skill Focus, dropped from the
 * catalog, mapped to the skill id each one named. The Craft, Perform and
 * Profession copies stored an instance pick of their own, so they carry that
 * pick over instead (null here).
 */
export const SKILL_FOCUS_COPIES: Readonly<Record<string, string | null>> = {
  xgRstzkd1nDznrjH: "acr",
  vkie3lLGq6LgYp8D: "apr",
  fyP8yuS4Wd8RxV5r: "art",
  Vi8Fh4JceKVHZ7jK: "blf",
  eLQUV5Hswm8vNLfE: "clm",
  pslODOJK0u0wOxqL: null, // Craft
  sQi2KLYCUMUZ1zj3: "dip",
  GkcekdZwcwMwI6ss: "dev",
  qWcruct7zqZyKtbX: "dis",
  vdQNZjiXvUQiwmvk: "esc",
  cKTRogbjMedE2Dk5: "fly",
  G3yPmoVa0D7uIbEF: "han",
  MMZxRlkELezwGDlL: "hea",
  "7mcNePI93Co2JbPF": "int",
  Vvz4wGmyxEdAaJa0: "kar",
  LmV6WT0Dv5FZO4Qy: "kdu",
  UHGTb3NPHxp6v7yl: "ken",
  r9XAvlQ9lvVRl5LA: "kge",
  zes8vxX3D6CKoYC2: "khi",
  CT5OvOkf7Z2KxPxa: "klo",
  WMfe0yuef5IYgE7i: "kna",
  IGlL6mwZTu6RScYr: "kno",
  sUwMFZMDtVqqLswV: "kpl",
  weePoRFNXCKBgP1S: "kre",
  TA7qGwyL5uXk7dfP: "lin",
  "6Unilb6yyaehF9fv": "lor",
  "9yua5ZlomvDj1c7D": "per",
  kSI3WpP2rsR2VRH5: null, // Perform
  lXmRbAWO1KhZuBuh: null, // Profession
  Z7kvSCJd3aMgwXrn: "rid",
  kNe3aEHS1byqAX50: "sen",
  zWybSUTo0L3ti0Ve: "slt",
  iuyQGv9f6vdPC1Nj: "spl",
  "2JWwVMFeqHnFDFSv": "ste",
  XnJjz7As3jJkS4iF: "sur",
  ZRkknePy6wjAgoVH: "swm",
  s6Sy6KxxYSXDOmJa: "umd",
};

/**
 * Every character-held copy becomes an instance of the real Skill Focus with
 * the copy's skill as its pick, in the copy's place, keeping any slot pin. A
 * companion's or eidolon's feat list holds bare ids with no pick, so a copy
 * there just becomes Skill Focus.
 */
function foldSkillFocusCopies(doc: CharacterDoc): CharacterDoc {
  const isCopy = (id: string) => id in SKILL_FOCUS_COPIES;
  const { build } = doc;
  const touched =
    build.feats.some(isCopy) ||
    (build.extraFeats ?? []).some((e) => isCopy(e.featId)) ||
    (build.animalCompanion?.feats ?? []).some(isCopy) ||
    (build.eidolon?.feats ?? []).some(isCopy);
  if (!touched) return doc;

  const feats: string[] = [];
  const extraFeats: NonNullable<typeof build.extraFeats> = [];
  const featChoices = { ...build.featChoices };
  const pins = { ...build.featSlotAssignments };
  const movePin = (from: string, to: string) => {
    if (pins[from] === undefined) return;
    pins[to] = pins[from];
    delete pins[from];
  };

  for (const id of build.feats) {
    if (!isCopy(id)) {
      feats.push(id);
      continue;
    }
    const choice = SKILL_FOCUS_COPIES[id] ?? featChoices[id];
    delete featChoices[id];
    // The first copy takes the primary slot unless the doc already has the
    // real feat; every other copy becomes an extra instance.
    if (!feats.includes(SKILL_FOCUS_ID) && !build.feats.includes(SKILL_FOCUS_ID)) {
      feats.push(SKILL_FOCUS_ID);
      if (choice !== undefined) featChoices[SKILL_FOCUS_ID] = choice;
      movePin(id, SKILL_FOCUS_ID);
    } else {
      const instanceId = `feat-${id}`;
      extraFeats.push({ instanceId, featId: SKILL_FOCUS_ID, choiceId: choice });
      movePin(id, instanceId);
    }
  }
  for (const extra of build.extraFeats ?? []) {
    if (!isCopy(extra.featId)) {
      extraFeats.push(extra);
      continue;
    }
    const choiceId = SKILL_FOCUS_COPIES[extra.featId] ?? extra.choiceId;
    extraFeats.push({ instanceId: extra.instanceId, featId: SKILL_FOCUS_ID, choiceId });
  }

  const foldList = (list: string[] | undefined) =>
    list && [...new Set(list.map((id) => (isCopy(id) ? SKILL_FOCUS_ID : id)))];
  return {
    ...doc,
    build: {
      ...build,
      feats,
      extraFeats: extraFeats.length > 0 ? extraFeats : undefined,
      featChoices,
      featSlotAssignments: build.featSlotAssignments && pins,
      animalCompanion: build.animalCompanion && {
        ...build.animalCompanion,
        feats: foldList(build.animalCompanion.feats),
      },
      eidolon: build.eidolon && { ...build.eidolon, feats: foldList(build.eidolon.feats) },
    },
  };
}

/**
 * Magic items the catalog listed once under a bare family name at the
 * entry-level price, dropped because the pack already carries that grade as
 * its own item. Each maps to the same-priced grade, or to null where several
 * grades share that price (the pair a Physical Might belt boosts, which robe
 * of the archmagi) and the doc never said which.
 */
export const BARE_FAMILY_ITEMS: Readonly<Record<string, string | null>> = {
  "mi:amulet_of_mighty_fists": "z53icVRLBTR7A4Nq",
  "mi:amulet_of_natural_armor": "9Uxwqax0pLPyT2j7",
  "mi:bag_of_holding": "K1PJo4dWwVcYbTp7",
  "mi:belt_of_giant_strength": "eIxzoEGDNZXWgnKk",
  "mi:belt_of_incredible_dexterity": "PC3K6eeXRdUwJxLA",
  "mi:belt_of_mighty_constitution": "5ZivT8vBANjQLueE",
  "mi:belt_of_physical_might": null,
  "mi:belt_of_physical_perfection": "gTcqkPOYxuBehsPW",
  "mi:bracers_of_armor": "w7NKnt0TAYj17XSK",
  "mi:cloak_of_resistance": "MrxwYWWezbJTZLog",
  "mi:crystal_ball": "oQ7j3DzDCogrBn3T",
  "mi:dusty_rose_prism": "71VGp1a4z1BQFNXu",
  "mi:headband_of_alluring_charisma": "sv1iKPTOpaiZMOWk",
  "mi:headband_of_inspired_wisdom": "lIPJinb2J7sEB0Ng",
  "mi:headband_of_mental_prowess": null,
  "mi:headband_of_mental_superiority": "crea6OdTB5SvkjjL",
  "mi:headband_of_vast_intelligence": "lrKImXw2wiv8DCD1",
  "mi:ring_of_protection": "iCuo14damYkdjuD5",
  "mi:robe_of_the_archmagi": null,
};

/** What an unresolvable bare-family entry keeps, so it reads as it did. */
const BARE_FAMILY_FALLBACK: Readonly<Record<string, { name: string; price: number }>> = {
  "mi:belt_of_physical_might": { name: "Belt of Physical Might", price: 10000 },
  "mi:headband_of_mental_prowess": { name: "Headband of Mental Prowess", price: 10000 },
  "mi:robe_of_the_archmagi": { name: "Robe of the Archmagi", price: 75000 },
};

/**
 * Gear on a dropped bare-family item moves to its same-priced grade, which
 * carries the bonus the bare entry never did. Where the grade is ambiguous
 * the entry becomes a named custom item with its old price and weight, which
 * is all the bare entry ever contributed.
 */
function remapBareFamilyItems(doc: CharacterDoc): CharacterDoc {
  const gear = doc.build.gear;
  if (!gear.some((g) => g.itemId !== undefined && g.itemId in BARE_FAMILY_ITEMS)) return doc;
  const remapped = gear.map((g) => {
    if (g.itemId === undefined || !(g.itemId in BARE_FAMILY_ITEMS)) return g;
    const target = BARE_FAMILY_ITEMS[g.itemId];
    if (target) return { ...g, itemId: target };
    const fallback = BARE_FAMILY_FALLBACK[g.itemId]!;
    const { itemId: _dropped, ...rest } = g;
    return {
      ...rest,
      name: g.name ?? fallback.name,
      price: g.price ?? fallback.price,
      weight: g.weight ?? 1,
    };
  });
  return { ...doc, build: { ...doc.build, gear: remapped } };
}

/** Ordered by `to`, ascending. Enforced by `migrations.test.ts`. */
export const MIGRATIONS: readonly Migration[] = [
  { to: 2, id: "live-spells", apply: addLiveSpells },
  { to: 2, id: "drop-legacy-prepared", apply: dropLegacyPreparedList },
  { to: 2, id: "cleric-domains", apply: addClericDomains },
  { to: 3, id: "archetypes", apply: addArchetypes },
  { to: 3, id: "alignment-code", apply: normalizeAlignment },
  { to: 4, id: "fold-skill-focus-copies", apply: foldSkillFocusCopies },
  { to: 4, id: "remap-bare-family-items", apply: remapBareFamilyItems },
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
