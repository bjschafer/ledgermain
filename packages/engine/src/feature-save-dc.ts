/**
 * Turns the "DC = 10 + 1/2 witch level + Int mod" formula prose the
 * hand-authored subsystem tables carry in their `contextNotes` into the actual
 * number for THIS character, so the sheet shows "DC 19" where the rulebook
 * shows an equation.
 *
 * Every one of these phrases is written by this repo (hexes, rage powers,
 * cruelties, ninja tricks, rogue/slayer/investigator talents, revelations,
 * bloodline powers,...), not scraped from the vendored compendium, so the set
 * is finite and enumerable — {@link SAVE_DC_PHRASES} below is the whole of it.
 * Substitution is exact-string, never a regex over prose: an unlisted phrasing
 * is left untouched rather than half-parsed, and so is any phrase naming a
 * class the character has no levels in. Both degrade to today's behavior
 * (the formula, verbatim), which is wrong-looking but never wrong.
 *
 * The formulas themselves are all the same published `10 + 1/2 class level +
 * ability modifier` shape as `tables.ts`'s `witchHexDC`/`channelEnergy` — the
 * only reason this lives apart from those is that it maps a SENTENCE to that
 * math rather than being asked for a number directly.
 */

import type { AbilityId, CharacterDoc } from "@pf1/schema";

import type { AbilityView } from "./rolldata.js";

/** `"character"` keys off total character level (sum of class levels) rather than one class. */
type SaveDCClass = string | "character";

interface SaveDCPhrase {
  /** Exact text following "DC " / "DC = " in a hand-authored contextNote. */
  phrase: string;
  cls: SaveDCClass;
  ability: AbilityId;
  /**
   * The `ability-dcs.ts` family (`ABILITY_DC_FAMILIES` key) this phrase's
   * math is ALSO the formula for, when one exists — set only for a phrase
   * that maps 1:1 onto a family instance (today: the witch hex phrase and
   * the antipaladin cruelty phrase; NOT the alchemist Con-based phrase,
   * which is a different alchemist DC than the Int-based `bomb` family). When
   * set and `SaveDCContext.familyDCs` carries a value for it, `dcFor` prefers
   * that value over recomputing from `ability`/`cls` — the two are
   * mathematically identical absent an `abilityDC.<family>` modifier, but
   * only the family-DC path reflects one.
   */
  family?: string;
}

/**
 * Chained/unchained pairs share their subsystem's talent tables, so a rogue
 * talent's note says "rogue level" even for an unchained rogue. Resolving a
 * phrase's class takes the highest level across the aliased tags.
 */
const CLASS_ALIASES: Record<string, readonly string[]> = {
  barbarian: ["barbarian", "barbarianUnchained"],
  monk: ["monk", "monkUnchained"],
  rogue: ["rogue", "rogueUnchained"],
  summoner: ["summoner", "summonerUnchained"],
};

/**
 * Every save-DC formula phrase the hand-authored tables use, verbatim. Match
 * order is longest-first at substitution time, so a phrase that is a prefix of
 * another ("...+ Int mod" vs "...+ Int modifier") can't shadow it.
 */
export const SAVE_DC_PHRASES: readonly SaveDCPhrase[] = [
  { phrase: "10 + 1/2 witch level + Int mod", cls: "witch", ability: "int", family: "hex" },
  { phrase: "10 + 1/2 slayer level + Int modifier", cls: "slayer", ability: "int" },
  { phrase: "10 + 1/2 investigator level + Int mod", cls: "investigator", ability: "int" },
  { phrase: "10 + 1/2 ninja level + Int modifier", cls: "ninja", ability: "int" },
  { phrase: "10 + 1/2 barbarian level + Cha mod", cls: "barbarian", ability: "cha" },
  { phrase: "10 + 1/2 barbarian level + Con mod", cls: "barbarian", ability: "con" },
  { phrase: "10 + 1/2 barbarian level + Str mod", cls: "barbarian", ability: "str" },
  {
    phrase: "10 + 1/2 antipaladin level + Cha mod",
    cls: "antipaladin",
    ability: "cha",
    family: "cruelty",
  },
  { phrase: "10 + half alchemist level + Con modifier", cls: "alchemist", ability: "con" },
  { phrase: "10 + half oracle level + Charisma modifier", cls: "oracle", ability: "cha" },
  { phrase: "10 + half sorcerer level + Charisma modifier", cls: "sorcerer", ability: "cha" },
  { phrase: "10 + half sorcerer level + Constitution modifier", cls: "sorcerer", ability: "con" },
  { phrase: "10 + half rogue level + Intelligence modifier", cls: "rogue", ability: "int" },
  { phrase: "10 + half rogue level + Charisma modifier", cls: "rogue", ability: "cha" },
  { phrase: "10 + 1/2 rogue level + Intelligence modifier", cls: "rogue", ability: "int" },
  { phrase: "10 + 1/2 rogue level + Dexterity modifier", cls: "rogue", ability: "dex" },
  { phrase: "10 + 1/2 magus level + Intelligence modifier", cls: "magus", ability: "int" },
  {
    phrase: "10 + 1/2 bloodrager level + Constitution modifier",
    cls: "bloodrager",
    ability: "con",
  },
  { phrase: "10 + 1/2 bloodrager level + Con mod", cls: "bloodrager", ability: "con" },
  { phrase: "10 + half your level + Intelligence modifier", cls: "character", ability: "int" },
  { phrase: "10 + 1/2 character level + Int modifier", cls: "character", ability: "int" },
  { phrase: "10 + 1/2 character level + Int mod", cls: "character", ability: "int" },
  { phrase: "10 + 1/2 character level + Charisma modifier", cls: "character", ability: "cha" },
];

/** Longest phrase first: prevents a shorter phrase from consuming a longer one's prefix. */
const BY_LENGTH = [...SAVE_DC_PHRASES].sort((a, b) => b.phrase.length - a.phrase.length);

/** What a character brings to the formula: class levels and final ability modifiers. */
export interface SaveDCContext {
  classLevels: Readonly<Record<string, number>>;
  characterLevel: number;
  abilityMods: Readonly<Partial<Record<AbilityId, number>>>;
  /**
   * Final ability-DC family totals (`ability-dcs.ts`'s `ComputedAbilityDCs.
   * familyDCs`) — when a phrase names a `family` present here, `dcFor`
   * substitutes this number instead of recomputing from `ability`/`cls`, so a
   * modifier the player applied to that family (an `abilityDC.<family>`
   * Change) shows up in the note text the same way it shows up on the
   * ability-DC panel. Absent for a caller (or an old snapshot) that hasn't
   * computed ability DCs — `dcFor` falls back to the plain formula, byte
   * -identical to before this field existed.
   */
  familyDCs?: Readonly<Record<string, number>>;
}

export function saveDCContext(
  doc: CharacterDoc,
  abilities?: Record<AbilityId, AbilityView>,
  familyDCs?: Readonly<Record<string, number>>,
): SaveDCContext {
  const classLevels: Record<string, number> = {};
  let characterLevel = 0;
  for (const c of doc.identity.classes) {
    classLevels[c.tag] = (classLevels[c.tag] ?? 0) + c.level;
    characterLevel += c.level;
  }
  const abilityMods: Partial<Record<AbilityId, number>> = {};
  if (abilities) {
    for (const [id, view] of Object.entries(abilities)) {
      abilityMods[id as AbilityId] = view.mod;
    }
  }
  return { classLevels, characterLevel, abilityMods, familyDCs };
}

/** The level the phrase's named class contributes, or 0 when the character has none of it. */
function levelFor(cls: SaveDCClass, ctx: SaveDCContext): number {
  if (cls === "character") return ctx.characterLevel;
  const tags = CLASS_ALIASES[cls] ?? [cls];
  return Math.max(0, ...tags.map((t) => ctx.classLevels[t] ?? 0));
}

/**
 * The computed DC for one phrase, or `null` when the character has no levels
 * in its class or no computed modifier for its ability — the two cases where
 * substituting would print a confidently wrong number.
 */
function dcFor(entry: SaveDCPhrase, ctx: SaveDCContext): number | null {
  const level = levelFor(entry.cls, ctx);
  if (level <= 0) return null;
  const familyDC = entry.family !== undefined ? ctx.familyDCs?.[entry.family] : undefined;
  if (familyDC !== undefined) return familyDC;
  const mod = ctx.abilityMods[entry.ability];
  if (mod === undefined) return null;
  return 10 + Math.floor(level / 2) + mod;
}

/**
 * Replaces every recognized save-DC formula in `text` with the number it works
 * out to. Both authored spellings of the lead-in are handled: `DC = <formula>`
 * (the `note(...)` style) and `DC <formula>` (the parenthetical style); both
 * collapse to `DC <n>`.
 */
export function resolveSaveDCText(text: string, ctx: SaveDCContext): string {
  let out = text;
  for (const entry of BY_LENGTH) {
    if (!out.includes(entry.phrase)) continue;
    const dc = dcFor(entry, ctx);
    if (dc === null) continue;
    out = out.split(`DC = ${entry.phrase}`).join(`DC ${dc}`);
    out = out.split(`DC ${entry.phrase}`).join(`DC ${dc}`);
  }
  return out;
}
