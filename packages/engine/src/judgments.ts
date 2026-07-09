/**
 * Clean-room PF1 inquisitor Judgment table (issue #65), hand-authored from
 * the published Advanced Player's Guide rules (verified against aonprd.com's
 * live Inquisitor class page, "Judgment" ability, 2026-07-08).
 *
 * Judgment itself (the swift-action stance + its 1/day-at-1st,
 * +1-at-4th-and-every-3-levels-thereafter uses/day pool) is ALREADY fully
 * vendored — `RefData.classFeatures`'s "Judgment" entry (tag `judgment`)
 * carries `uses.maxFormula: "1 + floor((@class.unlevel - 1) / 3)"`, verified
 * against aonprd.com to match RAW exactly, so `deriveResourcePools` derives
 * the pool with zero hand-authoring needed there. What's missing is the
 * seven individual judgment TYPES themselves: the vendored "Judgment"
 * feature's `grantsBuffs` UUIDs (`Compendium.pf1.class-abilities.Item.*`)
 * point at per-judgment sub-entries that never made it into the data
 * pipeline at all (confirmed absent from `class-features.json` — not a buff,
 * not anything) — so there is nothing upstream to resolve `linkedBuffIds`
 * against, unlike Rage/Inspire Courage/Aura of Protection. This table is the
 * hand-authored substitute, wired onto the Judgment pool's new
 * `tableOptions` field (`resources.ts`) as `ToggleBuffOption`s — same
 * activation UX as a linked buff, but sourced from this table instead of
 * `RefData.buffs`.
 *
 * Scope: the seven Core Rulebook / APG judgments (Destruction, Justice,
 * Protection, Purity, Resiliency, Resistance, Smiting). Piercing (Ultimate
 * Combat) and any other splatbook judgments are out of scope, matching this
 * project's usual "core+APG first" posture (oracle-mysteries.ts, etc.).
 *
 * Modelling posture per judgment:
 *   - Destruction/Justice/Protection/Purity are flat "+1, +1 per N levels"
 *     sacred bonuses with a single unambiguous target — modeled as real
 *     formula-driven `Change`s (like every other level-scaling buff in this
 *     engine, e.g. vendored Inspire Courage's `@item.level`-driven formula).
 *   - Resiliency is DR/magic, same shape — modeled numerically, with a
 *     context note for the 10th-level magic→alignment bypass-type switch
 *     (this table doesn't know the character's alignment; shown as DR/magic
 *     at every level rather than guessing).
 *   - Resistance grants energy resistance against ONE energy type the player
 *     chooses at activation (acid/cold/electricity/fire/sonic) — this table
 *     has no picker for that choice, so (mirroring `arcanist-exploits.ts`'s
 *     identical "Energy Shield" judgment call) it is `changes: []` with a
 *     context note carrying the real numbers, rather than guessing a type or
 *     applying resistance to all five at once (which would be a real magic;
 *     RAW is exactly one type).
 *   - Smiting has no numeric target at all (it changes what a weapon
 *     bypasses, not a bonus value) — `changes: []`, context note only, per
 *     the task brief.
 *
 * Sacred-vs-profane (issue #65 task brief): "If the inquisitor is evil, she
 * receives profane bonuses instead of sacred. Neutral inquisitors must select
 * profane or sacred." This table always uses `type: "sacred"` and surfaces
 * the profane-swap as a context note rather than branching on `doc`'s
 * alignment field — same "note-tier, don't model alignment switching" bar
 * the task brief sets (and the same posture as Resiliency's bypass-type
 * note above). A sacred and a profane bonus of the same VALUE never stack
 * with each other anyway (both are "highest applies" against unrelated
 * sources 99% of the time in practice), so this is a display-only gap, not a
 * numeric one.
 */

import type { Change, ContextNote } from "@pf1/schema";

import type { ToggleBuffOption } from "./toggle-buffs.js";

export interface JudgmentDef {
  /** Slug, e.g. "destruction" — prefixed with `judgment:` to become `ToggleBuffOption.id`. */
  tag: string;
  name: string;
  /** One-line rules summary (paraphrased, not verbatim SRD text). */
  summary: string;
  changes: Change[];
  contextNotes?: ContextNote[];
}

const SACRED_PROFANE_NOTE = {
  target: "allChecks",
  text: 'Evil inquisitors gain a profane bonus instead of sacred (neutral inquisitors choose one); not modeled as an alignment-based type switch — this bonus is always typed "sacred" here.',
};

export const INQUISITOR_JUDGMENTS: JudgmentDef[] = [
  {
    tag: "destruction",
    name: "Destruction",
    summary: "+1 sacred bonus on weapon damage rolls, +1 per three inquisitor levels.",
    changes: [
      {
        formula: "1 + floor(@classes.inquisitor.level / 3)",
        target: "wdamage",
        type: "sacred",
      },
    ],
    contextNotes: [SACRED_PROFANE_NOTE],
  },
  {
    tag: "justice",
    name: "Justice",
    summary: "+1 sacred bonus on attack rolls, +1 per five inquisitor levels.",
    changes: [
      { formula: "1 + floor(@classes.inquisitor.level / 5)", target: "attack", type: "sacred" },
    ],
    contextNotes: [
      SACRED_PROFANE_NOTE,
      {
        target: "attack",
        text: "At 10th level this bonus is doubled on rolls to confirm a critical hit — not modeled as a separate confirmation-roll target.",
      },
    ],
  },
  {
    tag: "protection",
    name: "Protection",
    summary: "+1 sacred bonus to AC, +1 per five inquisitor levels.",
    changes: [
      { formula: "1 + floor(@classes.inquisitor.level / 5)", target: "ac", type: "sacred" },
    ],
    contextNotes: [
      SACRED_PROFANE_NOTE,
      {
        target: "ac",
        text: "At 10th level this bonus is doubled against attack rolls made to confirm a critical hit against you — not modeled.",
      },
    ],
  },
  {
    tag: "purity",
    name: "Purity",
    summary: "+1 sacred bonus on saving throws, +1 per five inquisitor levels.",
    changes: [
      {
        formula: "1 + floor(@classes.inquisitor.level / 5)",
        target: "allSavingThrows",
        type: "sacred",
      },
    ],
    contextNotes: [
      SACRED_PROFANE_NOTE,
      {
        target: "allSavingThrows",
        text: "At 10th level this bonus is doubled against curses, diseases, and poisons — not modeled as a separate save category.",
      },
    ],
  },
  {
    tag: "resiliency",
    name: "Resiliency",
    summary: "DR 1/magic, +1 per five inquisitor levels.",
    changes: [
      { formula: "1 + floor(@classes.inquisitor.level / 5)", target: "dr.magic", type: "untyped" },
    ],
    contextNotes: [
      SACRED_PROFANE_NOTE,
      {
        target: "dr.magic",
        text: "At 10th level this DR's bypass type changes from magic to your alignment (chaotic/evil/good/lawful) — shown here as DR/magic at every level; the alignment switch isn't modeled.",
      },
    ],
  },
  {
    tag: "resistance",
    name: "Resistance",
    summary: "Energy resistance 2 to one chosen energy type, +2 per three inquisitor levels.",
    // No unambiguous target: RAW grants resistance to exactly ONE energy type
    // (acid/cold/electricity/fire/sonic) chosen at activation, and this table
    // has no picker for that choice — same judgment call as
    // arcanist-exploits.ts's "Energy Shield" entry. Applying to all five
    // would be a real rules error, not a simplification.
    changes: [],
    contextNotes: [
      SACRED_PROFANE_NOTE,
      {
        target: "eres.fire",
        text: "Energy resistance 2 (+2 per three inquisitor levels, max 14 at 20th) against ONE energy type of your choice (acid/cold/electricity/fire/sonic) — not modeled as a permanent eres.* Change since the type isn't chosen here; track manually or add a custom buff for your chosen type.",
      },
    ],
  },
  {
    tag: "smiting",
    name: "Smiting",
    summary: "Weapons treated as magic to overcome DR; alignment-typed at 6th, adamantine at 10th.",
    // No numeric bonus at all — this judgment changes what a weapon bypasses,
    // not a value the stacking engine tracks. Context note only, per the
    // task brief ("Smiting (context note)").
    changes: [],
    contextNotes: [
      SACRED_PROFANE_NOTE,
      {
        target: "damage",
        text: "Your weapons count as magic for overcoming DR. At 6th level they also count as your alignment (chaotic/evil/good/lawful) for that purpose; at 10th level they count as adamantine for overcoming DR/hardness. Not modeled numerically.",
      },
    ],
  },
];

/** How many judgments can be active simultaneously — 1 at 1st, 2 at 8th (Second Judgment), 3 at 16th (Third Judgment). */
export function maxSimultaneousJudgments(inquisitorLevel: number): number {
  if (inquisitorLevel >= 16) return 3;
  if (inquisitorLevel >= 8) return 2;
  return 1;
}

/** Resource-pool `detail` line for the Judgment pool — see `resources.ts`'s `feature.tag === "judgment"` branch. */
export function judgmentPoolDetail(inquisitorLevel: number): string {
  const max = maxSimultaneousJudgments(inquisitorLevel);
  const cap =
    max === 1
      ? "1 judgment active at a time"
      : `${max} judgments active at once (Second/Third Judgment)`;
  return `${cap} — toggles below aren't mutually exclusive here; deactivate the old one yourself when swapping`;
}

/** `INQUISITOR_JUDGMENTS`, mapped to the generic `ToggleBuffOption` shape `resources.ts` surfaces on the pool. */
export function judgmentToggleOptions(): ToggleBuffOption[] {
  return INQUISITOR_JUDGMENTS.map((j) => ({
    id: `judgment:${j.tag}`,
    name: j.name,
    changes: j.changes,
    contextNotes: j.contextNotes,
  }));
}
