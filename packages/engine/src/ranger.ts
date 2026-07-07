/**
 * Ranger situational selections: Favored Enemy, Favored Terrain, and Combat
 * Style. Hand-authored clean-room from the published PF1 rules (CRB pp. 64–65)
 * — no Foundry source was consulted; the vendored dataset carries these
 * features as prose only, with no structured creature-type / terrain / style
 * mapping.
 *
 * None of these bonuses are always-on: Favored Enemy / Favored Terrain apply
 * only vs. a specific creature type or in a specific terrain (the player judges
 * applicability at the table), so they are surfaced through
 * `SavedRoll.rangerBonuses` attachments rather than folded into the derived
 * sheet. Combat Style's bonus-feat *count* already flows through the generic
 * `classBonusFeats` pipeline; here we only enumerate each style's feat tree so
 * the web feat picker can waive prerequisites for it.
 */

import type { CharacterDoc, DerivedRanger } from "@pf1/schema";

/** A pickable creature type / subtype for Favored Enemy. */
export interface RangerChoice {
  id: string;
  label: string;
}

/**
 * Favored Enemy creature types (PF1 CRB p. 64, Bestiary type list). Humanoids
 * and Outsiders are chosen by SUBTYPE in RAW; the most common subtypes are
 * listed explicitly. Free-choice — no deity/campaign gating.
 */
export const FAVORED_ENEMY_TYPES: readonly RangerChoice[] = [
  { id: "aberration", label: "Aberration" },
  { id: "animal", label: "Animal" },
  { id: "construct", label: "Construct" },
  { id: "dragon", label: "Dragon" },
  { id: "fey", label: "Fey" },
  { id: "humanoid-aquatic", label: "Humanoid (aquatic)" },
  { id: "humanoid-dwarf", label: "Humanoid (dwarf)" },
  { id: "humanoid-elf", label: "Humanoid (elf)" },
  { id: "humanoid-giant", label: "Humanoid (giant)" },
  { id: "humanoid-goblinoid", label: "Humanoid (goblinoid)" },
  { id: "humanoid-gnoll", label: "Humanoid (gnoll)" },
  { id: "humanoid-gnome", label: "Humanoid (gnome)" },
  { id: "humanoid-halfling", label: "Humanoid (halfling)" },
  { id: "humanoid-human", label: "Humanoid (human)" },
  { id: "humanoid-orc", label: "Humanoid (orc)" },
  { id: "humanoid-reptilian", label: "Humanoid (reptilian)" },
  { id: "magical-beast", label: "Magical beast" },
  { id: "monstrous-humanoid", label: "Monstrous humanoid" },
  { id: "ooze", label: "Ooze" },
  { id: "outsider-air", label: "Outsider (air)" },
  { id: "outsider-chaotic", label: "Outsider (chaotic)" },
  { id: "outsider-earth", label: "Outsider (earth)" },
  { id: "outsider-evil", label: "Outsider (evil)" },
  { id: "outsider-fire", label: "Outsider (fire)" },
  { id: "outsider-good", label: "Outsider (good)" },
  { id: "outsider-lawful", label: "Outsider (lawful)" },
  { id: "outsider-native", label: "Outsider (native)" },
  { id: "outsider-water", label: "Outsider (water)" },
  { id: "plant", label: "Plant" },
  { id: "undead", label: "Undead" },
  { id: "vermin", label: "Vermin" },
];

/** Favored Terrain types (PF1 CRB p. 65). */
export const FAVORED_TERRAIN_TYPES: readonly RangerChoice[] = [
  { id: "cold", label: "Cold (ice, glaciers, snow, tundra)" },
  { id: "desert", label: "Desert (sand and wastelands)" },
  { id: "forest", label: "Forest (coniferous and deciduous)" },
  { id: "jungle", label: "Jungle" },
  { id: "mountain", label: "Mountain (including hills)" },
  { id: "plains", label: "Plains" },
  { id: "planes", label: "Planes (any single plane other than Material)" },
  { id: "swamp", label: "Swamp" },
  { id: "underground", label: "Underground (caves and dungeons)" },
  { id: "urban", label: "Urban (buildings, streets, sewers)" },
  { id: "water", label: "Water (above and below the surface)" },
];

/** A ranger combat style and the feats its bonus-feat slots draw from. */
export interface CombatStyle {
  id: string;
  label: string;
  /**
   * `featNameSlug`s (see feat-effects.ts) of every feat in this style tree, at
   * any style level. The feat picker waives prerequisites for these when the
   * ranger has this style selected (CRB: a ranger need not meet the prereqs).
   */
  featSlugs: readonly string[];
}

/**
 * Ranger combat styles: the two Core Rulebook styles (Archery, Two-Weapon
 * Combat — CRB p. 64) plus the five from Ultimate Combat (Crossbow, Mounted
 * Combat, Natural Weapon, Two-Handed Weapon, Weapon and Shield), plus two
 * archetype-exclusive styles (Elemental, Aquatic Prowess — issue #59, see the
 * "Archetype-granted styles" block below) that only a ranger with the
 * granting archetype can select.
 *
 * `featSlugs` lists a style's bonus feats at every style level so the feat
 * picker can waive their prerequisites (and badge the tree). The trees are
 * best-effort from the published rules — matching the project's soft-warning
 * posture, a missing entry just means that one feat isn't auto-waived, and an
 * entry whose feat isn't in the vendored dataset is simply inert.
 */
export const COMBAT_STYLES: readonly CombatStyle[] = [
  {
    id: "archery",
    label: "Archery",
    featSlugs: [
      "far-shot",
      "point-blank-shot",
      "precise-shot",
      "rapid-shot",
      "improved-precise-shot",
      "manyshot",
      "pinpoint-targeting",
      "shot-on-the-run",
    ],
  },
  {
    id: "two-weapon",
    label: "Two-Weapon Combat",
    featSlugs: [
      "double-slice",
      "improved-shield-bash",
      "quick-draw",
      "two-weapon-fighting",
      "improved-two-weapon-fighting",
      "two-weapon-defense",
      "greater-two-weapon-fighting",
      "two-weapon-rend",
    ],
  },
  {
    id: "crossbow",
    label: "Crossbow",
    featSlugs: [
      "deadly-aim",
      "precise-shot",
      "rapid-reload",
      "crossbow-mastery",
      "improved-precise-shot",
      "pinpoint-targeting",
      "shot-on-the-run",
    ],
  },
  {
    id: "mounted-combat",
    label: "Mounted Combat",
    featSlugs: [
      "mounted-archery",
      "mounted-combat",
      "ride-by-attack",
      "spirited-charge",
      "trample",
      "mounted-skirmisher",
      "unseat",
    ],
  },
  {
    id: "natural-weapon",
    label: "Natural Weapon",
    featSlugs: [
      "aspect-of-the-beast",
      "improved-natural-attack",
      "rending-claws",
      "weapon-focus",
      "eldritch-claws",
      "vital-strike",
      "improved-vital-strike",
      "greater-vital-strike",
    ],
  },
  {
    id: "two-handed-weapon",
    label: "Two-Handed Weapon",
    featSlugs: [
      "cleave",
      "power-attack",
      "pushing-assault",
      "furious-focus",
      "great-cleave",
      "dreadful-carnage",
      "improved-sunder",
    ],
  },
  {
    id: "weapon-and-shield",
    label: "Weapon and Shield",
    featSlugs: [
      "improved-shield-bash",
      "shield-focus",
      "shield-slam",
      "bashing-finish",
      "shield-master",
      "greater-shield-focus",
    ],
  },
  // ── Archetype-granted styles (issue #59) ──────────────────────────────
  // Not selectable by a plain CRB/UC ranger — only reachable via
  // `RANGER_ARCHETYPE_STYLE_RULES` (apps/web/src/model/ranger.ts) locking a
  // ranger with the granting archetype into it. See that file for how the
  // lock is enforced; this table only carries each style's own feat tree.
  {
    // Ultimate Wilderness p. 126 / Ranger (Elemental Envoy) archetype
    // (Pathfinder Player Companion: Disciple's Doctrine). Clean-room from
    // d20pfsrd/AoN's "Ranger Combat Styles" elemental entry — the vendored
    // dataset carries this archetype's "Combat Style Feat" reflavor as prose
    // only, with no feat list of its own.
    id: "elemental",
    label: "Elemental (Elemental Envoy)",
    featSlugs: [
      "aquadynamic-focus",
      "scorching-weapons",
      "stony-step",
      "wind-stance",
      "inner-flame",
      "lightning-stance",
      "blazing-aura",
      "whirlwind-attack",
    ],
  },
  {
    // Wave Warden (merfolk ranger archetype, Advanced Race Guide) "Aquatic
    // Prowess Feat": replaces the standard combat-style bonus feats with this
    // fixed list (clean-room, transcribed from the archetype's own vendored
    // `description` prose in archetype-features.json, not copied from any
    // GPL source). A handful of entries (Net Adept, Net and Trident, Net
    // Maneuvering, Sea Hunter, Net Trickery) name feats absent from the
    // vendored feat pack — inert per this table's usual posture (see file
    // doc comment), not an error.
    id: "aquatic-prowess",
    label: "Aquatic Prowess (Wave Warden)",
    featSlugs: [
      "dodge",
      "mobility",
      "net-adept",
      "net-and-trident",
      "net-maneuvering",
      "precise-shot",
      "rapid-reload",
      "sea-hunter",
      "two-weapon-fighting",
      "improved-two-weapon-fighting",
      "net-trickery",
      "spring-attack",
      "greater-two-weapon-fighting",
      "improved-precise-shot",
    ],
  },
];

/** Total ranger class levels (multiclass-aware). */
export function rangerLevel(doc: CharacterDoc): number {
  return doc.identity.classes
    .filter((c) => c.tag === "ranger")
    .reduce((sum, c) => sum + c.level, 0);
}

/**
 * Number of favored enemies a ranger of this level has chosen (CRB: one at
 * level 1, then a new one every 5 levels — 1, 5, 10, 15, 20).
 */
export function favoredEnemySlots(rangerLvl: number): number {
  if (rangerLvl < 1) return 0;
  return 1 + Math.floor(rangerLvl / 5);
}

/**
 * Number of favored terrains a ranger of this level has chosen (CRB: one at
 * level 3, then a new one every 5 levels — 3, 8, 13, 18).
 */
export function favoredTerrainSlots(rangerLvl: number): number {
  if (rangerLvl < 3) return 0;
  return 1 + Math.floor((rangerLvl - 3) / 5);
}

/**
 * Total +2-increments of bonus a ranger may distribute across their favored
 * enemies (resp. terrains) at this level. At each milestone the ranger adds a
 * new type at +2 AND (after the first) raises one existing type by +2, so with
 * `s` slots the budget is `2·s + 2·(s−1) = 4s − 2`. Used for the picker's soft
 * validation hint only — never hard-enforced.
 */
export function favoredBonusBudget(slots: number): number {
  return slots < 1 ? 0 : 4 * slots - 2;
}

/**
 * Project the ranger build selections onto the derived sheet. Returns
 * `undefined` for non-rangers so `DerivedSheet.ranger` is simply absent.
 * Bonuses pass through the player's assignment unchanged (they are choices, not
 * computed values); empty-`type` entries are dropped defensively.
 */
export function computeRanger(doc: CharacterDoc): DerivedRanger | undefined {
  if (rangerLevel(doc) < 1) return undefined;
  const clean = (list: { type: string; bonus: number }[] | undefined) =>
    (list ?? []).filter((e) => e.type).map((e) => ({ type: e.type, bonus: e.bonus }));
  return {
    favoredEnemies: clean(doc.build.favoredEnemies),
    favoredTerrains: clean(doc.build.favoredTerrains),
    combatStyle: doc.build.combatStyle,
  };
}
