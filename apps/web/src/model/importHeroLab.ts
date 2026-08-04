/**
 * Hero Lab classic importer — reads either a `.por` portfolio (the file Hero
 * Lab saves; a ZIP holding the exports below plus Hero Lab's own native save
 * files) or a bare statblock XML export on its own. Hero Lab *Online* is a
 * different, newer product with a different schema and is not supported.
 *
 * Written against a real Pathfinder 1e portfolio saved by Hero Lab classic
 * 8.8.8h / Pathfinder data set 14.20, so the element and attribute names
 * below are observed rather than guessed. It stays deliberately tolerant all
 * the same — each concept is searched for anywhere in the tree by a short
 * list of candidate names, so a neighbouring data-set version that moves or
 * renames a section degrades to "that part didn't come across" instead of
 * failing the whole import.
 *
 * What the statblock XML is and isn't good for: it reports a *computed*
 * character (the numbers Hero Lab arrived at), while a `CharacterDoc` stores
 * the *choices* that produce those numbers. Fields that are genuinely build
 * inputs come across directly (`<attrvalue base>`, `<skill ranks>`, chosen
 * feats). Everything the statblock only states as a total is left to our own
 * engine to recompute rather than pinned to Hero Lab's answer.
 *
 * Two consequences worth knowing:
 *   - Ability scores are quoted WITH racial modifiers applied, so they're
 *     flagged `abilitiesIncludeRacial` and backed out at build time.
 *   - Feats Hero Lab granted automatically (`useradded="no"`: weapon/armor
 *     proficiencies, a class's bonus Improved Unarmed Strike) are skipped.
 *     Our engine grants those itself, and importing them as *chosen* feats
 *     would spend feat slots the character never spent.
 *
 * This is personal-use tooling, not a compatibility promise.
 */
import type { AbilityId, RefData } from "@pf1/schema";

import {
  buildDocFromExternalData,
  emptyExternalData,
  matchAbilityId,
  type ExternalCharacterData,
} from "./externalImport.js";
import { attrValue, findAllTags, findFirstTag, nodeText, parseXml, type XmlNode } from "./xml.js";
import { readZip } from "./zip.js";

const CHARACTER_TAGS = ["character", "pc", "hero", "actor"];
const RACE_TAGS = ["race", "ancestry"];
const CLASS_TAGS = ["class", "characterclass"];
const ATTRIBUTE_TAGS = ["attribute", "ability", "stat"];
const FEAT_TAGS = ["feat"];
const SKILL_TAGS = ["skill"];
const LANGUAGE_TAGS = ["language"];
const MONEY_TAGS = ["money", "coins", "currency", "gold"];
const HEALTH_TAGS = ["health"];
const TRACKED_TAGS = ["trackedresource"];
/**
 * Inventory lives in exactly these two sections. Deliberately NOT `<defenses>`
 * or `<melee>`/`<ranged>`, which re-list the same worn armor and weapons a
 * second time (plus placeholder rows like "Natural armor" and "Unarmed
 * strike" that aren't objects the character is carrying at all).
 */
const GEAR_SECTION_TAGS = ["gear", "magicitems"];
const ITEM_TAGS = ["item"];

const NAME_ATTRS = ["name", "text"];
const LEVEL_ATTRS = ["level", "levels"];
const RANKS_ATTRS = ["ranks", "rank", "points"];
const QUANTITY_ATTRS = ["quantity", "qty", "count"];

function isNodeTag(node: XmlNode, names: readonly string[]): boolean {
  return names.some((n) => n.toLowerCase() === node.tag.toLowerCase());
}

/** Find the character-scope element to search within; falls back to the document root itself. */
function findScope(root: XmlNode): XmlNode {
  if (isNodeTag(root, CHARACTER_TAGS)) return root;
  return findFirstTag(root, CHARACTER_TAGS) ?? root;
}

/** A node's "name": either an attribute or its own text content. */
function displayName(node: XmlNode): string | undefined {
  return attrValue(node, NAME_ATTRS) || nodeText(node) || undefined;
}

/** A single field that might be an attribute directly on `scope`, or a named child element. */
function scalarField(scope: XmlNode, tags: readonly string[]): string | undefined {
  const direct = attrValue(scope, tags);
  if (direct) return direct;
  const child = findFirstTag(scope, tags);
  return child ? displayName(child) : undefined;
}

function toNumber(raw: string | undefined, fallback = 0): number {
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Strip the mechanical annotation Hero Lab appends to a feat's display name —
 * "Combat Expertise +/-2", "Power Attack -2/+4" — leaving the name that
 * actually appears in the reference data.
 *
 * Only a trailing run of signs and digits is removed, so a parenthesized name
 * that's part of the real feat ("Armor Proficiency (Light)", "Skill Focus
 * (Perception)") is left alone. No published PF1 feat name ends in a bare
 * signed number, which is what makes this safe to apply unconditionally.
 */
export function cleanFeatName(raw: string): string {
  const stripped = raw.replace(/\s+[-+/\d]+$/, "").trim();
  return /[a-z]/i.test(stripped) ? stripped : raw.trim();
}

/**
 * Strip Hero Lab's trailing annotations from a tracked resource's name —
 * "Knockout (1/day, DC 17) (Ex)" -> "Knockout" — so it can be matched against
 * the pools our own engine derives. Removes only trailing groups that are an
 * ability-type tag or state a rate/DC, never a parenthetical that's part of
 * the feature's real name.
 */
export function cleanResourceName(raw: string): string {
  let out = raw.trim();
  for (;;) {
    const next = out
      .replace(/\s*\((?:Ex|Su|Sp|Ps)\)$/i, "")
      .replace(/\s*\([^()]*(?:\/day|\/week|\/hour|\/round|\bDC\s*\d+)[^()]*\)$/i, "");
    if (next === out) return out;
    out = next.trim();
  }
}

/** Strip Hero Lab's container-state annotation: "Backpack (empty)" -> "Backpack". */
function cleanItemName(raw: string): string {
  return raw.replace(/\s*\((?:empty|full)\)$/i, "").trim();
}

/**
 * Split a magic item's enhancement bonus off its base name, since the two are
 * stored separately: "+1 chain shirt" -> `{ name: "chain shirt",
 * enhancement: 1 }`. A name with no leading bonus comes back unchanged.
 */
export function splitEnhancement(raw: string): { name: string; enhancement: number } {
  const m = /^\+(\d+)\s+(.*)$/.exec(raw.trim());
  return m
    ? { name: m[2]!.trim(), enhancement: Number(m[1]) }
    : { name: raw.trim(), enhancement: 0 };
}

/** Reduce a parsed Hero Lab statblock XML tree to {@link ExternalCharacterData}. */
export function heroLabXmlToIntermediate(root: XmlNode): ExternalCharacterData {
  const scope = findScope(root);
  const data = emptyExternalData();

  data.name = scalarField(scope, NAME_ATTRS);
  data.race = scalarField(scope, RACE_TAGS);
  data.alignment = scalarField(scope, ["alignment"]);
  data.deity = scalarField(scope, ["deity"]);

  // Gender and age sit on <personal>, but stay readable as direct attributes
  // too so a bare hand-made <character gender="..."> fixture still works.
  const personal = findFirstTag(scope, ["personal"]) ?? scope;
  data.gender = attrValue(personal, ["gender", "sex"]) ?? scalarField(scope, ["gender", "sex"]);
  data.age = attrValue(personal, ["age"]) ?? scalarField(scope, ["age"]);

  for (const node of findAllTags(scope, CLASS_TAGS)) {
    const name = displayName(node);
    if (name) data.classes.push({ name, level: toNumber(attrValue(node, LEVEL_ATTRS), 1) });
  }

  // Scores are quoted post-racial and post-item: <attrvalue base="18"
  // modified="20"/> is an 18 with a +2 belt on. `base` is the one that
  // reflects the build; `modified` folds in gear the doc already carries.
  for (const node of findAllTags(scope, ATTRIBUTE_TAGS)) {
    const rawName = attrValue(node, ["name", "abbr", "id"]);
    if (!rawName) continue;
    const ability = matchAbilityId(rawName);
    if (!ability) continue;
    const valueNode = findFirstTag(node, ["attrvalue"]);
    const score =
      (valueNode && attrValue(valueNode, ["base"])) ?? attrValue(node, ["score", "value", "base"]);
    if (score != null) data.abilities[ability] = toNumber(score);
  }
  data.abilitiesIncludeRacial = true;

  for (const node of findAllTags(scope, FEAT_TAGS)) {
    // `useradded="no"` marks a feat Hero Lab granted from race/class rather
    // than one the player spent a slot on — see the module doc comment.
    if (attrValue(node, ["useradded"])?.toLowerCase() === "no") continue;
    const name = displayName(node);
    if (name) data.feats.push(cleanFeatName(name));
  }

  for (const node of findAllTags(scope, SKILL_TAGS)) {
    const name = attrValue(node, NAME_ATTRS);
    if (name) data.skills.push({ name, ranks: toNumber(attrValue(node, RANKS_ATTRS), 0) });
  }

  for (const node of findAllTags(scope, LANGUAGE_TAGS)) {
    const name = displayName(node);
    if (name) data.languages.push(name);
  }

  // <defenses> is where worn armor carries its stats. Natural armor is a
  // placeholder row for the creature's own hide, not a thing being worn.
  const defenses = findFirstTag(scope, ["defenses"]);
  const armorNames = new Set<string>();
  if (defenses) {
    for (const node of findAllTags(defenses, ["armor", "shield"])) {
      if (attrValue(node, ["natural"])?.toLowerCase() === "yes") continue;
      const raw = displayName(node);
      if (!raw) continue;
      armorNames.add(raw.trim().toLowerCase());
      const { name, enhancement } = splitEnhancement(raw);
      (data.armor ??= []).push({ name, ...(enhancement ? { enhancement } : {}) });
    }
  }

  const seenGear = new Set<string>();
  for (const section of findAllTags(scope, GEAR_SECTION_TAGS)) {
    for (const node of findAllTags(section, ITEM_TAGS)) {
      const raw = displayName(node) ?? "";
      // Worn armor is listed here as well as under <defenses>; it goes in as
      // real armor, so skip the duplicate rather than adding a second,
      // stat-less copy alongside it.
      if (armorNames.has(raw.trim().toLowerCase())) continue;
      const name = cleanItemName(raw);
      if (!name || seenGear.has(name.toLowerCase())) continue;
      seenGear.add(name.toLowerCase());
      const quantity = attrValue(node, QUANTITY_ATTRS);
      data.gear.push({ name, quantity: quantity != null ? toNumber(quantity, 1) : undefined });
    }
  }

  data.favoredClass = findFirstTag(scope, ["favoredclass"])
    ? displayName(findFirstTag(scope, ["favoredclass"])!)
    : undefined;

  const moneyNode = findFirstTag(scope, MONEY_TAGS);
  if (moneyNode) {
    const pp = attrValue(moneyNode, ["pp", "platinum"]);
    const gp = attrValue(moneyNode, ["gp", "gold"]);
    const sp = attrValue(moneyNode, ["sp", "silver"]);
    const cp = attrValue(moneyNode, ["cp", "copper"]);
    if (pp != null) data.money.pp = toNumber(pp);
    if (gp != null) data.money.gp = toNumber(gp);
    if (sp != null) data.money.sp = toNumber(sp);
    if (cp != null) data.money.cp = toNumber(cp);
  }

  const health = findFirstTag(scope, HEALTH_TAGS);
  if (health) {
    const current = attrValue(health, ["currenthp"]);
    const max = attrValue(health, ["hitpoints"]);
    const nonlethal = attrValue(health, ["nonlethal"]);
    data.hp = {
      ...(current != null ? { current: toNumber(current) } : {}),
      ...(max != null ? { max: toNumber(max) } : {}),
      ...(nonlethal != null ? { nonlethal: toNumber(nonlethal) } : {}),
    };
  }

  const tracked = findAllTags(scope, TRACKED_TAGS);
  if (tracked.length > 0) {
    data.resources = [];
    for (const node of tracked) {
      const name = attrValue(node, NAME_ATTRS);
      if (!name) continue;
      data.resources.push({
        name: cleanResourceName(name),
        used: toNumber(attrValue(node, ["used"]), 0),
        max: toNumber(attrValue(node, ["max"]), 0),
      });
    }
  }

  return data;
}

const HERO_LAB_ABILITY_THINGS: Record<string, AbilityId> = {
  astr: "str",
  adex: "dex",
  acon: "con",
  aint: "int",
  awis: "wis",
  acha: "cha",
};

/**
 * Recover which ability a Human/Half-Elf/Half-Orc put its flexible +2 into,
 * from Hero Lab's own native save (`herolab/lead1.xml` inside a `.por`).
 *
 * The statblock XML reports only the finished score, so this choice is
 * otherwise unrecoverable — and getting it wrong shifts a core stat by 2.
 * `lead1.xml` is Hero Lab's internal format (opaque `thing`/`field` ids, no
 * published schema), so this reads the single pick it needs and nothing else:
 * `<pick thing="raAttr2Sel"><field id="usrChosen1" menuthing="aSTR"/>`.
 * Returns undefined whenever that pick isn't found, which the caller reports
 * as a choice for the player to make by hand rather than a guess.
 */
export function flexibleAbilityFromNativeSave(root: XmlNode): AbilityId | undefined {
  for (const pick of findAllTags(root, ["pick"])) {
    if (attrValue(pick, ["thing"]) !== "raAttr2Sel") continue;
    for (const field of findAllTags(pick, ["field"])) {
      const chosen = attrValue(field, ["menuthing"]);
      const ability = chosen ? HERO_LAB_ABILITY_THINGS[chosen.toLowerCase()] : undefined;
      if (ability) return ability;
    }
  }
  return undefined;
}

function parseOrThrow(text: string, what: string): XmlNode {
  try {
    return parseXml(text);
  } catch (err) {
    throw new Error(
      `Couldn't read the ${what} in that Hero Lab file (${err instanceof Error ? err.message : "unknown error"}).`,
    );
  }
}

/**
 * Parse a Hero Lab classic statblock XML export and produce a `CharacterDoc`
 * plus an `ImportReport`. Throws a clean, user-facing `Error` on malformed
 * XML (never lets a parser exception escape raw).
 */
export function importHeroLabXml(text: string, refData: RefData) {
  const root = parseOrThrow(text, "XML export");
  return buildDocFromExternalData(heroLabXmlToIntermediate(root), refData, "herolab");
}

/**
 * Parse a Hero Lab classic `.por` portfolio. The character comes from the
 * statblock XML export inside it; the flexible racial ability choice, which
 * that export doesn't record, is recovered from the native save alongside it
 * when present.
 *
 * A portfolio can hold several characters (party files). Only the first is
 * imported — this app has one character per document, and picking among them
 * would need UI that doesn't exist.
 */
export async function importHeroLabPortfolio(bytes: Uint8Array, refData: RefData) {
  let entries;
  try {
    entries = await readZip(bytes);
  } catch (err) {
    throw new Error(
      `Couldn't open that .por portfolio (${err instanceof Error ? err.message : "unknown error"}).`,
    );
  }

  const statblocks = entries
    .filter((e) => /^statblocks_xml\/.*\.xml$/i.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (statblocks.length === 0) {
    throw new Error(
      "That .por portfolio has no XML statblock in it, so there's nothing to import. Re-save it from Hero Lab with the XML output format enabled.",
    );
  }

  const decoder = new TextDecoder();
  const data = heroLabXmlToIntermediate(
    parseOrThrow(decoder.decode(statblocks[0]!.bytes), "statblock"),
  );

  const native = entries.find((e) => /^herolab\/lead1\.xml$/i.test(e.name));
  if (native) {
    try {
      data.flexibleAbility = flexibleAbilityFromNativeSave(parseXml(decoder.decode(native.bytes)));
    } catch {
      // The native save is a bonus, not a requirement: if it won't parse, the
      // import still succeeds and the report asks for the choice by hand.
    }
  }

  const result = buildDocFromExternalData(data, refData, "herolab");
  if (statblocks.length > 1) {
    result.report.unmapped.push(
      `That portfolio holds ${statblocks.length} characters; only the first was imported. Save the others separately to bring them across.`,
    );
  }
  return result;
}
