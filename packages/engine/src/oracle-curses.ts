/**
 * Clean-room PF1 oracle's curse table (APG, DESIGN §6): hand-authored,
 * mirroring `bloodlines.ts`/`traits.ts`'s posture. Scope: the 6 base APG
 * curses (Clouded Vision, Deaf, Haunted, Lame, Tongues, Wasting) — the
 * vendored Foundry pack ships many more (Blackened, Aboleth, Accursed, ...
 * from later splatbooks), out of scope here.
 *
 * Unlike Oracle Mysteries (`oracle-mysteries.ts`), every one of these 6 base
 * curses IS individually vendored as its own `class-abilities` entry (e.g.
 * `lame-curse.u9KUlA4J4xUm8Wj8.yaml`) — just, like the mysteries, not linked
 * from the Oracle class def's `links.supplements` (only the generic
 * "Oracle's Curse" stub is), so `RefData.classFeatures` never picks them up
 * and they need hand-authoring here the same way.
 *
 * Modelling posture (mirrors bloodlines.ts / traits.ts):
 *   - `changes` holds ONLY the two curses with a genuinely unconditional,
 *     always-on numeric effect:
 *       - Wasting: "-4 penalty on Charisma-based skill checks, except for
 *         Intimidate" — the vendored `wasting-curse.DT09HcrTJjBwRTM6.yaml`
 *         carries a REAL `changes[]` entry (`formula: "-4"`,
 *         `target: "chaSkills"`, `type: "untyped"`), copied verbatim below;
 *         the Intimidate exception isn't expressible via the `chaSkills`
 *         target (which the vendored data itself doesn't carve out either),
 *         so it's called out in `contextNotes` instead of narrowing the target.
 *       - Lame: "reducing your base land speed by 10 feet if your base speed
 *         is 30 feet or more; by 5 feet if less" is prose-only upstream (no
 *         vendored `changes[]`), but is cleanly expressible with this
 *         engine's existing `landSpeed` Change target (see the Sylph "Like
 *         the Wind" racial trait in `racial-traits.ts`) evaluated against
 *         `@attributes.speed.land.total` — `buildRollData` deliberately
 *         populates that path from the character's PRE-buff race base speed
 *         (see `rolldata.ts`'s doc comment), which is exactly the RAW "base
 *         land speed" this curse keys off of.
 *   - The 1st-level tiered benefits (5th/10th/15th) for every curse are
 *     genuinely situational (darkvision range, blindsense/blindsight,
 *     immunity to a condition, a bonus language, ...) or already covered by
 *     an existing skill/sense the static sheet doesn't model as a discrete
 *     stat (Perception bonus that only applies to non-hearing-based checks,
 *     scent, tremorsense) — `contextNotes` only, never an over-applied flat
 *     number, same posture as `bloodlines.ts`'s activated/conditional powers.
 *   - Haunted grants two specific spells known for free at 1st level (plus
 *     more at 5th/10th/15th) — modeled the same shape as Oracle Mystery bonus
 *     spells (`OracleMysteryBonusSpell`/`mysterySpellsKnown`), since it's the
 *     same "auto-added to the known list, doesn't count against the cap"
 *     mechanic, just gated by curse choice instead of mystery choice.
 */

import type { Change, ContextNote, OracleCurse, RefData, SourceRef } from "@pf1/schema";

/** A spell granted free (added to the known list) at a given oracle level. */
export interface OracleCurseBonusSpell {
  level: number;
  id: string;
  name: string;
}

export interface OracleCurseDef {
  /** Matches `doc.build.oracleCurse` keys. */
  tag: string;
  name: string;
  /** Short rules summary (base effect + the 5th/10th/15th-level upgrades). */
  summary: string;
  /** Unconditional numeric modifiers (rare — see file doc comment). */
  changes: Change[];
  contextNotes?: ContextNote[];
  /** Spells auto-added to the known list at specific oracle levels (Haunted only). */
  bonusSpells?: OracleCurseBonusSpell[];
}

const c = (formula: string, target: string, type = "untyped"): Change => ({
  formula,
  target,
  type,
});

const CURSE_LIST: OracleCurseDef[] = [
  {
    tag: "cloudedVision",
    name: "Clouded Vision",
    summary:
      "Can't see beyond 30 ft., but gains darkvision. At 5th: range increases to 60 ft. At 10th: blindsense 30 ft. At 15th: blindsight 15 ft.",
    changes: [],
    contextNotes: [
      {
        target: "allChecks",
        text: "Vision capped at 30 ft. (60 ft. at 5th) but with darkvision; blindsense 30 ft. at 10th, blindsight 15 ft. at 15th — these are situational senses, not numbers on the sheet.",
      },
    ],
  },
  {
    tag: "deaf",
    name: "Deaf",
    summary:
      "Deafened (with all its penalties); spells cast as if under Silent Spell (no level/casting-time increase). At 5th: +3 competence on non-hearing Perception, initiative penalty reduced to -2. At 10th: scent, no initiative penalty. At 15th: tremorsense 30 ft.",
    changes: [],
    contextNotes: [
      {
        target: "skill.per",
        text: "Deafened (standard penalties apply); +3 competence on Perception checks not relying on hearing starting at 5th level — situational, apply manually.",
      },
      {
        target: "init",
        text: "Deafened initiative penalty (-4 RAW) reduced to -2 at 5th level, removed at 10th — not auto-applied.",
      },
    ],
  },
  {
    tag: "haunted",
    name: "Haunted",
    summary:
      "Minor poltergeist mishaps (retrieving stored gear takes a standard action; dropped items scatter 10 ft.). Adds free spells known: Mage Hand + Ghost Sound (1st), Levitate + Minor Image (5th), Telekinesis (10th), Reverse Gravity (15th).",
    changes: [],
    contextNotes: [
      {
        target: "allChecks",
        text: "Retrieving stored gear takes a standard action; dropped items land 10 ft. away in a random direction — situational, doesn't change any numbers.",
      },
    ],
    bonusSpells: [
      { level: 1, id: "p8lm7khq3ynyif21", name: "Mage Hand" },
      { level: 1, id: "mtxqp85izkb20djq", name: "Ghost Sound" },
      { level: 5, id: "plou8h168bfn5hq6", name: "Levitate" },
      { level: 5, id: "27o3msobhyghmfid", name: "Minor Image" },
      { level: 10, id: "3lfx1ccxo2hdqrf3", name: "Telekinesis" },
      { level: 15, id: "3bdfw5f15hwcxlth", name: "Reverse Gravity" },
    ],
  },
  {
    tag: "lame",
    name: "Lame",
    summary:
      "Base land speed reduced by 10 ft. (5 ft. if base speed is already under 30 ft.); never reduced by encumbrance. At 5th: immune to fatigued. At 10th: speed never reduced by armor. At 15th: immune to exhausted.",
    changes: [c("if(gte(@attributes.speed.land.total, 30), -10, -5)", "landSpeed")],
    contextNotes: [
      {
        target: "landSpeed",
        text: "Never reduced by encumbrance (starting immediately) or armor (starting 10th level) — that exemption isn't auto-applied; back it out manually if relevant.",
      },
    ],
  },
  {
    tag: "tongues",
    name: "Tongues",
    summary:
      "Under stress, can only speak/understand one chosen outer-plane language (gained as a bonus language). At 5th: a second language. At 10th: understand any spoken language even in combat (as tongues). At 15th: speak and understand any language, though speech is still restricted in combat.",
    changes: [],
    contextNotes: [
      {
        target: "allChecks",
        text: "Applies to language-dependent spells too — situational, doesn't change any numbers. Note your chosen language(s) yourself; there's nowhere to record them here.",
      },
    ],
  },
  {
    tag: "wasting",
    name: "Wasting",
    summary:
      "-4 penalty on Charisma-based skill checks (except Intimidate); +4 competence on saves vs. disease. At 5th: immune to sickened. At 10th: immune to disease. At 15th: immune to nauseated.",
    changes: [c("-4", "chaSkills")],
    contextNotes: [
      {
        target: "chaSkills",
        text: "Intimidate is exempt from this -4, but the penalty above applies to all Charisma-based skills — back it out manually for Intimidate checks.",
      },
      {
        target: "allSavingThrows",
        text: "+4 competence bonus on saves against disease — situational, not folded into the general saves total.",
      },
    ],
  },
];

export const ORACLE_CURSES: Record<string, OracleCurseDef> = Object.fromEntries(
  CURSE_LIST.map((cu) => [cu.tag, cu]),
);

export const ORACLE_CURSE_TAGS: readonly string[] = CURSE_LIST.map((cu) => cu.tag);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74 Phase 3c: `RefData.oracleCurses` is the FULL published catalog
 * (41 entries after junk filtering), prose only — same "catalog from data,
 * mechanics as overlay" pattern as `rage-powers.ts`'s
 * `mergedRagePowerCatalog`. The hand-verified 6-base-curse table above stays
 * authoritative for mechanics; this section merges the two for browsing.
 *
 * Matching is by NORMALIZED NAME. Collision audit (all 6 hand-authored
 * curses): all 6 matched a vendored entry by normalized name (`Clouded
 * Vision`, `Deaf`, `Haunted`, `Lame`, `Tongues`, `Wasting` all present
 * verbatim in the vendored dictionary) — no aliasing needed.
 */

const ORACLE_CURSE_NAME_ALIASES: Record<string, string> = {};

function normalizeCurseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A catalog entry the picker can browse — either the hand-authored def with vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedOracleCurseEntry extends OracleCurseDef {
  description?: string;
  sources?: SourceRef[];
  /** True for a vendored-only curse with no hand-authored mechanics — the picker's "M" (modeled) badge convention. */
  displayOnly: boolean;
}

function vendoredCurseToDef(entry: OracleCurse): MergedOracleCurseEntry {
  return {
    tag: entry.id,
    name: entry.name,
    summary: "",
    changes: [],
    description: entry.description,
    sources: entry.sources,
    displayOnly: true,
  };
}

/** Resolve a picked curse tag (`doc.build.oracleCurse`) to its definition — hand-authored table first, falling back to the vendored catalog for a tag that only exists there. */
export function resolveOracleCurse(
  tag: string,
  refData: RefData,
): MergedOracleCurseEntry | undefined {
  const hand = ORACLE_CURSES[tag];
  if (hand) return { ...hand, displayOnly: false };
  const vendored = refData.oracleCurses?.[tag];
  return vendored ? vendoredCurseToDef(vendored) : undefined;
}

/** The full picker-browsable catalog: every vendored curse, with any that collides (by normalized name) against a hand-authored entry replaced by that def, plus any hand-authored entry with no vendored counterpart appended. */
export function mergedOracleCurseCatalog(refData: RefData): MergedOracleCurseEntry[] {
  const handByNormName = new Map<string, OracleCurseDef>();
  for (const cu of CURSE_LIST) {
    handByNormName.set(normalizeCurseName(ORACLE_CURSE_NAME_ALIASES[cu.tag] ?? cu.name), cu);
  }

  const usedHandTags = new Set<string>();
  const merged: MergedOracleCurseEntry[] = [];
  for (const v of Object.values(refData.oracleCurses ?? {})) {
    const handMatch = handByNormName.get(normalizeCurseName(v.name));
    if (handMatch) {
      usedHandTags.add(handMatch.tag);
      merged.push({
        ...handMatch,
        description: v.description,
        sources: v.sources,
        displayOnly: false,
      });
    } else {
      merged.push(vendoredCurseToDef(v));
    }
  }
  for (const cu of CURSE_LIST) {
    if (!usedHandTags.has(cu.tag)) merged.push({ ...cu, displayOnly: false });
  }
  return merged;
}
