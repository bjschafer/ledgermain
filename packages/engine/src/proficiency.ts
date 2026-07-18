/**
 * Weapon/armor/shield proficiency (issue #81) — clean-room from PF1 RAW, not
 * Foundry source. Three grant sources are combined into one set:
 *
 *  1. Class grants — every class's vendored `weaponProf`/`armorProf` arrays
 *     (`packages/data-pipeline/data/classes.json`, typed on `RefData.Class`)
 *     across every level taken. Each array mixes whole-category tokens
 *     ("simple"/"martial" for weapons; "lgt"/"med"/"hvy"/"shl"/"twr" for
 *     armor/shields) with specific weapon-name exceptions (monk, wizard,
 *     rogue, bard, cleric, samurai, druid/shifter all carry a hand-picked
 *     weapon list instead of, or in addition to, a category token) — see
 *     {@link classifyWeaponProfToken}/{@link classifyArmorProfToken} for the
 *     token vocabulary and what's deliberately dropped.
 *  2. Proficiency feats — Simple/Martial/Exotic Weapon Proficiency, Light/
 *     Medium/Heavy Armor Proficiency, Shield Proficiency, Tower Shield
 *     Proficiency. Martial/Exotic are per-weapon picks (issue #58 repeatable,
 *     see `repeatableFeats.ts`); the chosen weapon is read straight off
 *     `doc.build.featChoices`/`extraFeats[].choiceId` — same storage as
 *     Weapon Focus, but consumed here directly rather than through
 *     `resolveFeatEffect`'s Change pipeline, since "am I proficient" is a
 *     set-membership fact, not a stacking bonus (see `apps/web/src/model/
 *     feats.ts`'s `MECHANICAL_FEAT_CHOICES` for the picker-UI side of this).
 *  3. Racial grants (elf, dwarf, gnome, half-orc, orc) — hand-authored from
 *     each race's SRD entry (not vendored; `RefData.Race` carries no
 *     structured weapon-proficiency field), matched by race NAME, same
 *     precedent as `racial-traits.ts`'s alternate-trait table.
 *
 * Deliberately NOT modeled (see the issue and CLAUDE.md's warn-don't-block
 * posture):
 *  - Archetype proficiency swaps (many archetypes trade an armor/weapon
 *    proficiency) — class grants here are always the BASE class's.
 *  - Monk's/druid's "restricted weapon list" flavor rule — that's an oath/
 *    class-feature restriction (losing flurry, wild shape, etc. for using an
 *    off-list weapon), not a proficiency gate; out of scope.
 *  - A cleric's "Favored Weapon" (no vendored deity→weapon mapping exists —
 *    `identity.deity` is free text, see `model/alignment.ts`'s identical gap)
 *    and Foundry-internal placeholder tags ("Monk Quality", "Close Weapon
 *    Group") are skipped rather than turned into a named grant that can never
 *    resolve to a real weapon.
 *  - A firearms-specific proficiency ("Firearms" on gunslinger/gunsmith) is
 *    modeled as a semantic-group grant (matches `WeaponInstance.weaponGroups`
 *    the same way Weapon Training does) rather than a special case — see
 *    {@link classifyWeaponProfToken}.
 */

import type {
  ArmorProficiencyLine,
  CharacterDoc,
  DerivedProficiencies,
  Feat,
  ProficiencyGrant,
  RefData,
  WeaponProficiencyLine,
} from "@pf1/schema";

import { featNameSlug } from "./feat-effects.js";
import { normalizeWeaponGroup } from "./weapon-groups.js";

/* --------------------------------------------------------- class tokens -- */

type WeaponTokenResult =
  | { kind: "category"; value: "simple" | "martial" }
  | { kind: "named"; slug: string; label: string };

/**
 * Non-resolvable `weaponProf` tokens (see file header): a deity's favored
 * weapon (no structured deity data to resolve it against) and two Foundry-
 * internal placeholder tags with no corresponding weapon at all.
 */
const UNRESOLVABLE_WEAPON_TOKENS: ReadonlySet<string> = new Set([
  "Favored Weapon",
  "Monk Quality",
  "Close Weapon Group",
]);

function classifyWeaponProfToken(token: string): WeaponTokenResult | null {
  if (token === "simple" || token === "martial") return { kind: "category", value: token };
  if (UNRESOLVABLE_WEAPON_TOKENS.has(token)) return null;
  const slug = normalizeWeaponGroup(token);
  if (!slug) return null;
  return { kind: "named", slug, label: token };
}

type ArmorTokenResult = { tier: ArmorProficiencyLine["tier"]; label: string };

/**
 * `armorProf` tokens outside the five recognized codes are either a material
 * restriction ("No Metal Armor(s)" — druid/shifter, a flavor rule like the
 * weapon-list restriction, not a proficiency gate) or a single-shield
 * exception ("Buckler" — swashbuckler is proficient with bucklers only, not
 * light/heavy shields generally; modeling that one-off narrower grant isn't
 * worth a new tier) — both dropped rather than mapped to the wrong tier.
 */
function classifyArmorProfToken(token: string): ArmorTokenResult | null {
  switch (token) {
    case "lgt":
      return { tier: "light", label: "Light Armor" };
    case "med":
      return { tier: "medium", label: "Medium Armor" };
    case "hvy":
      return { tier: "heavy", label: "Heavy Armor" };
    case "shl":
      return { tier: "shield", label: "Shields" };
    case "twr":
      return { tier: "tower-shield", label: "Tower Shields" };
    default:
      return null;
  }
}

/* -------------------------------------------------------------- feats -- */

const SIMPLE_WEAPON_PROF_SLUG = "simple-weapon-proficiency";
const MARTIAL_WEAPON_PROF_SLUG = "martial-weapon-proficiency";
const EXOTIC_WEAPON_PROF_SLUG = "exotic-weapon-proficiency";
const ARMOR_PROF_LIGHT_SLUG = "armor-proficiency-light";
const ARMOR_PROF_MEDIUM_SLUG = "armor-proficiency-medium";
const ARMOR_PROF_HEAVY_SLUG = "armor-proficiency-heavy";
const SHIELD_PROF_SLUG = "shield-proficiency";
const TOWER_SHIELD_PROF_SLUG = "tower-shield-proficiency";

/** Every resolved feat instance — the primary `build.feats` entries, plus any `extraFeats` (issue #58) instances. */
function collectFeatInstances(
  doc: CharacterDoc,
  refData: RefData,
): { feat: Feat; choiceId?: string }[] {
  const out: { feat: Feat; choiceId?: string }[] = [];
  for (const featId of doc.build.feats ?? []) {
    const feat = refData.feats[featId];
    if (!feat) continue;
    out.push({ feat, choiceId: doc.build.featChoices?.[featId] });
  }
  for (const instance of doc.build.extraFeats ?? []) {
    const feat = refData.feats[instance.featId];
    if (!feat) continue;
    out.push({ feat, choiceId: instance.choiceId });
  }
  return out;
}

/**
 * Display label for a Martial/Exotic Weapon Proficiency choice. The stored
 * `choiceId` is already a `WeaponInstance.group` slug (the "weapon" choice
 * picker lists the character's own weapons' `group` values verbatim — see
 * `apps/web/src/model/feats.ts`'s `featChoiceOptions`), so this just looks up
 * a matching weapon's display name for a nicer label, falling back to a
 * titleized slug when no weapon on the sheet matches (e.g. the weapon that
 * prompted the choice was since removed).
 */
function weaponLabelForSlug(slug: string, doc: CharacterDoc): string {
  const match = (doc.build.weapons ?? []).find((w) => w.group === slug);
  if (match) return match.name;
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

/* ------------------------------------------------------------- races -- */

interface RacialWeaponGrant {
  slug: string;
  label: string;
}

/**
 * Racial weapon-proficiency grants (issue #81), hand-authored from each
 * race's SRD entry — matched by race NAME (`RefData.races[id].name`), same
 * precedent as `racial-traits.ts`'s `AlternateRacialTrait.race`. Composite
 * bow variants (elf) share their base bow's `group` slug in the vendored data
 * (`Composite Longbow` groups as "longbow", same as `Longbow`), so a single
 * "longbow"/"shortbow" grant already covers both. Dwarf's waraxe/urgrosh and
 * gnome's hooked hammer are RAW EXOTIC weapons the race simply treats as
 * proficient — a named grant has the identical effect as "treated as
 * martial" for this engine's binary proficient/not-proficient purposes.
 */
const RACIAL_WEAPON_PROFICIENCY: Readonly<Record<string, RacialWeaponGrant[]>> = {
  Elf: [
    { slug: "longbow", label: "Longbow" },
    { slug: "shortbow", label: "Shortbow" },
    { slug: "longsword", label: "Longsword" },
    { slug: "rapier", label: "Rapier" },
  ],
  Dwarf: [
    { slug: "battle-axe", label: "Battleaxe" },
    { slug: "heavy-pick", label: "Heavy Pick" },
    { slug: "warhammer", label: "Warhammer" },
    { slug: "dwarven-waraxe", label: "Dwarven Waraxe" },
    { slug: "dwarven-urgrosh", label: "Dwarven Urgrosh" },
  ],
  Gnome: [{ slug: "gnome-hooked-hammer", label: "Gnome Hooked Hammer" }],
  "Half-Orc": [
    { slug: "greataxe", label: "Greataxe" },
    { slug: "falchion", label: "Falchion" },
  ],
  Orc: [
    { slug: "greataxe", label: "Greataxe" },
    { slug: "falchion", label: "Falchion" },
  ],
};

/* --------------------------------------------------------- derivation -- */

class ProficiencyBuilder {
  private readonly weaponsByKey = new Map<string, WeaponProficiencyLine>();
  private readonly armorByTier = new Map<ArmorProficiencyLine["tier"], ArmorProficiencyLine>();

  addWeaponCategory(category: "simple" | "martial", grant: ProficiencyGrant): void {
    const key = `cat:${category}`;
    let line = this.weaponsByKey.get(key);
    if (!line) {
      line = {
        label: category === "simple" ? "Simple Weapons" : "Martial Weapons",
        category,
        grants: [],
      };
      this.weaponsByKey.set(key, line);
    }
    line.grants.push(grant);
  }

  addWeaponNamed(slug: string, label: string, grant: ProficiencyGrant): void {
    const key = `slug:${slug}`;
    let line = this.weaponsByKey.get(key);
    if (!line) {
      line = { label, weaponSlug: slug, grants: [] };
      this.weaponsByKey.set(key, line);
    }
    line.grants.push(grant);
  }

  addArmor(tier: ArmorProficiencyLine["tier"], label: string, grant: ProficiencyGrant): void {
    let line = this.armorByTier.get(tier);
    if (!line) {
      line = { label, tier, grants: [] };
      this.armorByTier.set(tier, line);
    }
    line.grants.push(grant);
  }

  build(): DerivedProficiencies {
    return {
      weapons: [...this.weaponsByKey.values()].sort((a, b) => a.label.localeCompare(b.label)),
      armor: [...this.armorByTier.values()].sort((a, b) => a.label.localeCompare(b.label)),
    };
  }
}

/**
 * Derives the character's full weapon/armor/shield proficiency set with
 * provenance — see the file header for the three grant sources combined.
 * Pure function of `doc`/`refData`; cheap enough to call on every `compute()`
 * pass (mirrors the rest of the engine's "recompute rather than memoize"
 * posture).
 */
export function deriveProficiencies(doc: CharacterDoc, refData: RefData): DerivedProficiencies {
  const out = new ProficiencyBuilder();

  // 1. Class grants — every class actually taken (level > 0), by its own
  // weaponProf/armorProf arrays. A multiclass character simply unions both
  // classes' grants, which is correct RAW (proficiency from one class is
  // never lost by taking levels in another).
  for (const cls of doc.identity.classes) {
    if (cls.level <= 0) continue;
    const def = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!def) continue;
    const grant: ProficiencyGrant = { source: def.name, sourceType: "class" };
    for (const token of def.weaponProf ?? []) {
      const classified = classifyWeaponProfToken(token);
      if (!classified) continue;
      if (classified.kind === "category") out.addWeaponCategory(classified.value, grant);
      else out.addWeaponNamed(classified.slug, classified.label, grant);
    }
    for (const token of def.armorProf ?? []) {
      const classified = classifyArmorProfToken(token);
      if (!classified) continue;
      out.addArmor(classified.tier, classified.label, grant);
    }
  }

  // 2. Proficiency feats.
  for (const { feat, choiceId } of collectFeatInstances(doc, refData)) {
    const slug = featNameSlug(feat.name);
    const grant: ProficiencyGrant = { source: feat.name, sourceType: "feat" };
    switch (slug) {
      case SIMPLE_WEAPON_PROF_SLUG:
        out.addWeaponCategory("simple", grant);
        break;
      case MARTIAL_WEAPON_PROF_SLUG:
      case EXOTIC_WEAPON_PROF_SLUG:
        if (choiceId) out.addWeaponNamed(choiceId, weaponLabelForSlug(choiceId, doc), grant);
        break;
      case ARMOR_PROF_LIGHT_SLUG:
        out.addArmor("light", "Light Armor", grant);
        break;
      case ARMOR_PROF_MEDIUM_SLUG:
        out.addArmor("medium", "Medium Armor", grant);
        break;
      case ARMOR_PROF_HEAVY_SLUG:
        out.addArmor("heavy", "Heavy Armor", grant);
        break;
      case SHIELD_PROF_SLUG:
        out.addArmor("shield", "Shields", grant);
        break;
      case TOWER_SHIELD_PROF_SLUG:
        out.addArmor("tower-shield", "Tower Shields", grant);
        break;
      default:
        break;
    }
  }

  // 3. Racial grants.
  const race = refData.races[doc.identity.race];
  const racialWeapons = race ? RACIAL_WEAPON_PROFICIENCY[race.name] : undefined;
  if (race && racialWeapons) {
    const grant: ProficiencyGrant = { source: race.name, sourceType: "race" };
    for (const w of racialWeapons) out.addWeaponNamed(w.slug, w.label, grant);
  }

  return out.build();
}

/* ------------------------------------------------------------- checks -- */

/**
 * True if the character is proficient with `weapon` — a whole-category grant
 * ("simple"/"martial", matched against `weapon.proficiency`) or a named
 * grant (matched against `weapon.group` or any of `weapon.weaponGroups`, the
 * same semantic-group vocabulary Weapon Training uses — this is what makes a
 * class's "Firearms" token, or a race's/feat's specific weapon, resolve
 * without a special case). Exotic weapons are only ever satisfied by a named
 * grant — PF1 has no "all exotic weapons" proficiency. An unset
 * `weapon.proficiency` (a document predating this field, or a hand-authored
 * custom weapon left blank) reads as proficient — "unknown" never manufactures
 * a penalty the player didn't ask for.
 */
export function isWeaponProficient(
  prof: DerivedProficiencies,
  weapon: { proficiency?: string; group?: string; weaponGroups?: string[] },
): boolean {
  if (!weapon.proficiency) return true;
  if (
    (weapon.proficiency === "simple" || weapon.proficiency === "martial") &&
    prof.weapons.some((w) => w.category === weapon.proficiency)
  ) {
    return true;
  }
  const candidateSlugs = [weapon.group, ...(weapon.weaponGroups ?? [])].filter(
    (s): s is string => !!s,
  );
  return candidateSlugs.some((slug) => prof.weapons.some((w) => w.weaponSlug === slug));
}

/**
 * True if the character is proficient with body armor of the given weight
 * class (`WornArmor.type`: 1 light / 2 medium / 3 heavy). Absent/0 (no armor
 * equipped, or an unset weight class) reads as proficient — nothing to be
 * non-proficient WITH.
 */
export function isArmorTypeProficient(
  prof: DerivedProficiencies,
  type: number | undefined,
): boolean {
  if (!type) return true;
  const tier = type === 1 ? "light" : type === 2 ? "medium" : "heavy";
  return prof.armor.some((a) => a.tier === tier);
}

/**
 * True if the character is proficient with a shield of the given tier
 * (`WornArmor.shieldTier`). Tower shields require their own proficiency
 * (`tower-shield`), independent of the general `shield` grant — RAW doesn't
 * imply one from the other, and neither does this check.
 */
export function isShieldTierProficient(
  prof: DerivedProficiencies,
  shieldTier: "light" | "heavy" | "tower",
): boolean {
  const tier = shieldTier === "tower" ? "tower-shield" : "shield";
  return prof.armor.some((a) => a.tier === tier);
}
