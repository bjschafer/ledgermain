/**
 * Hero Lab classic importer — reads the XML export produced by
 * File -> "Save Custom Output" -> "Generate XML File" (Hero Lab classic,
 * the desktop app; NOT Hero Lab Online, and NOT a `.por` portfolio, which is
 * a zip archive and out of scope here — see issue #3).
 *
 * PROVENANCE / BEST-EFFORT WARNING: we could not find a public sample of
 * Hero Lab classic's actual Pathfinder-1e XML export, only secondhand
 * mentions that such an export exists (Lone Wolf's own docs cover Hero Lab
 * *Online*'s export format, a different, newer product with a different
 * schema, and its exact XML isn't machine-readable from the published PDF
 * either). The element/attribute names below (`<character name="...">`,
 * `<class name="..." level="...">`, `<attribute name="..." score="...">`,
 * `<feat name="...">`, `<skill name="..." ranks="...">`, `<item
 * name="..." quantity="...">`, `<language name="...">`, `<money pp="..."
 * gp="..." sp="..." cp="...">`) are an inferred, plausible shape, not a
 * confirmed one.
 *
 * To stay useful even if the real shape differs in naming (which is likely),
 * `heroLabXmlToIntermediate` below searches the WHOLE document tree for each
 * concept by a short list of candidate tag/attribute names (see the
 * `*_TAGS`/`*_ATTRS` constants) rather than assuming a fixed parent/child
 * path — so as long as the real export uses something close to one of these
 * names anywhere in the tree, it's picked up. Anything it can't find is
 * simply absent from the intermediate data, which then shows up as "nothing
 * to import" rather than a crash; correcting the tag names once a real
 * sample export is available should only require editing the constants in
 * this file. This is personal-use tooling, not a compatibility promise.
 */
import type { RefData } from "@pf1/schema";

import {
  buildDocFromExternalData,
  emptyExternalData,
  matchAbilityId,
  type ExternalCharacterData,
} from "./externalImport.js";
import { attrValue, findAllTags, findFirstTag, nodeText, parseXml, type XmlNode } from "./xml.js";

const CHARACTER_TAGS = ["character", "pc", "hero", "actor"];
const RACE_TAGS = ["race", "ancestry"];
const CLASS_TAGS = ["class", "characterclass"];
const ATTRIBUTE_TAGS = ["attribute", "ability", "stat"];
const FEAT_TAGS = ["feat"];
const SKILL_TAGS = ["skill"];
const LANGUAGE_TAGS = ["language"];
const GEAR_TAGS = ["item", "gear", "equipment", "weapon", "armor"];
const MONEY_TAGS = ["money", "coins", "currency", "gold"];

const NAME_ATTRS = ["name", "text"];
const LEVEL_ATTRS = ["level", "levels"];
const SCORE_ATTRS = ["score", "value", "total", "base"];
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

/** Reduce a parsed Hero Lab classic XML tree to {@link ExternalCharacterData}. See module doc comment. */
export function heroLabXmlToIntermediate(root: XmlNode): ExternalCharacterData {
  const scope = findScope(root);
  const data = emptyExternalData();

  data.name = scalarField(scope, NAME_ATTRS);
  data.race = scalarField(scope, RACE_TAGS);
  data.alignment = scalarField(scope, ["alignment"]);
  data.deity = scalarField(scope, ["deity"]);
  data.gender = scalarField(scope, ["gender", "sex"]);
  data.age = scalarField(scope, ["age"]);

  for (const node of findAllTags(scope, CLASS_TAGS)) {
    const name = displayName(node);
    if (name) data.classes.push({ name, level: toNumber(attrValue(node, LEVEL_ATTRS), 1) });
  }

  for (const node of findAllTags(scope, ATTRIBUTE_TAGS)) {
    const rawName = attrValue(node, ["name", "abbr", "id"]);
    if (!rawName) continue;
    const ability = matchAbilityId(rawName);
    const score = attrValue(node, SCORE_ATTRS);
    if (ability && score != null) data.abilities[ability] = toNumber(score);
  }

  for (const node of findAllTags(scope, FEAT_TAGS)) {
    const name = displayName(node);
    if (name) data.feats.push(name);
  }

  for (const node of findAllTags(scope, SKILL_TAGS)) {
    const name = attrValue(node, NAME_ATTRS);
    if (name) data.skills.push({ name, ranks: toNumber(attrValue(node, RANKS_ATTRS), 0) });
  }

  for (const node of findAllTags(scope, LANGUAGE_TAGS)) {
    const name = displayName(node);
    if (name) data.languages.push(name);
  }

  for (const node of findAllTags(scope, GEAR_TAGS)) {
    const name = displayName(node);
    if (!name) continue;
    const quantity = attrValue(node, QUANTITY_ATTRS);
    data.gear.push({ name, quantity: quantity != null ? toNumber(quantity, 1) : undefined });
  }

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

  return data;
}

/**
 * Parse a Hero Lab classic XML export and produce a `CharacterDoc` + {@link
 * ImportReport}. Throws a clean, user-facing `Error` on malformed XML (never
 * lets a parser exception escape raw) — see the module doc comment for the
 * shape assumptions this makes and their (lack of) provenance.
 */
export function importHeroLabXml(text: string, refData: RefData) {
  let root: XmlNode;
  try {
    root = parseXml(text);
  } catch (err) {
    throw new Error(
      `Couldn't parse that as XML (${err instanceof Error ? err.message : "unknown error"}). Only Hero Lab classic's XML export is supported (File → Save Custom Output → Generate XML File) — not a .por portfolio file.`,
    );
  }
  const data = heroLabXmlToIntermediate(root);
  return buildDocFromExternalData(data, refData, "herolab");
}
