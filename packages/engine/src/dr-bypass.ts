/**
 * What a character's own attacks count as for overcoming damage reduction
 * (clean-room from the published PF1 rules — the vendored feature text is read
 * as a rules citation, never transcribed).
 *
 * This is the OFFENSIVE mirror of `damage-resolution.ts`, and the two are
 * deliberately asymmetric. Resolving incoming damage cannot infer what the
 * attacker's weapon was made of, so `DamageResolutionOptions.bypasses` is an
 * input the player supplies from what the GM said. The character's own
 * weapons are the opposite case: material, enhancement bonus, alignment
 * abilities and class level are all stored on the document, so every bypass
 * here is derivable and none of it should have to be looked up mid-fight.
 *
 * Four sources feed a weapon's list:
 *
 *  1. **Special material.** Adamantine, cold iron and alchemical silver each
 *     satisfy their own DR qualifier. Mithral is not its own qualifier: RAW it
 *     counts as silver, which is the same fold `model/damageInput.ts` applies
 *     on the receiving side.
 *  2. **Enhancement bonus** (CRB, Magic Weapons). A magic weapon's plus
 *     substitutes for material and alignment above certain thresholds, laid
 *     out in {@link ENHANCEMENT_BYPASSES}. The +4 adamantine tier explicitly
 *     does NOT bypass hardness, unlike the real metal.
 *  3. **Alignment weapon abilities.** Holy/unholy/axiomatic/anarchic make the
 *     weapon good/evil/lawful/chaotic respectively.
 *  4. **Unarmed-strike class features.** Monk ki strike and the brawler's
 *     Brawler's Strike, both of which upgrade on a level schedule and apply
 *     only to an unarmed strike, never to a held weapon.
 *
 * Each qualifier appears once with every source that grants it, since the
 * useful question at the table is "does this hit through DR 10/cold iron",
 * not "how many ways". Both flags fold across sources the way the rules do:
 * hardness is bypassed if ANY source bypasses it (adamantine metal does, a +4
 * plus doesn't), and a bypass is conditional only if EVERY source is (a monk
 * whose ki pool is empty still has a magic amulet).
 */

import type { CharacterDoc, RefData, WeaponDrBypass, WeaponInstance } from "@pf1/schema";

import { activeArchetypeSwaps } from "./archetypes.js";
import { normalizeQualifier } from "./damage-types.js";
import { isUnarmedStrikeWeapon } from "./weapon-groups.js";

/**
 * The DR qualifier each special material satisfies. Materials with no DR
 * bearing at all (steel, darkwood) are simply absent. Mithral maps to silver
 * rather than to itself, per PF1 RAW.
 */
const MATERIAL_BYPASSES: Record<string, string> = {
  adamantine: "adamantine",
  "cold-iron": "cold-iron",
  silver: "silver",
  mithral: "silver",
};

/** Materials that also bypass hardness, not merely DR (CRB: adamantine only). */
const HARDNESS_MATERIALS: ReadonlySet<string> = new Set(["adamantine"]);

/**
 * Enhancement-bonus thresholds (CRB, "Damage Reduction" / Overcoming DR: any
 * weapon with a +1 or higher enhancement bonus counts as magic, "not counting
 * the enhancement from masterwork quality", and the table there lists the plus
 * needed to stand in for a material or an alignment). Each tier is cumulative
 * with the ones below it, so a +5 weapon carries every entry at or under 5.
 *
 * The +4 adamantine tier is the one trap here: it overcomes DR/adamantine but
 * grants none of adamantine's hardness-bypassing, which is why nothing in
 * this table ever sets `hardness`.
 */
const ENHANCEMENT_BYPASSES: readonly { plus: number; qualifiers: readonly string[] }[] = [
  { plus: 1, qualifiers: ["magic"] },
  { plus: 3, qualifiers: ["cold-iron", "silver"] },
  { plus: 4, qualifiers: ["adamantine"] },
  // A +5 weapon counts as every alignment at once, so it answers a DR line of
  // any alignment component without the wielder choosing one.
  { plus: 5, qualifiers: ["chaotic", "evil", "good", "lawful"] },
];

/**
 * Alignment weapon abilities, keyed by the id suffix shared by both ability
 * vocabularies the app can store in `WeaponInstance.abilities`: the curated
 * table in `apps/web/src/model/abilities.ts` (bare ids like `holy`) and
 * `RefData.itemAbilities` (`ability:anarchic`). Matching on the suffix is what
 * lets one entry cover both spellings.
 */
const ALIGNMENT_ABILITY_BYPASSES: Record<string, { qualifier: string; name: string }> = {
  holy: { qualifier: "good", name: "Holy" },
  unholy: { qualifier: "evil", name: "Unholy" },
  axiomatic: { qualifier: "lawful", name: "Axiomatic" },
  anarchic: { qualifier: "chaotic", name: "Anarchic" },
};

/**
 * One tier of an unarmed-strike class feature: the level it comes online and
 * what the strike then counts as.
 */
interface UnarmedStrikeTier {
  level: number;
  qualifiers: readonly string[];
  /** Set when that tier's text also bypasses hardness (the adamantine tiers). */
  hardness?: boolean;
}

/**
 * Monk ki strike, folded into the Ki Pool feature in the published class
 * table: magic at 4th, cold iron and silver at 7th, lawful at 10th,
 * adamantine (hardness included) at 16th.
 *
 * The Unchained monk's ki pool arrives a level earlier, at 3rd, and every
 * later tier matches — see {@link UNCHAINED_MONK_KI_STRIKE}.
 */
const MONK_KI_STRIKE: readonly UnarmedStrikeTier[] = [
  { level: 4, qualifiers: ["magic"] },
  { level: 7, qualifiers: ["cold-iron", "silver"] },
  { level: 10, qualifiers: ["lawful"] },
  { level: 16, qualifiers: ["adamantine"], hardness: true },
];

const UNCHAINED_MONK_KI_STRIKE: readonly UnarmedStrikeTier[] = [
  { level: 3, qualifiers: ["magic"] },
  ...MONK_KI_STRIKE.slice(1),
];

/**
 * Brawler's Strike (ACG): magic at 5th, cold iron and silver at 9th, one
 * chosen alignment component at 12th, adamantine (hardness included) at 17th.
 * The 12th-level tier is absent from this table because its qualifier isn't
 * fixed by level — it comes from `build.brawlerStrikeAlignment`, applied by
 * {@link unarmedStrikeBypasses}.
 */
const BRAWLER_STRIKE: readonly UnarmedStrikeTier[] = [
  { level: 5, qualifiers: ["magic"] },
  { level: 9, qualifiers: ["cold-iron", "silver"] },
  { level: 17, qualifiers: ["adamantine"], hardness: true },
];

/** The alignment component a 12th-level brawler may pick for Brawler's Strike. */
export type BrawlerStrikeAlignment = "chaotic" | "evil" | "good" | "lawful";

/** Level at which Brawler's Strike adds the wielder's chosen alignment component. */
export const BRAWLER_STRIKE_ALIGNMENT_LEVEL = 12;

/**
 * Every class whose unarmed strikes gain DR bypasses by level, by class tag.
 * `feature` names the class feature the tiers hang off, which is both the
 * source label the sheet shows and the feature an archetype has to swap away
 * for the bypasses to stop applying.
 */
const UNARMED_STRIKE_FEATURES: Record<
  string,
  { feature: string; className: string; tiers: readonly UnarmedStrikeTier[]; condition?: string }
> = {
  monk: {
    feature: "Ki Pool",
    className: "Monk",
    tiers: MONK_KI_STRIKE,
    condition: "while you have at least 1 ki point",
  },
  monkUnchained: {
    feature: "Ki Pool (UC)",
    className: "Monk",
    tiers: UNCHAINED_MONK_KI_STRIKE,
    condition: "while you have at least 1 ki point",
  },
  brawler: { feature: "Brawler's Strike", className: "Brawler", tiers: BRAWLER_STRIKE },
};

/** A bypass under construction, before same-qualifier entries are merged. */
interface BypassContribution {
  qualifier: string;
  source: string;
  hardness?: boolean;
  condition?: string;
}

/**
 * True when an active archetype has traded away the class feature that grants
 * this character's unarmed bypasses (the Martial Artist monk gives up the ki
 * pool outright, taking ki strike with it). Uses the same vendored
 * `pairedBaseFeatureUuid` swap detection `barbarianDamageReductionReplaced`
 * does, so an archetype the data pairs cleanly needs no entry here.
 */
function unarmedFeatureReplaced(
  doc: CharacterDoc,
  refData: RefData,
  classTag: string,
  featureName: string,
): boolean {
  const cls = Object.values(refData.classes).find((c) => c.tag === classTag);
  const uuid = cls?.features.find((f) => f.name === featureName)?.uuid;
  return !!uuid && activeArchetypeSwaps(doc, refData).has(uuid);
}

/** Bypasses an unarmed strike gains from monk/brawler class levels. */
function unarmedStrikeBypasses(doc: CharacterDoc, refData: RefData): BypassContribution[] {
  const out: BypassContribution[] = [];
  for (const cls of doc.identity.classes) {
    const entry = UNARMED_STRIKE_FEATURES[cls.tag];
    if (!entry || cls.level <= 0) continue;
    if (unarmedFeatureReplaced(doc, refData, cls.tag, entry.feature)) continue;
    // The two monk variants read the same published table and a character can
    // hold levels in both; each contributes off its OWN level rather than the
    // sum, since no rule stacks them (same posture `unarmedStrikeSource` takes
    // for the damage die).
    for (const tier of entry.tiers) {
      if (cls.level < tier.level) continue;
      for (const qualifier of tier.qualifiers) {
        out.push({
          qualifier,
          source: `${entry.className} ${tier.level}`,
          ...(tier.hardness ? { hardness: true } : {}),
          ...(entry.condition ? { condition: entry.condition } : {}),
        });
      }
    }
    const alignment = doc.build.brawlerStrikeAlignment;
    if (cls.tag === "brawler" && alignment && cls.level >= BRAWLER_STRIKE_ALIGNMENT_LEVEL) {
      out.push({
        qualifier: alignment,
        source: `${entry.className} ${BRAWLER_STRIKE_ALIGNMENT_LEVEL}`,
      });
    }
  }
  return out;
}

/** Bypasses from the weapon itself: material, enhancement bonus, alignment abilities. */
function weaponItemBypasses(w: WeaponInstance): BypassContribution[] {
  const out: BypassContribution[] = [];

  const material = w.material ? normalizeQualifier(w.material) : undefined;
  const materialBypass = material ? MATERIAL_BYPASSES[material] : undefined;
  if (material && materialBypass) {
    out.push({
      qualifier: materialBypass,
      source: materialLabel(material),
      ...(HARDNESS_MATERIALS.has(material) ? { hardness: true } : {}),
    });
  }

  const enh = w.enhancement ?? 0;
  for (const tier of ENHANCEMENT_BYPASSES) {
    if (enh < tier.plus) continue;
    for (const qualifier of tier.qualifiers) out.push({ qualifier, source: `+${enh} enhancement` });
  }

  for (const id of w.abilities ?? []) {
    const alignment = ALIGNMENT_ABILITY_BYPASSES[abilitySlug(id)];
    if (alignment) out.push({ qualifier: alignment.qualifier, source: alignment.name });
  }

  return out;
}

/** `"ability:anarchic"` and `"anarchic"` both reduce to `"anarchic"`. */
function abilitySlug(id: string): string {
  return normalizeQualifier(id.replace(/^ability:/, "").replace(/_/g, "-"));
}

/** Display name for a material source line ("cold-iron" -> "Cold iron"). */
function materialLabel(material: string): string {
  const words = material.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Every DR qualifier `w` overcomes in this character's hands, sorted so the
 * order is stable for display: hardest-to-come-by material first, then magic,
 * then the alignment components alphabetically.
 *
 * Returns an empty array for a plain steel weapon with no plus, which is the
 * common case and the one the sheet shows nothing for.
 */
export function weaponDrBypasses(
  doc: CharacterDoc,
  refData: RefData,
  w: WeaponInstance,
): WeaponDrBypass[] {
  const contributions = [
    ...weaponItemBypasses(w),
    ...(isUnarmedStrikeWeapon(w) ? unarmedStrikeBypasses(doc, refData) : []),
  ];

  const merged = new Map<string, WeaponDrBypass>();
  for (const c of contributions) {
    const existing = merged.get(c.qualifier);
    if (!existing) {
      merged.set(c.qualifier, {
        qualifier: c.qualifier,
        sources: [c.source],
        ...(c.hardness ? { hardness: true } : {}),
        ...(c.condition ? { condition: c.condition } : {}),
      });
      continue;
    }
    if (!existing.sources.includes(c.source)) existing.sources.push(c.source);
    if (c.hardness) existing.hardness = true;
    // An unconditional source makes the whole qualifier unconditional.
    if (!c.condition) delete existing.condition;
  }

  return [...merged.values()].sort(
    (a, b) =>
      qualifierRank(a.qualifier) - qualifierRank(b.qualifier) ||
      a.qualifier.localeCompare(b.qualifier),
  );
}

/** Display order for the qualifier list; unknown qualifiers sort last. */
const QUALIFIER_ORDER = ["adamantine", "cold-iron", "silver", "magic"];

function qualifierRank(qualifier: string): number {
  const i = QUALIFIER_ORDER.indexOf(qualifier);
  return i === -1 ? QUALIFIER_ORDER.length : i;
}
