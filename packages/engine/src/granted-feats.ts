/**
 * Feats a class hands the character outright, and the expansion that makes
 * them behave like feats the player picked.
 *
 * A class-granted feat has two halves, and this engine used to model only the
 * first. The BUDGET half (a granted feat costs no slot) lived in the web
 * layer; the MECHANICAL half never existed at all, because every feat-reading
 * path in this engine — `characterFeatSlugs`, `featInstances`, `ownedFeats`,
 * `collect.ts`'s feat walk — starts from `doc.build.feats`, which holds only
 * what the player chose. So an unchained rogue's Finesse Training resolved
 * "Weapon Finesse" for the feat list and then swung off Strength anyway, and
 * the only way to get the number the class already grants was to buy the feat
 * a second time and go over budget.
 *
 * {@link withGrantedFeats} closes that by expanding the grants into
 * `build.feats` once, at the top of `compute()`. Everything downstream then
 * reads a doc where a granted feat is indistinguishable from a taken one,
 * which is what the rules say it is. Nothing is written back to the stored
 * document: the expansion lives only inside the compute pass, so the feat
 * budget (`chosenFeatCountExcludingGranted` in the web layer) still counts
 * the player's own picks.
 *
 * ## Where a grant comes from
 *
 * 1. A class feature carrying a `bonusFeats` change whose identity resolves
 *    to a real feat — by name (wizard's "Scribe Scroll"), through
 *    {@link FEATURE_NAME_OVERRIDES} (monk's "Unarmed Strike" -> Improved
 *    Unarmed Strike), or through the feature's own `grantsBuffs` link
 *    (brawler's "Unarmed Strike (BRA)"). A `bonusFeats` feature that resolves
 *    to no feat is a free SLOT the player fills, not a grant.
 * 2. A class feature whose grant exists only in its description prose, with
 *    no `changes[]` at all — {@link PROSE_FEAT_GRANTS}.
 * 3. An archetype feature in the same prose-only shape —
 *    {@link ARCHETYPE_PROSE_FEAT_GRANTS}.
 * 4. A cleric/druid domain or a rogue talent, each with its own small table.
 */

import type { CharacterDoc, RefData } from "@pf1/schema";

import { activeArchetypeSwaps } from "./archetypes.js";
import { ROGUE_TALENTS } from "./rogue-talents.js";

/** feat name (lowercased, trimmed) -> feat id, for fixed-grant detection. */
function featIdByName(refData: RefData): Map<string, string> {
  const map = new Map<string, string>();
  for (const feat of Object.values(refData.feats)) {
    map.set(feat.name.trim().toLowerCase(), feat.id);
  }
  return map;
}

/**
 * Class feature name (lowercased, trimmed) -> the actual granted feat's name
 * (lowercased, trimmed), for the handful of cases where Foundry names the
 * class feature differently than the specific feat it auto-grants. Monk's
 * "Unarmed Strike" class feature carries a vendored `{formula: "1", target:
 * "bonusFeats", type: "untyped"}` change representing the automatic grant of
 * "Improved Unarmed Strike" (confirmed via the class feature's description
 * text and the vendored `links.supplements` UUID pointing at that feat) —
 * but "unarmed strike" doesn't match "improved unarmed strike" by name, so
 * without this override it falls through to being counted as a floating
 * bonus-feat slot instead of the specific fixed grant it actually is.
 */
export const FEATURE_NAME_OVERRIDES: Record<string, string> = {
  "unarmed strike": "improved unarmed strike",
  // Rogue (Unchained)'s "Finesse Training (UC)" grants Weapon Finesse as a
  // bonus feat at 1st level (same `bonusFeats`-change-with-mismatched-name
  // shape as Monk's Unarmed Strike above) — confirmed via the vendored
  // feature's description text and its `grantsBuffs` UUID resolving to the
  // "Weapon Finesse" feat.
  "finesse training (uc)": "weapon finesse",
};

/** The feat name (lowercased, trimmed) a class feature name resolves to. */
function resolvedFeatureName(featureName: string): string {
  const key = featureName.trim().toLowerCase();
  return FEATURE_NAME_OVERRIDES[key] ?? key;
}

/** `Compendium.pf1.feats.Item.<id>` -> `<id>`; a buff/item UUID -> no match. */
const FEAT_UUID_RE = /^Compendium\.pf1\.feats\.Item\.([^.]+)$/;

/**
 * The specific feat a `bonusFeats`-carrying class feature hands the character
 * outright, or undefined when the feature grants a free SLOT the player fills.
 * Resolved by name first (through `FEATURE_NAME_OVERRIDES`, which also covers
 * homebrew features, whose `grantsBuffs` is always empty), then by the
 * feature's own `grantsBuffs` link, which names the granted feat directly for
 * the vendored features Foundry titles after the ability rather than the feat
 * it hands out: brawler's "Unarmed Strike (BRA)", warpriest's "Focus Weapon",
 * "Swashbuckler Weapon Training". No vendored feature that grants real slots
 * carries a feat-resolving link, so the two signals never disagree.
 */
export function grantedFeatIdOf(
  feature: { name: string; grantsBuffs: readonly string[] },
  byName: Map<string, string>,
  refData: RefData,
): string | undefined {
  const named = byName.get(resolvedFeatureName(feature.name));
  if (named) return named;
  for (const uuid of feature.grantsBuffs) {
    const id = FEAT_UUID_RE.exec(uuid)?.[1];
    if (id && refData.feats[id]) return id;
  }
  return undefined;
}

/** One prose-only grant: the feat's name, and the level it actually arrives. */
interface ProseFeatGrant {
  /** Feat name (lowercased, trimmed), resolved through `featIdByName`. */
  feat: string;
  /**
   * Class level the grant arrives at, when that's later than the level the
   * granting feature itself is listed at. Only the features that bundle
   * several grants across a level spread need it.
   */
  minLevel?: number;
}

/**
 * Class features that hand over a specific feat but carry NO `bonusFeats`
 * change to say so — the grant exists only in the description prose. Keyed by
 * `ClassFeature.uuid`, hand-authored from that prose, same clean-room posture
 * as {@link FEATURE_NAME_OVERRIDES}.
 *
 * Only unconditional, automatic grants of a feat that needs no player choice
 * belong here. Deliberately excluded, and why:
 *
 * - Player-chosen menus (a Dawnflower anchorite's credence, an Ulfen Guard's
 *   dedication, a horizon walker's terrain) — the feat depends on a pick this
 *   engine would have to invent.
 * - Grants conditioned on already owning another feat (a Hellknight
 *   signifer's Arcane Armor Expertise).
 * - Abilities that hand the BENEFIT to allies (a battle herald's commands) or
 *   to a companion rather than to the character.
 * - Choice-bearing feats (Weapon Focus, Rapid Reload), which resolve to
 *   nothing until a choice is stored and there is nowhere to store one for a
 *   feat the player never picked.
 *
 * Several entries grant a feat the published text scopes more narrowly than
 * the feat itself. A swashbuckler's finesse covers "light or one-handed
 * piercing melee weapons" where the feat covers light weapons plus rapier,
 * whip and spiked chain; a duelist's is limited to a light or one-handed
 * piercing weapon in hand. The two sets agree on every weapon these classes
 * are actually built around, and the abilities all state outright that they
 * count as the feat for prerequisites, so they're modeled as the feat.
 */
export const PROSE_FEAT_GRANTS: Readonly<Record<string, readonly ProseFeatGrant[]>> = {
  // Swashbuckler 1, "Swashbuckler Finesse" — the reported case.
  "Compendium.pf1.class-abilities.Item.0gO5orp5nly2nFjy": [{ feat: "weapon finesse" }],
  // Gunslinger 1, "Gunsmith": "The gunslinger also gains Gunsmithing as a
  // bonus feat", after the starting-firearm paragraph the feature is named for.
  "Compendium.pf1.class-abilities.Item.QTEANZz5ALZQcSIR": [{ feat: "gunsmithing" }],
  // Aldori Swordlord 1 — grants Aldori Dueling Mastery instead to a character
  // who already has Quick Draw; the substitution needs a pick this engine has
  // no place for, so only the base grant is modeled.
  "prestige-feature:PwZmhhar1Hvu9xvc": [{ feat: "quick draw" }],
  // Blackfire Adept 1.
  "prestige-feature:u41ioYuNHqbt5Y8j": [{ feat: "sacred summons" }],
  // Dawnflower Dissident 1.
  "prestige-feature:Q0n0y23oKgESSiIh": [{ feat: "eschew materials" }],
  // Death Slayer 2 (a different bonus feat if she already has it — same
  // unmodeled substitution as the Aldori swordlord above) and Holy
  // Vindicator 5.
  "prestige-feature:MLjnKbRqFvymlsuY": [{ feat: "channel smite" }],
  "prestige-feature:j9Ni4BQTUWLNh0k4": [{ feat: "channel smite" }],
  // Pit Fighter 3 / 6 / 9.
  "prestige-feature:FUuqBcdhHSe8aDHw": [{ feat: "improved dirty trick" }],
  "prestige-feature:7QDKjXOc1lUYaCrT": [{ feat: "quick dirty trick" }],
  "prestige-feature:fX6ltZ99o8ASu8yj": [{ feat: "greater dirty trick" }],
  // Sanguine Angel 5 / 9.
  "prestige-feature:aBsPllbUior5PkQU": [{ feat: "alertness" }],
  "prestige-feature:icOZBqxePnsJbi0M": [{ feat: "diehard" }],
  // Sentinel 8.
  "prestige-feature:L8eMZWSaDNW4fv64": [{ feat: "leadership" }],
  // Steel Falcon 3 — waives the feat's own 5-ranks-of-Survival prerequisite.
  "prestige-feature:r7GARd2nWqcsODuV": [{ feat: "learn ranger trap" }],
  // Duelist 4 / 9 — scoped to a light or one-handed piercing weapon in hand.
  "prestige-feature:duelist:combat-reflexes": [{ feat: "combat reflexes" }],
  "prestige-feature:duelist:deflect-arrows": [{ feat: "deflect arrows" }],
  // Twilight Talon: one vendored feature listed at 2nd level whose text
  // spreads its two feats across 5th and 9th, which is what `minLevel` is for.
  "prestige-feature:hlMtSs6hjw7WDeEo": [
    { feat: "critical focus", minLevel: 5 },
    { feat: "staggering critical", minLevel: 9 },
  ],
};

/**
 * Archetype features in the same prose-only shape, keyed by
 * `ArchetypeFeature.id`. These are the archetypes that trade a class's own
 * feat-granting ability for an equivalent one: without them, taking an Okayo
 * corsair or a daring champion loses a grant the published text keeps.
 *
 * Same inclusion rules as {@link PROSE_FEAT_GRANTS} — an archetype feature
 * that also hands out a choice-bearing feat (the inspired blade's Weapon
 * Focus (rapier), the musketeer's Rapid Reload (musket)) contributes only the
 * choice-free part of its grant.
 */
export const ARCHETYPE_PROSE_FEAT_GRANTS: Readonly<Record<string, readonly ProseFeatGrant[]>> = {
  "cavalier:daring-champion:champion-s-finesse:1": [{ feat: "weapon finesse" }],
  "cavalier:musketeer:musketeer-instruction:1": [
    { feat: "weapon finesse" },
    { feat: "gunsmithing" },
  ],
  "samurai:warrior-poet:graceful-warrior:1": [{ feat: "weapon finesse" }],
  "swashbuckler:inspired-blade:inspired-finesse:1": [{ feat: "weapon finesse" }],
  "swashbuckler:musketeer:musketeer-instruction:1": [
    { feat: "weapon finesse" },
    { feat: "gunsmithing" },
  ],
  "swashbuckler:okayo-corsair:okayo-finesse:1": [{ feat: "weapon finesse" }],
  // Also grants the effects of Two-Weapon Fighting, but only while holding a
  // one-handed firearm in the off hand — a per-hand condition the sheet has
  // no state for, so only the finesse half is granted.
  "swashbuckler:picaroon:two-weapon-finesse:0": [{ feat: "weapon finesse" }],
};

/**
 * Cleric domain tag (`Domain.tag`) -> the specific feat that domain hands the
 * character as a bonus feat. Two domains carry a `bonusFeats` change on the
 * domain doc, but — unlike a class feature named after the feat it grants —
 * the granted feat is named only in the domain's description prose ("...gains
 * @UUID[...]{Blind-Fight} as a bonus feat"), so the feat identity can't be
 * recovered from the change alone. Hand-authored from that prose, same
 * clean-room posture as `FEATURE_NAME_OVERRIDES`. Values are feat names
 * (lowercased, trimmed) resolved through `featIdByName`.
 */
const DOMAIN_GRANTED_FEATS: Record<string, string> = {
  Darkness: "blind-fight",
  Rune: "scribe scroll",
};

/**
 * Druid nature-bond domain tag (`DruidDomain.tag`) -> the specific feat that
 * domain hands the character as a bonus feat, same shape as
 * `DOMAIN_GRANTED_FEATS` above. Wolf is the only one of the 25 nature-bond
 * domains whose granted power is a fixed feat rather than prose ("Improved
 * Trip: You gain Improved Trip as a bonus feat"), hand-authored into
 * `DruidDomain.changes` by `data-pipeline`'s `SUPPLEMENTAL_DRUID_DOMAIN_FEATURES`
 * (issue #117).
 */
const DRUID_DOMAIN_GRANTED_FEATS: Record<string, string> = {
  Wolf: "improved trip",
};

/** A specific feat handed to the character by a class feature (no slot used). */
export interface GrantedFeat {
  /** Id into RefData.feats. */
  featId: string;
  featName: string;
  /** Class that granted it (tag) and the granting feature's name, for display. */
  classTag: string;
  featureName: string;
}

/** The base domain tag a cleric `clericDomains` entry displays under. */
function parentDomainTagOf(refData: RefData, tag: string): string {
  const subdomain = Object.values(refData.subdomains).find((s) => s.tag === tag);
  return subdomain?.parentDomainTags[0] ?? tag;
}

/**
 * Specific feats granted outright by class features: any granted, resolved
 * feature carrying a `bonusFeats` change whose *name* matches a feat in
 * RefData (Wizard "Scribe Scroll", Sorcerer "Eschew Materials"), plus the
 * prose-only grants of {@link PROSE_FEAT_GRANTS} and
 * {@link ARCHETYPE_PROSE_FEAT_GRANTS}. These are auto-applied — the player
 * never spends a slot or adds them manually. Deduped by feat id (first grant
 * wins).
 */
export function grantedFeats(doc: CharacterDoc, refData: RefData): GrantedFeat[] {
  const byName = featIdByName(refData);
  const archetypeSwaps = activeArchetypeSwaps(doc, refData);
  const out: GrantedFeat[] = [];
  const seen = new Set<string>();
  const push = (featId: string, classTag: string, featureName: string, fallbackName: string) => {
    if (seen.has(featId)) return;
    seen.add(featId);
    out.push({
      featId,
      featName: refData.feats[featId]?.name ?? fallbackName,
      classTag,
      featureName,
    });
  };
  for (const cls of doc.identity.classes) {
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      // Swapped out by an active archetype — no longer granted (mirrors collect.ts).
      if (archetypeSwaps.has(grant.uuid)) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (!feature) continue;
      for (const prose of PROSE_FEAT_GRANTS[grant.uuid] ?? []) {
        if (cls.level < (prose.minLevel ?? grant.level)) continue;
        const featId = byName.get(prose.feat);
        if (featId) push(featId, cls.tag, feature.name, prose.feat);
      }
      if (!(feature.changes ?? []).some((ch) => ch.target === "bonusFeats")) continue;
      const featId = grantedFeatIdOf(feature, byName, refData);
      if (featId) push(featId, cls.tag, feature.name, feature.name);
    }
  }

  // Archetype features whose grant lives only in prose. Scoped to the
  // archetype's own class level, the same gate `resolveClassFeatures` applies
  // when it walks an active archetype's timeline.
  for (const archetypeId of doc.build.archetypes ?? []) {
    const archetype = refData.archetypes[archetypeId];
    if (!archetype) continue;
    const clsLevel = doc.identity.classes.find((c) => c.tag === archetype.classTag)?.level ?? 0;
    for (const feature of Object.values(refData.archetypeFeatures)) {
      if (feature.archetypeId !== archetypeId) continue;
      for (const prose of ARCHETYPE_PROSE_FEAT_GRANTS[feature.id] ?? []) {
        if (clsLevel < Math.max(feature.level, prose.minLevel ?? 0)) continue;
        const featId = byName.get(prose.feat);
        if (featId) push(featId, archetype.classTag, feature.name, prose.feat);
      }
    }
  }

  // Cleric domain fixed bonus feats (Darkness grants Blind-Fight, Rune grants
  // Scribe Scroll). Gated on the character actually having cleric levels; a
  // stale domain tag on a non-cleric grants nothing. `clericDomains` holds
  // domain AND subdomain tags: a subdomain keeps the feat only when it kept
  // the parent's `bonusFeats` change (the data-pipeline import drops it for a
  // subdomain that replaces the granting ability), so the change is what's
  // checked rather than the tag naming a top-level domain.
  if (doc.identity.classes.some((c) => c.tag === "cleric")) {
    for (const tag of doc.build.clericDomains ?? []) {
      const parentTag = parentDomainTagOf(refData, tag);
      const featName = DOMAIN_GRANTED_FEATS[parentTag];
      if (!featName) continue;
      const entity =
        Object.values(refData.domains).find((d) => d.tag === tag) ??
        Object.values(refData.subdomains).find((s) => s.tag === tag);
      if (!entity?.changes.some((ch) => ch.target === "bonusFeats")) continue;
      const featId = byName.get(featName);
      if (!featId) continue;
      push(featId, "cleric", tag === parentTag ? `${tag} Domain` : `${tag} Subdomain`, featName);
    }
  }

  // Druid nature-bond domain fixed bonus feat (Wolf grants Improved Trip).
  // Gated on the character actually having druid levels; a stale domain tag
  // on a non-druid grants nothing. Unlike `clericDomains`, a single tag with
  // no subdomain layer — see `DruidDomain.changes`'s doc comment.
  if (doc.identity.classes.some((c) => c.tag === "druid") && doc.build.druidNatureBondDomain) {
    const tag = doc.build.druidNatureBondDomain;
    const featName = DRUID_DOMAIN_GRANTED_FEATS[tag];
    if (featName) {
      const domain = Object.values(refData.druidDomains).find((d) => d.tag === tag);
      if (domain?.changes.some((ch) => ch.target === "bonusFeats")) {
        const featId = byName.get(featName);
        if (featId) push(featId, "druid", `${tag} Domain`, featName);
      }
    }
  }

  // Rogue talents that grant a fixed feat outright ("Finesse Rogue" grants
  // Weapon Finesse, no player-chosen target needed; see
  // `ROGUE_TALENTS[id].grantsFeat` in `rogue-talents.ts`), same "talent grants
  // a feat" shape as Rogue (Unchained)'s vendored "Finesse Training (UC)" ->
  // `FEATURE_NAME_OVERRIDES` entry above, but sourced from the player's own
  // `build.rogueTalents` picks rather than a vendored class-feature grant.
  const rogueClass = doc.identity.classes.find(
    (c) => c.tag === "rogue" || c.tag === "rogueUnchained",
  );
  if (rogueClass) {
    for (const talentId of doc.build.rogueTalents ?? []) {
      const talent = ROGUE_TALENTS[talentId];
      if (!talent?.grantsFeat) continue;
      const featId = byName.get(talent.grantsFeat);
      if (featId) push(featId, rogueClass.tag, talent.name, talent.grantsFeat);
    }
  }
  return out;
}

/**
 * `doc` with every {@link grantedFeats} entry it doesn't already carry folded
 * into `build.feats`, so the whole engine sees a granted feat exactly as it
 * sees a chosen one. Returns `doc` itself when there is nothing to add, which
 * is the common case for a character with no feat-granting class.
 *
 * Deduped against both `build.feats` and `build.extraFeats`: a player who
 * bought the granted feat by hand (the workaround for this not existing) must
 * end up with one copy, not two, since `characterFeatSlugs` counts
 * occurrences and a doubled entry would double a feat's pool bonuses.
 */
export function withGrantedFeats(doc: CharacterDoc, refData: RefData): CharacterDoc {
  const granted = grantedFeats(doc, refData);
  if (granted.length === 0) return doc;
  const held = new Set<string>([
    ...(doc.build.feats ?? []),
    ...(doc.build.extraFeats ?? []).map((e) => e.featId),
  ]);
  const added = granted.map((g) => g.featId).filter((id) => !held.has(id));
  if (added.length === 0) return doc;
  return { ...doc, build: { ...doc.build, feats: [...(doc.build.feats ?? []), ...added] } };
}
