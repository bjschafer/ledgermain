/**
 * Clean-room PF1 character-traits table (DESIGN §6): hand-authored from the
 * published rules (Advanced Player's Guide / Ultimate Campaign, public SRD
 * content) — traits are NOT part of the vendored Foundry data pack, so there
 * is no upstream JSON to normalize (same posture as `tables.ts`/`familiars.ts`
 * for content the compendium doesn't carry).
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

import type { Change, ContextNote } from "@pf1/schema";

export type TraitCategory = "Combat" | "Faith" | "Magic" | "Social";

export interface TraitDef {
  id: string;
  name: string;
  category: TraitCategory;
  /** Short rules summary shown in the UI. */
  summary: string;
  /** Typed modifiers granted by the trait (empty when purely situational/prose). */
  changes: Change[];
  /** Non-mechanical reminders (situational scope, class-skill grants, etc.). */
  contextNotes?: ContextNote[];
  /** True when the trait has no flat modifier the static sheet applies. */
  displayOnly?: boolean;
}

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
        text: "Also makes a temple-related Profession skill a class skill (player choice) — not modeled by the engine's class-skill list.",
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
        text: "Also makes Spellcraft a class skill even if your class list doesn't include it — not modeled by the engine's class-skill list.",
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
        text: "Applies only to one chosen spell's metamagic cost — situational, not modeled numerically.",
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
        text: "Also makes Use Magic Device a class skill — not modeled by the engine's class-skill list.",
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
        text: "Also makes Sense Motive a class skill — not modeled by the engine's class-skill list.",
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
        text: "The 'roll twice, take the better' defense only applies to non-outrageous lies — situational, not modeled.",
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
];

export const TRAITS: Record<string, TraitDef> = Object.fromEntries(
  TRAIT_LIST.map((tr) => [tr.id, tr]),
);

export const TRAIT_IDS: readonly string[] = TRAIT_LIST.map((tr) => tr.id);
