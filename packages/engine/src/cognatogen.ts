/**
 * Alchemist Cognatogen buffs (Ultimate Magic discovery) — hand-authored
 * clean-room, following `bloodrage.ts`'s precedent for a toggleable effect
 * with no vendored buff to piggyback on (`buffs.json` has zero "Cognatogen"
 * hits, unlike Mutagen's three).
 *
 * RAW: a cognatogen is brewed and drunk exactly like a mutagen and shares its
 * numeric shape — +4 alchemical bonus to one chosen ability score, -2 to the
 * linked score, +2 natural armor, 10 min/level — with the two axes swapped:
 * it boosts a MENTAL score (Int/Wis/Cha) at the cost of the linked PHYSICAL
 * one (Int→Str, Wis→Dex, Cha→Con), the mirror of the vendored Mutagen buffs'
 * Str→Int / Dex→Wis / Con→Cha. Formulas are flat numbers for the same reason
 * the vendored Mutagen buffs are: the base effect doesn't scale with level.
 *
 * Scope note: Greater/Grand Cognatogen change these numbers (two/three
 * boosted scores, +6 natural armor) and are NOT modeled here — deliberately,
 * because the vendored Mutagen buffs don't model Greater/Grand Mutagen
 * either. This closes the Mutagen-parity gap at exactly Mutagen's own level
 * rather than overshooting it; the upgrade discoveries stay display-only in
 * `alchemist-discoveries.ts` with their numbers spelled out.
 *
 * Not injected into `RefData.buffs` — same reasoning as `BLOODRAGE_BUFF`
 * (would mean patching both loaders or adding a data supplement for three
 * buffs). `deriveResourcePools` appends these ids to the Mutagen pool's
 * `linkedBuffIds` when the character has the Cognatogen discovery, and
 * `ResourcesPanel.tsx` resolves them against this module's constants.
 *
 * The expiry cost (2 points of ability damage to the penalized score) is a
 * `contextNote`, not a Change: it lands when the buff ENDS, and this engine
 * has no end-of-duration hook — the same reason every other "on expiry"
 * rider in this codebase is a reminder rather than a number.
 */

import type { Buff, Change } from "@pf1/schema";

const c = (formula: string, target: string): Change => ({
  formula,
  target,
  type: "alchemical",
});

/** Discovery id in `ALCHEMIST_DISCOVERIES` that unlocks these buffs. */
export const COGNATOGEN_DISCOVERY_ID = "cognatogen";

/** Stable ids — namespaced so they can never collide with a real `refData.buffs` key (see `BLOODRAGE_BUFF_ID`). */
export const COGNATOGEN_BUFF_IDS = {
  int: "engine:alchemist-cognatogen-int",
  wis: "engine:alchemist-cognatogen-wis",
  cha: "engine:alchemist-cognatogen-cha",
} as const;

const EXPIRY_NOTE = {
  target: "allChecks",
  text: "When the cognatogen expires it deals 2 points of ability damage to the penalized score — apply by hand. Only one mutagen/cognatogen can be active at a time.",
} as const;

export const COGNATOGEN_BUFFS: Readonly<Record<string, Buff>> = {
  [COGNATOGEN_BUFF_IDS.int]: {
    id: COGNATOGEN_BUFF_IDS.int,
    name: "Cognatogen, Int",
    uuid: "Local.pf1-clean-room.buffs.alchemist-cognatogen-int",
    subType: "feat",
    changes: [c("4", "int"), c("-2", "str"), c("2", "nac")],
    contextNotes: [EXPIRY_NOTE],
    duration: { units: "minute", value: "10 * @classes.alchemist.level" },
  },
  [COGNATOGEN_BUFF_IDS.wis]: {
    id: COGNATOGEN_BUFF_IDS.wis,
    name: "Cognatogen, Wis",
    uuid: "Local.pf1-clean-room.buffs.alchemist-cognatogen-wis",
    subType: "feat",
    changes: [c("4", "wis"), c("-2", "dex"), c("2", "nac")],
    contextNotes: [EXPIRY_NOTE],
    duration: { units: "minute", value: "10 * @classes.alchemist.level" },
  },
  [COGNATOGEN_BUFF_IDS.cha]: {
    id: COGNATOGEN_BUFF_IDS.cha,
    name: "Cognatogen, Cha",
    uuid: "Local.pf1-clean-room.buffs.alchemist-cognatogen-cha",
    subType: "feat",
    changes: [c("4", "cha"), c("-2", "con"), c("2", "nac")],
    contextNotes: [EXPIRY_NOTE],
    duration: { units: "minute", value: "10 * @classes.alchemist.level" },
  },
};
