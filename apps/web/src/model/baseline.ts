/**
 * Compute the character's UNCONDITIONED baseline sheet — what every stat would
 * read with no transient, moment-to-moment session state applied. Used purely
 * for display (Sheet.tsx): a stat whose live value differs from this baseline
 * gets a sage/oxblood tint + arrow, showing at a glance which numbers are
 * currently altered (issue: "recompute is invisible" — the living-sheet UX
 * audit).
 *
 * Stripped from `live.*`:
 *  - `conditions` — Prone, Shaken, etc.
 *  - `activeBuffs` — spells/effects currently running.
 *  - `abilityDamage` / `abilityPenalty` — temporary ability score hits (issue
 *    #18); both heal or clear on their own and are exactly the kind of
 *    right-now state this cue is for.
 *  - `negativeLevels` — energy-drain penalties (issue #19), including the
 *    `permanent` half: PF1 RAW lets these be removed by Restoration-type
 *    magic, but at the table they read as "something is happening to me
 *    right now," same as a condition.
 *  - `activeForm` — a polymorph-family transformation (issue #70, Wild Shape
 *    or a Beast Shape/Elemental Body/Plant Shape spell): exactly the kind of
 *    moment-to-moment session state this cue exists for, same posture as
 *    `activeBuffs`.
 *
 * Deliberately NOT stripped:
 *  - `abilityDrain` — unlike damage, drain permanently lowers the ability
 *    score itself until magic restores it; it reads more like a build fact
 *    than a live toggle, so it stays part of "baseline you."
 *  - `hp`, `resources`, `spells`, `heroPoints`, `money`, `xp`, familiar/
 *    companion live state — irrelevant to the AC/save/attack-family stats
 *    this tint targets (HP has its own current-vs-max treatment already).
 *  - Everything under `build.*` and `identity.*` (gear, feats, class levels,
 *    equipment) — the baseline is "this character with nothing temporary
 *    going on," not "this character naked."
 *
 * Pure: never mutates `doc`. Cheap to call on every render, same posture as
 * `compute()` itself (see CLAUDE.md: "the web app recomputes on every change
 * rather than memoizing cleverly").
 */
import { compute } from "@pf1/engine";
import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

export function baselineSheet(doc: CharacterDoc, refData: RefData): DerivedSheet {
  const stripped: CharacterDoc = {
    ...doc,
    live: {
      ...doc.live,
      conditions: [],
      activeBuffs: [],
      abilityDamage: undefined,
      abilityPenalty: undefined,
      negativeLevels: undefined,
      activeForm: undefined,
    },
  };
  return compute(stripped, refData);
}
