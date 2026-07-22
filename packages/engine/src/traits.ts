/**
 * Clean-room PF1 character-traits table (DESIGN §6): hand-authored from the
 * published rules (Advanced Player's Guide / Ultimate Campaign, public SRD
 * content). Written when traits were NOT part of any vendored data (same
 * posture as `tables.ts`/`familiars.ts` for content the compendium doesn't
 * carry) — issue #74 Phase 1 later added the full ~2,000-entry published
 * catalog as `RefData.traits` (the pf1-content community module's
 * `pf-traits` pack), but this hand-verified 28-entry table is kept as-is
 * rather than replaced: `mergedTraits`/`resolveTraitDef` below fold the two
 * together, hand-authored winning on a name collision.
 *

 * A PF1 character takes two traits at creation, normally from two DIFFERENT
 * categories (the traditional "no two traits from the same category" guideline
 * is a soft one at most tables and some traits are explicitly exempt) — this
 * table does not enforce that pairing; see `model/traits.ts` for the
 * soft-warning posture (never blocks, matching the project's hybrid-prereqs
 * stance elsewhere).
 *
 * Every trait bonus uses the PF1 `"trait"` bonus type: trait bonuses do NOT
 * stack with each other even when they come from different traits (verified
 * against `stacking.ts` — `"trait"` is not in `STACKING_TYPES`, so same-target
 * trait bonuses resolve to the highest, exactly like `"racial"` or `"morale"`).
 *
 * Modelling notes / deliberate limitations:
 *   - Several traits' benefits are conditional on a situation the static sheet
 *     can't detect (flanking, surprise rounds, a specific attacker's gender,
 *     "when confirming a critical hit") — those carry `changes: []` (or a
 *     change against an unapplied target, e.g. `critConfirm`) plus a
 *     `contextNotes` reminder, never a flat always-on number that would
 *     over-apply. This mirrors `conditions.ts`'s prone/blinded treatment.
 *   - "Make skill X a class skill" is not expressible as a `Change` — the
 *     engine's class-skill set is derived solely from `RefData.classes[].
 *     classSkills` (see `compute.ts`'s `classSkillSet`), and there is no
 *     per-trait hook into it. Traits that grant class-skill status (Child of
 *     the Temple, Classically Schooled, Dangerously Curious, Suspicious,
 *     Vagabond Child) apply their flat skill Change and note the class-skill
 *     grant in `contextNotes` instead of inventing new engine machinery.
 *   - `cl` (caster level) and `concentration` are real `Change` targets used
 *     elsewhere in the vendored data (see `targets.ts`) but are not folded
 *     into any discrete number on today's static sheet — Magical Knack and
 *     Focused Mind still carry a real `Change` (for provenance / the existing
 *     "not auto-applied" badge machinery) plus a clarifying `contextNotes`.
 */

import type { Change, RefData, Trait, TraitCategory, TraitDef } from "@pf1/schema";

// TraitCategory/TraitDef live in @pf1/schema (not here) so a homebrew trait
// stored in `CharacterDoc.build.homebrew.traits` can share the exact same
// shape as this table's entries — see that type's doc comment.
export type { TraitCategory, TraitDef };

const t = (formula: string, target: string): Change => ({
  formula,
  target,
  type: "trait",
});

const TRAIT_LIST: TraitDef[] = [
  // ---- combat ---------------------------------------------------------------
  {
    id: "reactionary",
    name: "Reactionary",
    category: "Combat",
    summary: "+2 trait bonus on initiative checks.",
    changes: [t("2", "init")],
  },
  {
    id: "anatomist",
    name: "Anatomist",
    category: "Combat",
    summary: "+1 trait bonus on checks made to confirm a critical hit.",
    changes: [t("1", "critConfirm")],
    contextNotes: [
      {
        target: "critConfirm",
        text: "Confirm-crit rolls aren't tracked as a discrete number on the sheet; apply manually when confirming.",
      },
    ],
  },
  {
    id: "armorExpert",
    name: "Armor Expert",
    category: "Combat",
    summary:
      "Reduces armor check penalty by 1 (minimum 0); arcane spell failure chance increases by 1%.",
    changes: [t("1", "acpA")],
    contextNotes: [
      {
        target: "acpA",
        text: "Also increases arcane spell failure chance by 1% (side effect not tracked on the sheet).",
      },
    ],
  },
  {
    id: "deftDodger",
    name: "Deft Dodger",
    category: "Combat",
    summary: "+1 trait bonus on Reflex saving throws.",
    changes: [t("1", "ref")],
  },
  {
    id: "resilient",
    name: "Resilient",
    category: "Combat",
    summary: "+1 trait bonus on Fortitude saving throws.",
    changes: [t("1", "fort")],
  },
  {
    id: "fencer",
    name: "Fencer",
    category: "Combat",
    summary:
      "+1 trait bonus on attack rolls made to confirm critical hits with a light or one-handed piercing weapon; no Combat Expertise attack penalty when confirming those crits.",
    changes: [t("1", "critConfirm")],
    contextNotes: [
      {
        target: "critConfirm",
        text: "Only applies with light/one-handed piercing weapons; also waives the Combat Expertise attack penalty when confirming. Not auto-applied.",
      },
    ],
  },
  {
    id: "courageous",
    name: "Courageous",
    category: "Combat",
    summary: "+1 trait bonus on saving throws against fear effects.",
    changes: [],
    contextNotes: [
      {
        target: "will",
        text: "+1 trait bonus vs. fear only — not a general Will save bonus; apply manually when rolling a fear save.",
      },
    ],
    displayOnly: true,
  },
  {
    id: "dirtyFighter",
    name: "Dirty Fighter",
    category: "Combat",
    summary:
      "+1 trait bonus on damage rolls against a target denied its Dexterity bonus to AC (e.g. flanked).",
    changes: [],
    contextNotes: [
      {
        target: "wdamage",
        text: "Only applies when the target is denied its Dex bonus to AC (flanking, etc.) — situational, not auto-applied.",
      },
    ],
    displayOnly: true,
  },
  // ---- faith ------------------------------------------------------------------
  {
    id: "indomitableFaith",
    name: "Indomitable Faith",
    category: "Faith",
    summary: "+1 trait bonus on Will saving throws.",
    changes: [t("1", "will")],
  },
  {
    id: "fatesFavored",
    name: "Fate's Favored",
    category: "Faith",
    summary: "Whenever you benefit from a luck bonus, that bonus increases by 1.",
    changes: [],
    contextNotes: [
      {
        target: "allChecks",
        text: "Any luck bonus you gain is +1 higher than normal — situational, apply manually when a luck bonus applies.",
      },
    ],
    displayOnly: true,
  },
  {
    id: "sacredConduit",
    name: "Sacred Conduit",
    category: "Faith",
    summary: "+1 trait bonus to the DC of any channeled energy you channel.",
    changes: [],
    contextNotes: [
      {
        target: "allChecks",
        text: "+1 to your channel energy save DC — the sheet has no discrete channel-DC field yet; add it manually.",
      },
    ],
    displayOnly: true,
  },
  {
    id: "childOfTheTemple",
    name: "Child of the Temple",
    category: "Faith",
    summary:
      "Knowledge (religion) and a temple-related Profession are class skills for you; +1 trait bonus on Knowledge (religion) checks.",
    changes: [t("1", "skill.kre")],
    contextNotes: [
      {
        target: "skill.kre",
        text: "Also makes a temple-related Profession skill a class skill (your choice) — the sheet's class-skill list doesn't reflect this.",
      },
    ],
  },
  {
    id: "birthmark",
    name: "Birthmark",
    category: "Faith",
    summary: "+2 trait bonus on saving throws against charm and compulsion effects.",
    changes: [],
    contextNotes: [
      {
        target: "allChecks",
        text: "+2 vs. charm and compulsion effects only — situational, apply manually.",
      },
    ],
    displayOnly: true,
  },
  {
    id: "sacredTouch",
    name: "Sacred Touch",
    category: "Faith",
    summary:
      "As a standard action, you can touch a dying creature to automatically stabilize it, no check required.",
    changes: [],
    displayOnly: true,
  },
  {
    id: "honest",
    name: "Honest",
    category: "Faith",
    summary:
      "+1 trait bonus on Diplomacy checks, increasing to +2 when influencing creatures already friendly or helpful toward you.",
    changes: [t("1", "skill.dip")],
    contextNotes: [
      {
        target: "skill.dip",
        text: "The bonus is +2 instead of +1 against targets whose attitude is already friendly or helpful — attitude isn't tracked, so only the base +1 is applied.",
      },
    ],
  },
  // ---- magic --------------------------------------------------------------
  {
    id: "magicalKnack",
    name: "Magical Knack",
    category: "Magic",
    summary:
      "+2 trait bonus to caster level for a chosen class, to a maximum equal to your total Hit Dice.",
    changes: [t("2", "cl")],
    contextNotes: [
      {
        target: "cl",
        text: "Capped at your total Hit Dice; the sheet has no discrete caster-level stat to auto-cap or display this against — apply manually.",
      },
    ],
  },
  {
    id: "focusedMind",
    name: "Focused Mind",
    category: "Magic",
    summary: "+2 trait bonus on concentration checks.",
    changes: [t("2", "concentration")],
    contextNotes: [
      {
        target: "concentration",
        text: "Concentration checks aren't tracked on the sheet as a discrete number — apply manually.",
      },
    ],
  },
  {
    id: "classicallySchooled",
    name: "Classically Schooled",
    category: "Magic",
    summary: "Spellcraft is always a class skill for you; +1 trait bonus on Spellcraft checks.",
    changes: [t("1", "skill.spl")],
    contextNotes: [
      {
        target: "skill.spl",
        text: "Also makes Spellcraft a class skill even if your class doesn't include it — the sheet's class-skill list doesn't reflect this.",
      },
    ],
  },
  {
    id: "magicalLineage",
    name: "Magical Lineage",
    category: "Magic",
    summary:
      "Choose one spell; when applying metamagic feats to that spell, treat its effective level as 1 lower for determining the level increase.",
    changes: [],
    contextNotes: [
      {
        target: "allChecks",
        text: "Applies only to one chosen spell's metamagic cost — situational, not tracked as a number here.",
      },
    ],
    displayOnly: true,
  },
  {
    id: "dangerouslyCurious",
    name: "Dangerously Curious",
    category: "Magic",
    summary:
      "Use Magic Device is always a class skill for you; +1 trait bonus on Use Magic Device checks.",
    changes: [t("1", "skill.umd")],
    contextNotes: [
      {
        target: "skill.umd",
        text: "Also makes Use Magic Device a class skill — the sheet's class-skill list doesn't reflect this.",
      },
    ],
  },
  // ---- social ---------------------------------------------------------------
  {
    id: "suspicious",
    name: "Suspicious",
    category: "Social",
    summary: "Sense Motive is always a class skill for you; +1 trait bonus on Sense Motive checks.",
    changes: [t("1", "skill.sen")],
    contextNotes: [
      {
        target: "skill.sen",
        text: "Also makes Sense Motive a class skill — the sheet's class-skill list doesn't reflect this.",
      },
    ],
  },
  {
    id: "convincingLiar",
    name: "Convincing Liar",
    category: "Social",
    summary:
      "+1 trait bonus on Bluff checks. When you tell a lie that isn't outrageous, roll twice for any check made to detect it and take the better result.",
    changes: [t("1", "skill.blf")],
    contextNotes: [
      {
        target: "skill.blf",
        text: "The 'roll twice, take the better' defense only applies to non-outrageous lies — situational, not tracked here.",
      },
    ],
  },
  {
    id: "vagabondChild",
    name: "Vagabond Child (Urban)",
    category: "Social",
    summary:
      "Sleight of Hand is always a class skill for you; +1 trait bonus on Sleight of Hand checks.",
    changes: [t("1", "skill.slt")],
    contextNotes: [
      {
        target: "skill.slt",
        text: "Also makes Sleight of Hand a class skill. The rural variant instead grants Handle Animal — pick whichever fits your background.",
      },
    ],
  },
  {
    id: "excitable",
    name: "Excitable",
    category: "Social",
    summary:
      "+2 trait bonus on initiative checks and Perception checks made during a surprise round.",
    changes: [],
    contextNotes: [
      {
        target: "init",
        text: "Only applies during a surprise round — situational, not auto-applied.",
      },
    ],
    displayOnly: true,
  },
  {
    id: "rumormonger",
    name: "Rumormonger",
    category: "Social",
    summary:
      "+1 trait bonus on Diplomacy checks made to gather information, which takes half the normal time.",
    changes: [t("1", "skill.dip")],
    contextNotes: [
      {
        target: "skill.dip",
        text: "The bonus and time reduction apply only to gather-information checks — situational scope, not distinguished by the sheet.",
      },
    ],
  },
  {
    id: "charming",
    name: "Charming",
    category: "Social",
    summary:
      "+2 trait bonus on Bluff checks to convince someone a lie is true, or Diplomacy checks to improve a creature's attitude, when the target is attracted to characters of your gender; you may use Diplomacy in place of Bluff to feint when this applies.",
    changes: [],
    contextNotes: [
      {
        target: "allChecks",
        text: "Only applies when the target is attracted to your gender — situational, not auto-applied.",
      },
    ],
    displayOnly: true,
  },
  {
    id: "naturalBornLeader",
    name: "Natural-Born Leader",
    category: "Social",
    summary:
      "Cohorts, followers, and summoned creatures under your leadership gain a +1 morale bonus on Will saves against mind-affecting effects; if you take the Leadership feat, you gain a +1 trait bonus to your Leadership score.",
    changes: [],
    contextNotes: [
      {
        target: "will",
        text: "The Will bonus applies to your cohorts/followers/summons, not to you. Leadership score isn't tracked on the sheet.",
      },
    ],
    displayOnly: true,
  },
];

export const TRAITS: Record<string, TraitDef> = Object.fromEntries(
  TRAIT_LIST.map((tr) => [tr.id, tr]),
);

export const TRAIT_IDS: readonly string[] = TRAIT_LIST.map((tr) => tr.id);

/**
 * Normalizes a trait name for cross-catalog dedup — same recipe as
 * `data-pipeline`'s `normalizeFeatName` (lowercase, strip non-alphanumerics),
 * kept as a separate copy here since the engine doesn't depend on
 * `data-pipeline`.
 */
function normalizeTraitName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Names already covered by the hand-authored table (issue #23) — used to
 * drop the vendored catalog's duplicate of each one (issue #74 Phase 1). See
 * {@link mergedTraits}'s doc comment for why the hand-authored side always
 * wins rather than a field-by-field overlay.
 */
const HAND_AUTHORED_TRAIT_NAMES = new Set(TRAIT_LIST.map((tr) => normalizeTraitName(tr.name)));

/** Foundry's lowercase `traitType` ("combat", "drawback", …) Title-Cased for display. */
function traitCategoryFromType(traitType: string): TraitCategory {
  return traitType.length === 0 ? "Campaign" : traitType[0]!.toUpperCase() + traitType.slice(1);
}

/**
 * Converts one vendored `RefData.traits` entry to the `TraitDef` shape the
 * rest of the app (picker, `collectModifiers`) already knows how to render
 * and apply. No `summary` — see `TraitDef.summary`'s doc comment for why the
 * UI falls back to `description` instead.
 */
function vendoredTraitToDef(tr: Trait): TraitDef {
  return {
    id: tr.id,
    name: tr.name,
    category: traitCategoryFromType(tr.traitType),
    changes: tr.changes,
    contextNotes: tr.contextNotes.length > 0 ? tr.contextNotes : undefined,
    displayOnly: tr.changes.length === 0,
    description: tr.description,
    sources: tr.sources,
    tags: tr.tags,
  };
}

/**
 * Resolves a trait id through the hand-authored table first, then the
 * vendored catalog (`refData.traits`) — the cheap, single-id lookup used on
 * the engine's hot path (`collect.ts`, called on every `compute()`). Does
 * NOT check `doc.build.homebrew.traits`; see `apps/web/model/traits.ts`'s
 * `resolveTrait` for the full chain including that fallback.
 */
export function resolveTraitDef(id: string, refData: RefData): TraitDef | undefined {
  const handAuthored = TRAITS[id];
  if (handAuthored) return handAuthored;
  const vendored = refData.traits[id];
  return vendored ? vendoredTraitToDef(vendored) : undefined;
}

/**
 * The full pickable trait catalog for browsing: the 28 hand-authored entries
 * (issue #23) plus every vendored trait (issue #74 Phase 1) whose normalized
 * name doesn't collide with one of them. On a name collision the
 * hand-authored entry wins outright — same "richer record wins" precedent as
 * `data-pipeline`'s feats merge (system pack over the community pack) —
 * rather than splicing fields from both, since every hand-authored trait's
 * mechanics are already hand-verified against the published rules and a
 * partial overlay risks quietly regressing that verification. Recomputes
 * from `refData.traits` on every call; callers should memoize on `refData`
 * (a stable reference for the app's lifetime), not call this per keystroke.
 */
export function mergedTraits(refData: RefData): Record<string, TraitDef> {
  const out: Record<string, TraitDef> = { ...TRAITS };
  for (const tr of Object.values(refData.traits)) {
    if (HAND_AUTHORED_TRAIT_NAMES.has(normalizeTraitName(tr.name))) continue;
    out[tr.id] = vendoredTraitToDef(tr);
  }
  return out;
}
