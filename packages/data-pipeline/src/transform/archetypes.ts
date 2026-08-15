import { existsSync, readFileSync } from "node:fs";

import type { Archetype, ArchetypeFeature, Class } from "@pf1/schema";

import { isFolderDoc, readPack, type RawDoc } from "../util/packs.js";
import {
  descriptionValue,
  guessLevelFromProse,
  normalizeSources,
  slug,
  type UuidResolver,
} from "./common.js";

/**
 * Reads the previously-vendored `archetype-features.json` (if any — absent on
 * a from-scratch build) purely to recover `.level` for features the new
 * source doesn't itemize with a structured level (see
 * `transformArchetypePack`'s doc comment). Keyed by `${archetypeId}:${slug(featureName)}`
 * — level-independent, since the level is exactly what's missing. Not a
 * general "trust the old data" mechanism: name/description/existence always
 * come from the current source; only the numeric level falls back this way,
 * and only for the minority of features this source doesn't structure.
 */
export function loadLegacyArchetypeFeatureLevels(
  archetypeFeaturesJsonPath: string,
): Map<string, number> {
  const out = new Map<string, number>();
  if (!existsSync(archetypeFeaturesJsonPath)) return out;
  const data = JSON.parse(readFileSync(archetypeFeaturesJsonPath, "utf8")) as Record<
    string,
    { archetypeId: string; name: string; level: number }
  >;
  for (const feature of Object.values(data)) {
    out.set(`${feature.archetypeId}:${slug(feature.name)}`, feature.level);
  }
  return out;
}

/**
 * The dataset names every archetype doc `"<Class> (<Archetype>)"` (e.g.
 * `"Fighter (Archer)"`, `"Bard (Ringleader (UI))"` when a book code
 * disambiguates two same-named archetypes). The bare archetype name is
 * everything from the first `(` to the matching final `)`.
 */
function bareArchetypeName(name: string): string {
  const idx = name.indexOf("(");
  if (idx === -1) return name.trim();
  let rest = name.slice(idx + 1);
  if (rest.endsWith(")")) rest = rest.slice(0, -1);
  return rest.trim();
}

/**
 * Feature docs are named `"<Feature> (<Archetype>)"`, and a handful bake an
 * ability-type tag in before that too (e.g. `"Invulnerability (Ex)
 * (Invulnerable Rager)"`, `"Dismiss (Su) (Spell Specialist)"`). Stripping only
 * the KNOWN trailing `" (<archetypeBareName>)"` (rather than blindly cutting
 * at the first `(`, the mirror image of `bareArchetypeName`) preserves that
 * `(Ex)`/`(Su)` tag — which matters for id stability: the CSV-era dataset
 * baked the same tag into its own feature names, so e.g. `"Invulnerability
 * (Ex)"` reproduces the existing `invulnerability-ex` slug exactly. Falls
 * back to cutting at the last `(` when the exact suffix isn't present
 * verbatim (occasional formatting drift, e.g. a stray space).
 */
function bareFeatureName(name: string, archetypeBareName: string): string {
  const suffix = ` (${archetypeBareName})`;
  if (name.endsWith(suffix)) return name.slice(0, -suffix.length).trim();
  const idx = name.lastIndexOf("(");
  return (idx === -1 ? name : name.slice(0, idx)).trim();
}

/**
 * Foundry `Folder` docs organize `pf-archetypes/` into one subfolder per base
 * class (see `util/packs.ts` `isFolderDoc`). Maps a folder's display name to
 * our class tag(s). Two classes duplicate an entry to a shared source folder
 * rather than distinguishing chained/unchained catalogs, matching how the
 * dataset itself treats them post-errata (an unchained rogue is just "the"
 * rogue in every archetype published after Pathfinder Unchained; likewise
 * barbarian): `rogueUnchained` mirrors `Rogue`, `barbarianUnchained` mirrors
 * `Barbarian`. `Monk`/`Summoner` are handled separately below — the dataset
 * DOES keep a distinct catalog for their Unchained variants, filed in the same
 * folder but with a `-uc-` filename infix.
 */
const FOLDER_TO_CLASS_TAGS: Record<string, string[]> = {
  Alchemist: ["alchemist"],
  Antipaladin: ["antipaladin"],
  Arcanist: ["arcanist"],
  Barbarian: ["barbarian", "barbarianUnchained"],
  Bard: ["bard"],
  Bloodrager: ["bloodrager"],
  Brawler: ["brawler"],
  Cavalier: ["cavalier"],
  Cleric: ["cleric"],
  Druid: ["druid"],
  Fighter: ["fighter"],
  Gunslinger: ["gunslinger"],
  Hunter: ["hunter"],
  Inquisitor: ["inquisitor"],
  Investigator: ["investigator"],
  Kineticist: ["kineticist"],
  Magus: ["magus"],
  Medium: ["medium"],
  Mesmerist: ["mesmerist"],
  Ninja: ["ninja"],
  Occultist: ["occultist"],
  Oracle: ["oracle"],
  Paladin: ["paladin"],
  Psychic: ["psychic"],
  Ranger: ["ranger"],
  Rogue: ["rogue", "rogueUnchained"],
  Samurai: ["samurai"],
  Shaman: ["shaman"],
  Shifter: ["shifter"],
  Skald: ["skald"],
  Slayer: ["slayer"],
  Sorcerer: ["sorcerer"],
  Spiritualist: ["spiritualist"],
  Swashbuckler: ["swashbuckler"],
  Vigilante: ["vigilante"],
  Warpriest: ["warpriest"],
  Witch: ["witch"],
  Wizard: ["wizard"],
  // Companion / Familiar folders hold non-class (animal companion / familiar)
  // archetypes — no matching class tag, so they're simply never emitted.
};

/**
 * Same idea as `FOLDER_TO_CLASS_TAGS`, keyed by the class name text an orphan
 * feature's `system.associations.classes` entry carries (used only for
 * features with no `folder`, see the "vanished-parent recovery" pass in
 * `transformArchetypePack` below). Includes the two Unchained variants, which
 * orphan features spell out
 * explicitly (`"Monk (Unchained)"`, `"Summoner (Unchained)"`) rather than via
 * a filename convention.
 */
const CLASS_NAME_TO_TAGS: Record<string, string[]> = {
  ...FOLDER_TO_CLASS_TAGS,
  Monk: ["monk"],
  "Monk (Unchained)": ["monkUnchained"],
  Summoner: ["summoner"],
  "Summoner (Unchained)": ["summonerUnchained"],
};

/**
 * A handful of `associations.classes` entries carry a stray trailing `)` —
 * upstream authoring noise in the source YAML (unbalanced parens in a
 * flow-list item, e.g. `classes: [Bard)]` instead of `[Bard]`) — harmless
 * once stripped.
 */
function cleanClassName(raw: string): string {
  return raw.replace(/\)+$/, "").trim();
}

/**
 * `links.supplements` entries that point at a feature the archetype does not
 * actually have — confirmed by reading the docs against the published
 * archetypes (aonprd.com). Two defect shapes land here:
 *
 * 1. A single cross-wired link (e.g. Wizard's "Primalist" pointing at a
 *    feature belonging to Bloodrager's own, entirely different, "Primalist"
 *    archetype).
 * 2. Same-named archetypes of DIFFERENT classes sharing one identical
 *    supplements list that is the UNION of every class's real features — so
 *    each class's doc links every other class's features too. Fighter's and
 *    Ranger's "Skirmisher" (Ultimate Wilderness p. 50 / APG p. 128), the
 *    Inquisitor/Investigator/Ranger "Infiltrator" trio (UM p. 45 / ACG
 *    p. 100 / APG p. 125), and the Hunter/Rogue "Roof Runner" pair (Ultimate
 *    Intrigue p. 65 / Ultimate Combat p. 74) are each distinct published
 *    archetypes that merely collide on the name; the entries below cut each
 *    doc's list back to the features its own class's archetype actually has.
 *
 * NOT a general "class mismatch" filter — genuinely shared multi-class
 * archetypes (Divine Hunter, Musketeer, ...) legitimately reference features
 * tagged for their OTHER class, so that broader check produces false
 * positives. Keyed by `${archetype doc _id}:${feature doc _id}`; both halves
 * are verified against the pack by `verifyHandAuthoredTables`.
 */
const MISLINKED_SUPPLEMENTS = new Set<string>([
  // Wizard (Primalist) level-4 supplement resolves to Bloodrager (Primalist)'s
  // own "Primal Choices" feature (bloodrager-only prose: "bloodrager level",
  // "bloodrage") — Wizard's own Primalist has no such feature.
  "9ZCsmhPPdd6BJz1o:D89YgXvbeGfTTijR",
  // Wizard (Scroll Scholar)'s level-1 supplement resolves to a cleric-only
  // "Weapon and Armor Proficiency" swap (the dataset's own doc comment notes
  // Scroll Scholar is shared by clerics AND wizards, "they give up different
  // class abilities" — this specific feature is the cleric half).
  "Dtql9vRY7VG5XtVN:M8A86NznHJUmql2H",
  // Fighter (Skirmisher): Hunter's Tricks belongs to Ranger's Skirmisher
  // ("replaces the ranger's spells class feature"); the fighter archetype's
  // published features are the other six. Also drops the second of the pack's
  // two "Conditioning (Skirmisher)" docs, whose description is the literal
  // string "undefined" — it collides with the real Conditioning doc
  // (9drbcaDXi0bFWOLG) at the same feature id and was shadowing its text.
  "hR437j5U9QRPdNwZ:Kwyaha7WDP7I82X6", // Hunter's Tricks
  "hR437j5U9QRPdNwZ:qOfxQ37HHkTnrBQN", // Conditioning ("undefined" duplicate)
  // Ranger (Skirmisher): the published archetype's only feature is Hunter's
  // Tricks; everything else in the shared list is Fighter's Skirmisher
  // (fighter-only prose: "4 + his Intelligence modifier, instead of 2 +",
  // proficiency cut down from the fighter's full list).
  "CN3ZrOSkzl9OMWOF:IFvrB7zvPNCv6iuC", // Wilderness Training
  "CN3ZrOSkzl9OMWOF:zSGoQujEyu1EkZja", // Weapon and Armor Proficiency
  "CN3ZrOSkzl9OMWOF:9drbcaDXi0bFWOLG", // Conditioning
  "CN3ZrOSkzl9OMWOF:qOfxQ37HHkTnrBQN", // Conditioning ("undefined" duplicate)
  "CN3ZrOSkzl9OMWOF:J4ZvEcg0e85U7MBF", // Reconnaissance Training
  "CN3ZrOSkzl9OMWOF:YKVE8S0tCbk0lyo2", // Mobility Training
  "CN3ZrOSkzl9OMWOF:HPsTMw8CZH5xZ8Ur", // Mobile Mastery
  // Inquisitor (Infiltrator): keeps its four published features (Misdirection,
  // Guileful Lore, Forbidden Lore, Necessary Lies — each "replaces" an
  // inquisitor ability); the rest are Investigator's and Ranger's.
  "SpZMUHMWYxqa8ssB:8ZCE9BFOM05mRb4s", // Master of Disguise (investigator)
  "SpZMUHMWYxqa8ssB:7KFjXgRedy0i6se6", // Voice Mimicry (investigator)
  "SpZMUHMWYxqa8ssB:kulyaQ3ogZeuBL8a", // Mimic Mastery (investigator)
  "SpZMUHMWYxqa8ssB:74ajr14rTXsjEXr9", // Adaptation (ranger)
  // Investigator (Infiltrator): keeps Master of Disguise, Mimic Mastery, and
  // Voice Mimicry ("replaces trapfinding / poison resistance / poison lore");
  // the rest are Inquisitor's and Ranger's.
  "0GKCT3HUv8VPr3c0:Hpl0fQW3Cr7H7Nme", // Misdirection (inquisitor)
  "0GKCT3HUv8VPr3c0:zvtkRWYUhFJF2ijA", // Guileful Lore (inquisitor)
  "0GKCT3HUv8VPr3c0:ozGHZOU4xBqqC1Vc", // Forbidden Lore (inquisitor)
  "0GKCT3HUv8VPr3c0:oE9xetAmBcos6AKZ", // Necessary Lies (inquisitor)
  "0GKCT3HUv8VPr3c0:74ajr14rTXsjEXr9", // Adaptation (ranger)
  // Ranger (Infiltrator): the published archetype's only feature is Adaptation
  // ("replaces favored terrain"); the rest are Inquisitor's and Investigator's.
  "TzrcDsuCb2ZwsAi3:8ZCE9BFOM05mRb4s", // Master of Disguise (investigator)
  "TzrcDsuCb2ZwsAi3:Hpl0fQW3Cr7H7Nme", // Misdirection (inquisitor)
  "TzrcDsuCb2ZwsAi3:zvtkRWYUhFJF2ijA", // Guileful Lore (inquisitor)
  "TzrcDsuCb2ZwsAi3:7KFjXgRedy0i6se6", // Voice Mimicry (investigator)
  "TzrcDsuCb2ZwsAi3:kulyaQ3ogZeuBL8a", // Mimic Mastery (investigator)
  "TzrcDsuCb2ZwsAi3:ozGHZOU4xBqqC1Vc", // Forbidden Lore (inquisitor)
  "TzrcDsuCb2ZwsAi3:oE9xetAmBcos6AKZ", // Necessary Lies (inquisitor)
  // Hunter (Roof Runner): Roof Running and Tumbling Descent are Rogue's Roof
  // Runner ("replaces trapfinding" / "replaces trap sense" — abilities a
  // hunter doesn't have); the hunter archetype's published features are the
  // other five plus its modified proficiency line.
  "AhAT5FR5jo2KerXw:jZhFYjHiYMnZq3TE", // Roof Running
  "AhAT5FR5jo2KerXw:0oeHXFCV7IJTjC6o", // Tumbling Descent
  // Rogue (Roof Runner): the published archetype has only Roof Running and
  // Tumbling Descent; the rest are Hunter's Roof Runner (hunter-only prose:
  // "half her hunter level", "her animal companion", "the hunter's class
  // skills", "A hunter is proficient...").
  "lxH6abiAZBEffNrT:CQJ1Ex3eT4jgZrzz", // Skilled
  "lxH6abiAZBEffNrT:HO6k2YxVvshFcPfk", // Weapon and Armor Proficiency
  "lxH6abiAZBEffNrT:3QNbLf1CBqzH9Cnp", // Natural Leaper
  "lxH6abiAZBEffNrT:oG5TWEejQaHiHL6t", // Shingle Stride
  "lxH6abiAZBEffNrT:PLyFr49ZjT4DIVVF", // Alley Ghost
  "lxH6abiAZBEffNrT:uio7FIXrXryhg5Pw", // Master Climber
]);

/** One hand-authored `links.supplements` entry, with a name to verify on apply. */
interface UnlinkedSupplement {
  /** `pf-arch-features/` doc `_id`. */
  featureId: string;
  /** That doc's `name`, verified against the pack — a rename guard. */
  featureName: string;
  /** Level the archetype grants it at, same meaning as a vendored entry's. */
  level: number;
}

/**
 * Features an archetype's prose describes but its `links.supplements` never
 * lists, keyed by archetype doc `_id`. Without this they reach the orphan pass
 * below, which groups by `tags[0]` — and these docs lead with the CLASS name
 * rather than the archetype's, so that pass would mint a phantom archetype
 * named after the class itself.
 *
 * Psammokinetic (`d4xmlizUWEUqNT3t`) links three of its five features and
 * leaves sand blast and sirocco blast as bare `<h3>` headers in its own prose.
 * Both are level 1: its Burning Winds feature (itself a level-1 supplement)
 * grants them "in place of the air blast and electric blast normally granted
 * to an aerokinetic", and a kineticist has its simple blast from 1st level.
 */
const UNLINKED_SUPPLEMENTS: Record<string, UnlinkedSupplement[]> = {
  d4xmlizUWEUqNT3t: [
    { featureId: "rO0zEswBqBJieKmQ", featureName: "Sand Blast (Psammokinetic)", level: 1 },
    { featureId: "qG4JGsgUO4dmbUeZ", featureName: "Sirocco Blast (Psammokinetic)", level: 1 },
  ],
};

/**
 * Feature docs that belong to no archetype at all, keyed by doc `_id` (value
 * is the doc `name`, verified on apply). The orphan pass would otherwise read
 * their `tags[0]` as an archetype name and synthesize one.
 *
 * "Deeds (Gunslinger)" is the base class's own deed list, filed alongside the
 * per-archetype "Deeds (<Archetype>)" docs that quote its preamble before
 * describing their swaps. Nothing references it, and `class-features.json`
 * already carries the real gunslinger Deeds.
 */
const NON_ARCHETYPE_FEATURES: Record<string, string> = {
  xpkvxEpxvIyFX7EV: "Deeds (Gunslinger)",
};

/**
 * Fails the build if either hand-authored table above no longer matches the
 * pack — an id that vanished or moved to different content silently reverts
 * the phantom archetype it was written to prevent. Same drift-guard posture as
 * `supplements.ts`.
 */
function verifyHandAuthoredTables(
  archById: ReadonlyMap<string, RawDoc>,
  featById: ReadonlyMap<string, RawDoc>,
): void {
  const check = (doc: RawDoc | undefined, id: string, name: string, kind: string): void => {
    if (doc === undefined) {
      throw new Error(`[archetypes] ${kind} "${name}" (${id}) not found in the archetype pack`);
    }
    if (doc.name !== name) {
      throw new Error(
        `[archetypes] ${kind} ${id} is named "${doc.name}" upstream, not "${name}" — ` +
          `the vendored content moved under this id`,
      );
    }
  };

  for (const [archId, entries] of Object.entries(UNLINKED_SUPPLEMENTS)) {
    if (!archById.has(archId)) {
      throw new Error(`[archetypes] archetype ${archId} not found in the archetype pack`);
    }
    for (const entry of entries) {
      check(featById.get(entry.featureId), entry.featureId, entry.featureName, "feature");
    }
  }
  for (const [featId, name] of Object.entries(NON_ARCHETYPE_FEATURES)) {
    check(featById.get(featId), featId, name, "feature");
  }
  for (const key of MISLINKED_SUPPLEMENTS) {
    const [archId, featId] = key.split(":");
    if (archId === undefined || !archById.has(archId)) {
      throw new Error(`[archetypes] mislinked-supplement archetype ${archId} not in the pack`);
    }
    if (featId === undefined || !featById.has(featId)) {
      throw new Error(`[archetypes] mislinked-supplement feature ${featId} not in the pack`);
    }
  }
}

function classTagsForArchetypeDoc(folderName: string, fileBase: string): string[] {
  if (folderName === "Monk") return [/-uc-/.test(fileBase) ? "monkUnchained" : "monk"];
  if (folderName === "Summoner") return [/-uc-/.test(fileBase) ? "summonerUnchained" : "summoner"];
  return FOLDER_TO_CLASS_TAGS[folderName] ?? [];
}

/**
 * Base-class (level → granted feature uuid) pairing candidates: only levels
 * where the class grants exactly one feature, and that feature isn't a
 * "Bonus Feat"-style slot (multiple unrelated picks share that level/name
 * across the game, so a level-only cross-ref can't disambiguate which one an
 * archetype replaces). Everything else stays unpaired — the UI shows the
 * archetype feature's own prose as a soft warning instead of a struck-through
 * swap. Used only as a fallback when a feature carries no `replacesText` at
 * all — see `pairBaseFeature`.
 */
export function pairableBaseFeatureLevels(classDef: Class): Map<number, string> {
  const byLevel = new Map<number, { uuid: string; name: string }[]>();
  for (const f of classDef.features) {
    const grants = byLevel.get(f.level) ?? [];
    grants.push({ uuid: f.uuid, name: f.name });
    byLevel.set(f.level, grants);
  }

  const pairable = new Map<number, string>();
  for (const [level, grants] of byLevel) {
    if (grants.length !== 1) continue;
    if (/bonus feat/i.test(grants[0]!.name)) continue;
    pairable.set(level, grants[0]!.uuid);
  }
  return pairable;
}

/**
 * The same base-class feature grants as {@link pairableBaseFeatureLevels},
 * indexed by normalized name instead of level — the preferred pairing path
 * (see `pairBaseFeature`): an archetype feature's own `replacesText` names
 * the ability it swaps out directly, so this doesn't need the level to be
 * unique, only the name. A name can recur at multiple levels (e.g. a
 * multi-level talent/hex/deed line), so each key keeps every occurrence for
 * `pairBaseFeature`'s level-qualifier disambiguation.
 */
function baseFeatureGrantsByName(classDef: Class): Map<string, { uuid: string; level: number }[]> {
  const byName = new Map<string, { uuid: string; level: number }[]>();
  for (const f of classDef.features) {
    if (/bonus feat/i.test(f.name)) continue;
    const key = singularizePhrase(f.name.toLowerCase().trim());
    const grants = byName.get(key) ?? [];
    grants.push({ uuid: f.uuid, level: f.level });
    byName.set(key, grants);
  }
  return byName;
}

/** Both base-class pairing indexes for one class, built once per (archetype loop, classTag). */
interface PairingContext {
  byLevel: Map<number, string>;
  byName: Map<string, { uuid: string; level: number }[]>;
}

function buildPairingContext(classDef: Class): PairingContext {
  return {
    byLevel: pairableBaseFeatureLevels(classDef),
    byName: baseFeatureGrantsByName(classDef),
  };
}

// --- replaces-text parsing -------------------------------------------------
//
// The archetype source flags a feature doc's `replaces`/`archetypeReplaces`/
// `archetypeLevel` under `flags["pf1-archetypes"]` (free text, e.g. "hex
// gained at 2nd level", "evasion", "slayer talent gained at 2nd level") on
// about a seventh of feature docs. That text drives both a display field
// (`replacesText`) and, when it parses cleanly, a base-feature pairing
// (`pairBaseFeature`) and a level fallback (`resolveFeatureLevel`).

/** Collapse runs of ASCII/NBSP whitespace (block-scalar YAML unwraps to some) into single spaces. */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** A single leading possessive word, e.g. "witch's " or "necrologist's " — noise for both kind and name parsing. */
const POSSESSIVE_PREFIX_RE = /^[a-z]+['’]s\s+/i;
/** A leading article — "the hex gained at..." / "an existing deed". */
const ARTICLE_PREFIX_RE = /^(?:the|an?)\s+/i;
/** "<phrase> [normally] gained at <N>(st|nd|rd|th) level" — the one structured shape `replaces` text takes. */
const GAINED_AT_RE = /^(.+?)\s+(?:normally\s+)?gained at (\d+)(?:st|nd|rd|th) level$/i;

function stripNoisePrefixes(phrase: string): string {
  return phrase.replace(ARTICLE_PREFIX_RE, "").replace(POSSESSIVE_PREFIX_RE, "").trim();
}

/** Lowercase-singularize the last word of a phrase ("slayer talents" -> "slayer talent", "hexes" -> "hex"). */
function singularizePhrase(phrase: string): string {
  const words = phrase.split(" ");
  const last = words.pop();
  if (last === undefined) return phrase;
  let singular = last;
  if (/[a-z]ies$/i.test(last)) singular = last.slice(0, -3) + "y";
  else if (/[a-z](x|ch|sh)es$/i.test(last)) singular = last.slice(0, -2);
  else if (/[a-z]s$/i.test(last) && !/ss$/i.test(last)) singular = last.slice(0, -1);
  words.push(singular);
  return words.join(" ");
}

/**
 * Whether a normalized kind phrase names a per-level "pick one" subsystem
 * (hexes, talents, feats, ...) rather than a single fixed ability. Keyed off
 * the phrase's last word, which is where every observed subsystem name in
 * the source puts its category ("slayer talent", "rage power", "magus
 * arcana", ...).
 */
const SUBSYSTEM_SLOT_LAST_WORDS = new Set([
  "hex",
  "hexes",
  "talent",
  "talents",
  "feat",
  "feats",
  "exploit",
  "exploits",
  "trick",
  "tricks",
  "arcana",
  "discovery",
  "discoveries",
  "power",
  "powers",
  "blessing",
  "blessings",
]);

function isSubsystemSlotKind(kind: string): boolean {
  const lastWord = kind.trim().split(/\s+/).pop() ?? "";
  return SUBSYSTEM_SLOT_LAST_WORDS.has(lastWord.toLowerCase());
}

/**
 * A clean, single-target "gained at Nth level" match, or `undefined` for
 * anything with more than one target (a comma list, an " and " conjunction)
 * or no such phrase at all. Shared by `parseReplacesSlot` (subsystem slots)
 * and `pairBaseFeature`'s level-qualifier disambiguation.
 */
function matchGainedAt(replacesText: string): { kind: string; level: number } | undefined {
  if (replacesText.includes(",") || /\band\b/i.test(replacesText)) return undefined;
  const m = GAINED_AT_RE.exec(replacesText);
  if (!m) return undefined;
  return { kind: stripNoisePrefixes(m[1]!), level: Number(m[2]) };
}

/**
 * Parses `replacesText` into a subsystem grant slot when it unambiguously
 * names one — either "<subsystem> gained at Nth level" or a bare subsystem
 * name with no level at all (e.g. a hex-altering feature that isn't tied to
 * any one level's pick, like Mountain Witch's Stone Spirit Hex). Multi-target
 * text (commas, "and") and single named abilities ("evasion", "track") never
 * produce a slot — the latter are exactly what `pairBaseFeature` needs left
 * alone so it can match them by name instead.
 */
function parseReplacesSlot(replacesText: string): { kind: string; level?: number } | undefined {
  const gainedAt = matchGainedAt(replacesText);
  if (gainedAt) {
    if (!isSubsystemSlotKind(gainedAt.kind)) return undefined;
    return { kind: singularizePhrase(gainedAt.kind.toLowerCase()), level: gainedAt.level };
  }
  if (replacesText.includes(",") || /\band\b/i.test(replacesText)) return undefined;
  const bare = stripNoisePrefixes(replacesText);
  if (!isSubsystemSlotKind(bare)) return undefined;
  return { kind: singularizePhrase(bare.toLowerCase()) };
}

/**
 * Matches `replacesText` (once it's been ruled out as a subsystem slot) by
 * name against the base class's own feature grants, preferring an exact
 * single match; when the same name recurs at several levels (a multi-level
 * talent/deed line), the "gained at Nth level" qualifier picks the right one.
 * Never called for slot text — a subsystem slot has no single `Class.features`
 * grant to pair against.
 */
function pairByName(
  replacesText: string,
  byName: Map<string, { uuid: string; level: number }[]>,
): string | undefined {
  if (replacesText.includes(",") || /\band\b/i.test(replacesText)) return undefined;
  const gainedAt = matchGainedAt(replacesText);
  const namePhrase = gainedAt ? gainedAt.kind : stripNoisePrefixes(replacesText);
  const key = singularizePhrase(namePhrase.toLowerCase());
  const candidates = byName.get(key);
  if (!candidates || candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0]!.uuid;
  if (gainedAt === undefined) return undefined;
  const atLevel = candidates.filter((c) => c.level === gainedAt.level);
  return atLevel.length === 1 ? atLevel[0]!.uuid : undefined;
}

/**
 * Pairs an archetype feature to a base-class grant it replaces. A feature
 * with `replacesText` is matched by name (`pairByName`) — preferred because
 * it survives base-class levels where several features are granted at once,
 * which defeats the level-only heuristic entirely (e.g. every base class
 * level that also grants a talent/deed alongside its named feature). A
 * feature with no `replacesText` at all falls back to the old level-collision
 * heuristic. A feature whose text parsed as a subsystem slot never pairs —
 * there's no single grant a "hex" or "bonus feat" slot could mean.
 */
function pairBaseFeature(
  replacesText: string | undefined,
  replacesSlot: { kind: string; level?: number } | undefined,
  level: number,
  pairing: PairingContext,
): string | undefined {
  if (replacesText === undefined) return pairing.byLevel.get(level);
  if (replacesSlot) return undefined;
  return pairByName(replacesText, pairing.byName);
}

interface ArchetypeReplacesFlags {
  replacesText?: string;
  isReplacement?: boolean;
  archetypeLevel?: number;
}

function archetypeReplacesFlags(doc: RawDoc): ArchetypeReplacesFlags {
  const flags = doc.flags as Record<string, unknown> | undefined;
  const pf = flags?.["pf1-archetypes"] as Record<string, unknown> | undefined;
  if (!pf) return {};
  const replacesText =
    typeof pf.replaces === "string" ? collapseWhitespace(pf.replaces) : undefined;
  const isReplacement =
    typeof pf.archetypeReplaces === "boolean" ? pf.archetypeReplaces : undefined;
  const archetypeLevel = typeof pf.archetypeLevel === "number" ? pf.archetypeLevel : undefined;
  return {
    ...(replacesText !== undefined && replacesText !== "" ? { replacesText } : {}),
    ...(isReplacement !== undefined ? { isReplacement } : {}),
    ...(archetypeLevel !== undefined ? { archetypeLevel } : {}),
  };
}

function abilityTypeOf(sys: Record<string, unknown>): "ex" | "su" | "sp" | undefined {
  return sys.abilityType === "ex" || sys.abilityType === "su" || sys.abilityType === "sp"
    ? sys.abilityType
    : undefined;
}

/**
 * Class-table chassis rows ("alters the class table" entries like Hexes,
 * Bonus Feats, Class Skills) that genuinely have no single level — never
 * worth prose-guessing a level for, since their description talks about
 * several levels at once (a hex/spell/talent list spanning the whole class
 * progression) and any "Nth level" phrase found there would be someone else's
 * level, not this row's.
 */
const CHASSIS_FEATURE_NAMES = new Set([
  "class skills",
  "skills",
  "weapon and armor proficiency",
  "weapon and armor proficiencies",
  "weapon proficiency",
  "armor proficiency",
  "alignment",
  "hex",
  "hexes",
  "major hex",
  "major hexes",
  "grand hex",
  "grand hexes",
  "patron",
  "patron spells",
  "spells",
  "spellcasting",
  "bonus feat",
  "bonus feats",
  "slayer talents",
  "advanced slayer talents",
  "rogue talents",
  "discoveries",
  "skill ranks per level",
]);

/**
 * A stricter "At Nth level" scrape than `guessLevelFromProse`: no default-to-1
 * (an unleveled feature should stay unleveled, not silently become 1st), only
 * an explicit match in the opening sentence or two counts (a level mentioned
 * deep in the mechanics is someone else's, not the grant level), and chassis
 * rows are skipped outright — see `CHASSIS_FEATURE_NAMES`.
 */
function guessLevelFromOpeningProse(
  name: string,
  description: string | undefined,
): number | undefined {
  if (CHASSIS_FEATURE_NAMES.has(name.toLowerCase())) return undefined;
  if (!description) return undefined;
  const opening = description.split(/<\/p>/i).slice(0, 2).join(" ");
  const m = /\bat\s+(\d+)(?:st|nd|rd|th)\s+level\b/i.exec(opening);
  return m ? Number(m[1]) : undefined;
}

/**
 * Resolves the `.level` FIELD (never the id — see below) from, in order: an
 * explicit signal that already won outright under the pre-existing rules
 * (`s.level` on the supplements path, a previously-vendored level on the
 * inline-prose/orphan paths — passed in as `explicitLevel`), the source's own
 * `archetypeLevel` flag, a level qualifier parsed off `replacesText` ("hex
 * gained at 2nd level" implies the replacement lands at 2nd level too), a
 * strict opening-prose scrape, and finally `oldLevel` — exactly what the
 * pre-existing rules would have produced with no further guessing (0 on the
 * supplements path, a default-to-1st-level prose guess on the others).
 * `oldLevel` as the last resort means this can only ever improve on the
 * previous result, never regress it.
 *
 * Deliberately separate from the id: `id`/`uuid` embed `oldLevel` always (see
 * `makeFeature`), matching the standing `SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL`
 * posture of correcting `.level` while leaving a feature's id/uuid — and
 * anything keyed off them, like `@pf1/engine`'s `archetype-effects.ts` —
 * exactly where they were.
 */
function resolveFeatureLevel(
  explicitLevel: number | undefined,
  oldLevel: number,
  flags: ArchetypeReplacesFlags,
  replacesSlot: { kind: string; level?: number } | undefined,
  name: string,
  description: string | undefined,
): number {
  if (explicitLevel !== undefined) return explicitLevel;
  if (flags.archetypeLevel !== undefined) return flags.archetypeLevel;
  if (replacesSlot?.level !== undefined) return replacesSlot.level;
  return guessLevelFromOpeningProse(name, description) ?? oldLevel;
}

function makeFeature(
  archetypeId: string,
  archetypeBareName: string,
  classTag: string,
  featDoc: RawDoc,
  oldLevel: number,
  explicitLevel: number | undefined,
  pairing: PairingContext,
  resolveUuid: UuidResolver,
): ArchetypeFeature {
  const name = bareFeatureName(featDoc.name, archetypeBareName);
  // `id`/`uuid` always embed `oldLevel` — the exact value the pre-existing
  // rules would have produced — never the (possibly better-informed) `level`
  // field below. See `resolveFeatureLevel`'s doc comment.
  const id = `${archetypeId}:${slug(name)}:${oldLevel}`;
  const sys = (featDoc.system ?? {}) as Record<string, unknown>;
  const description = descriptionValue(sys, resolveUuid);
  const flags = archetypeReplacesFlags(featDoc);
  const replacesSlot =
    flags.replacesText !== undefined ? parseReplacesSlot(flags.replacesText) : undefined;
  const level = resolveFeatureLevel(
    explicitLevel,
    oldLevel,
    flags,
    replacesSlot,
    name,
    description,
  );
  return {
    id,
    uuid: `archetype-feature:${id}`,
    name,
    archetypeId,
    classTag,
    level,
    description,
    sources: normalizeSources(sys.sources),
    pairedBaseFeatureUuid: pairBaseFeature(flags.replacesText, replacesSlot, level, pairing),
    ...(flags.replacesText !== undefined ? { replacesText: flags.replacesText } : {}),
    ...(flags.isReplacement !== undefined ? { isReplacement: flags.isReplacement } : {}),
    ...(replacesSlot ? { replacesSlot } : {}),
    ...(abilityTypeOf(sys) !== undefined ? { abilityType: abilityTypeOf(sys) } : {}),
  };
}

function tagsOf(doc: RawDoc): string[] {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const t = sys.tags;
  return Array.isArray(t) ? t.filter((v): v is string => typeof v === "string") : [];
}

function classesOf(doc: RawDoc): string[] {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const assoc = sys.associations as Record<string, unknown> | undefined;
  const classes = assoc?.classes;
  return Array.isArray(classes)
    ? classes.filter((v): v is string => typeof v === "string").map(cleanClassName)
    : [];
}

/**
 * Reads the vendored archetype YAML packs and produces `Archetype` +
 * `ArchetypeFeature` entries matching the CSV-era normalized shape and id
 * convention (`<classTag>:<slug>` / `<archetypeId>:<featureSlug>:<level>`), so
 * existing `CharacterDoc.build.archetypes` references keep resolving.
 *
 * `pf-archetypes/` holds one doc per archetype, filed under a per-class
 * `Folder`; most link their sub-features via `system.links.supplements`
 * (`{level, uuid}` pairs resolved against `pf-arch-features/`). A minority
 * (~3.5%) fold everything into one inline-prose doc with no supplements list
 * at all — for those, and for archetypes whose *entire* doc is themselves
 * missing from `pf-archetypes/` (the dataset restructured a few multi-variant
 * mechanics, e.g. Paladin's Sacred Oaths, as freestanding features with no
 * archetype wrapper), features are recovered by grouping `pf-arch-features/`
 * items by their shared `tags[0]` value instead. Those recovered features
 * have no structured level, so it's taken from the previously-vendored data
 * when the same (archetype, feature) pair existed before (continuity for
 * existing `CharacterDoc`s and the hand-authored `@pf1/engine`
 * `archetype-effects.ts` table that keys off these exact ids), falling back to
 * a "Nth level" scrape of the feature's own prose for anything genuinely new.
 */
export function transformArchetypePack(
  archetypesDir: string,
  archFeaturesDir: string,
  classesByTag: ReadonlyMap<string, Class>,
  legacyFeatureLevels: ReadonlyMap<string, number>,
  resolveUuid: UuidResolver,
): { archetypes: Archetype[]; archetypeFeatures: ArchetypeFeature[] } {
  const archPack = readPack(archetypesDir);
  const featPack = readPack(archFeaturesDir).filter((pf) => !isFolderDoc(pf.doc));
  const featById = new Map(featPack.map((pf) => [pf.doc._id, pf.doc]));

  const folderNameById = new Map(
    archPack.filter((pf) => isFolderDoc(pf.doc)).map((pf) => [pf.doc._id, pf.doc.name]),
  );

  verifyHandAuthoredTables(
    new Map(archPack.filter((pf) => !isFolderDoc(pf.doc)).map((pf) => [pf.doc._id, pf.doc])),
    featById,
  );

  const archetypes: Archetype[] = [];
  const archetypeFeatures: ArchetypeFeature[] = [];
  /** `${classTag}:${archetypeSlug}` for every archetype we emit — guards the orphan pass below from re-creating one that already exists. */
  const claimedKeys = new Set<string>();
  /** Feature ids already attached to some archetype via `links.supplements` — excluded from the orphan grouping below. */
  const consumedFeatureIds = new Set<string>();

  for (const pf of archPack) {
    if (isFolderDoc(pf.doc)) continue;
    const doc = pf.doc;
    const folderName = typeof doc.folder === "string" ? folderNameById.get(doc.folder) : undefined;
    if (!folderName) continue;
    const fileBase = pf.relPath.split("/").pop() ?? "";
    const classTags = classTagsForArchetypeDoc(folderName, fileBase);
    if (classTags.length === 0) continue; // Companion/Familiar/unmapped — not a class archetype

    const bareName = bareArchetypeName(doc.name);
    const archetypeSlug = slug(bareName);
    const sys = (doc.system ?? {}) as Record<string, unknown>;
    const description = descriptionValue(sys, resolveUuid);
    const sources = normalizeSources(sys.sources);
    const links = sys.links as Record<string, unknown> | undefined;
    const vendoredSupplements = Array.isArray(links?.supplements)
      ? (links.supplements as { level?: number; uuid?: string }[])
      : [];
    const supplements = [
      ...vendoredSupplements,
      ...(UNLINKED_SUPPLEMENTS[doc._id] ?? []).map((s) => ({ level: s.level, uuid: s.featureId })),
    ];

    for (const classTag of classTags) {
      if (!classesByTag.has(classTag)) continue; // class not in this slice yet
      const archetypeId = `${classTag}:${archetypeSlug}`;
      claimedKeys.add(archetypeId);
      archetypes.push({
        id: archetypeId,
        uuid: `archetype:${archetypeId}`,
        name: bareName,
        classTag,
        description,
        sources,
      });

      const pairing = buildPairingContext(classesByTag.get(classTag)!);

      for (const s of supplements) {
        const uuid = s.uuid;
        if (typeof uuid !== "string") continue;
        const featureId = uuid.split(".").pop();
        if (featureId !== undefined && MISLINKED_SUPPLEMENTS.has(`${doc._id}:${featureId}`))
          continue;
        const featDoc = featureId ? featById.get(featureId) : undefined;
        if (!featDoc || featureId === undefined) continue;
        consumedFeatureIds.add(featureId);
        const explicitLevel = typeof s.level === "number" ? s.level : undefined;
        const oldLevel = explicitLevel ?? 0;
        archetypeFeatures.push(
          makeFeature(
            archetypeId,
            bareName,
            classTag,
            featDoc,
            oldLevel,
            explicitLevel,
            pairing,
            resolveUuid,
          ),
        );
      }

      // Inline-prose archetype (no vendored links.supplements) — recover
      // features by matching pf-arch-features items tagged with this
      // archetype's own name, same fallback as the orphan pass below. Gated on
      // the VENDORED list, so a hand-authored `UNLINKED_SUPPLEMENTS` entry adds
      // to an archetype without switching off its tag-based recovery.
      if (vendoredSupplements.length === 0) {
        for (const fp of featPack) {
          if (consumedFeatureIds.has(fp.doc._id)) continue;
          if (tagsOf(fp.doc)[0] !== bareName) continue;
          consumedFeatureIds.add(fp.doc._id);
          const name = bareFeatureName(fp.doc.name, bareName);
          const legacyLevel = legacyFeatureLevels.get(`${archetypeId}:${slug(name)}`);
          const oldLevel =
            legacyLevel ?? guessLevelFromProse(descriptionValue(fp.doc.system ?? {}, resolveUuid));
          archetypeFeatures.push(
            makeFeature(
              archetypeId,
              bareName,
              classTag,
              fp.doc,
              oldLevel,
              legacyLevel,
              pairing,
              resolveUuid,
            ),
          );
        }
      }
    }
  }

  // --- vanished-parent recovery -----------------------------------------
  // Group every still-unconsumed feature by its tag[0] + resolved class(es).
  // A group whose (classTag, slug) key was never claimed above means the
  // dataset dropped that archetype's wrapper doc entirely (e.g. Paladin's
  // Sacred Oaths) — synthesize a minimal Archetype (name only, no prose of
  // its own — each feature carries its own description) so the id survives.
  const groups = new Map<string, { tag: string; docs: RawDoc[] }>();
  for (const fp of featPack) {
    if (consumedFeatureIds.has(fp.doc._id)) continue;
    if (fp.doc._id in NON_ARCHETYPE_FEATURES) continue;
    const tag = tagsOf(fp.doc)[0];
    if (!tag) continue;
    const key = `${tag}${classesOf(fp.doc).join(",")}`;
    const group = groups.get(key) ?? { tag, docs: [] };
    group.docs.push(fp.doc);
    groups.set(key, group);
  }

  for (const { tag, docs } of groups.values()) {
    const archetypeSlug = slug(tag);
    const classNames = classesOf(docs[0]!);
    const candidateTags = classNames.flatMap((c) => CLASS_NAME_TO_TAGS[c] ?? []);

    for (const classTag of candidateTags) {
      const archetypeId = `${classTag}:${archetypeSlug}`;
      if (claimedKeys.has(archetypeId) || !classesByTag.has(classTag)) continue;
      claimedKeys.add(archetypeId);
      archetypes.push({
        id: archetypeId,
        uuid: `archetype:${archetypeId}`,
        name: tag,
        classTag,
      });

      const pairing = buildPairingContext(classesByTag.get(classTag)!);
      for (const featDoc of docs) {
        const name = bareFeatureName(featDoc.name, tag);
        const legacyLevel = legacyFeatureLevels.get(`${archetypeId}:${slug(name)}`);
        const oldLevel =
          legacyLevel ?? guessLevelFromProse(descriptionValue(featDoc.system ?? {}, resolveUuid));
        archetypeFeatures.push(
          makeFeature(
            archetypeId,
            tag,
            classTag,
            featDoc,
            oldLevel,
            legacyLevel,
            pairing,
            resolveUuid,
          ),
        );
      }
    }
  }

  return { archetypes, archetypeFeatures };
}

/**
 * The archetype source migrated two witch archetypes from an inline-prose doc
 * to a mechanically-structured one at some point, and left both behind under
 * slightly different spellings rather than replacing the original — confirmed
 * by reading all four source docs: same source page each time, one member of
 * each pair a `links.supplements`-driven doc under a misspelled name
 * (`Rhetorican`, `Tatterdermalion`), the other the original correctly-spelled
 * inline-prose doc it superseded (`Rhetorician`, `Tatterdemalion`, one with
 * zero structured features, the other's features folded into the surviving
 * doc's prose). A sweep for other same-class archetype names within edit
 * distance 2 turned up mostly coincidental near-misses with their own
 * distinct sources (druid's Bat/Bear/Boar Shaman, rogue's
 * Sapper/Sniper/Sharper, ...) — left alone. Two more, though, are a
 * DIFFERENT split-archetype defect this table doesn't cover: antipaladin's
 * Rough Rampage/Rough Rampager and paladin's Virtuoso Bravo/Virtuous Bravo
 * each have exactly one real wrapper doc (the archetype's actual name,
 * description, and sources) whose own features are tagged under a
 * *different* spelling than the wrapper's name, so the vanished-parent
 * recovery pass below synthesizes a second, sourceless archetype under the
 * features' tag spelling to hold them — not the doc-duplication pattern this
 * table merges, so left for separate handling.
 */
const ARCHETYPE_DEDUP_MERGES: { keep: string; drop: string; displayName: string }[] = [
  { keep: "witch:rhetorican", drop: "witch:rhetorician", displayName: "Rhetorician" },
  { keep: "witch:tatterdermalion", drop: "witch:tatterdemalion", displayName: "Tatterdemalion" },
];

/**
 * Applies `ARCHETYPE_DEDUP_MERGES` in place: renames the surviving archetype
 * to its correctly-spelled display name, drops the duplicate archetype entry,
 * and carries over any of the dropped doc's features the surviving doc
 * doesn't already have under the same name (re-keyed to the surviving
 * archetype's id) before dropping the rest. Unlike the level-resolution and
 * pairing changes elsewhere in this module, this deliberately DOES change a
 * handful of ids — the dropped archetype and its unique-by-name features
 * never existed as far as any `CharacterDoc` should be concerned, since the
 * two entries were always the same archetype under a data-entry typo.
 */
export function mergeDuplicateArchetypes(
  archetypes: Archetype[],
  archetypeFeatures: ArchetypeFeature[],
): void {
  for (const { keep, drop, displayName } of ARCHETYPE_DEDUP_MERGES) {
    const keptIndex = archetypes.findIndex((a) => a.id === keep);
    if (keptIndex === -1) continue;
    archetypes[keptIndex] = { ...archetypes[keptIndex]!, name: displayName };

    const droppedIndex = archetypes.findIndex((a) => a.id === drop);
    if (droppedIndex !== -1) archetypes.splice(droppedIndex, 1);

    const keptNames = new Set(
      archetypeFeatures.filter((f) => f.archetypeId === keep).map((f) => f.name.toLowerCase()),
    );
    for (const f of archetypeFeatures) {
      if (f.archetypeId !== drop || keptNames.has(f.name.toLowerCase())) continue;
      f.archetypeId = keep;
      f.id = `${keep}:${slug(f.name)}:${f.level}`;
      f.uuid = `archetype-feature:${f.id}`;
    }
    for (let i = archetypeFeatures.length - 1; i >= 0; i--) {
      if (archetypeFeatures[i]!.archetypeId === drop) archetypeFeatures.splice(i, 1);
    }
  }
}
