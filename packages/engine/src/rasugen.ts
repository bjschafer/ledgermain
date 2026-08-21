/**
 * Alchemist Mnemostiller archetype's Rasugen (archetype feature
 * `alchemist:mnemostiller:rasugen:1`) — hand-authored clean-room, following
 * `cognatogen.ts`'s precedent for a mutagen-family toggle with no vendored
 * buff to piggyback on (`buffs.json` has zero "Rasugen" hits, unlike
 * Mutagen's three).
 *
 * RAW (Pathfinder Campaign Setting: Distant Realms p.52, verified via
 * aonprd.com): "Once imbibed, a rasugen
 * grants a +2 alchemical bonus on all saving throws and 2 temporary hit
 * points per alchemist level for 10 minutes per alchemist level. In
 * addition, while the rasugen is in effect, a mnemostiller takes a -2
 * penalty to his Intelligence score and can't attempt checks using
 * Appraise, Craft, Disable Device, Heal, Knowledge (any), Profession,
 * Sleight of Hand, or Spellcraft. This acts in all other ways like a
 * mutagen." At 14th level (Persistent rasugen), the duration becomes 1 hour
 * per alchemist level instead.
 *
 * This replaces mutagen outright (a mnemostiller "can never gain the
 * mutagen, cognatogen, or inspiring cognatogen ability, even from a
 * discovery or another class") rather than adding to it, unlike Cognatogen,
 * which shares the Mutagen pool alongside the vendored buffs. `resources.ts`
 * therefore filters the vendored Mutagen buff ids (and any Cognatogen ids)
 * out of the Mutagen pool's `linkedBuffIds` for a mnemostiller and links
 * `RASUGEN_BUFF_ID` in their place — the base "Rasugen" archetype feature
 * carries no `pairedBaseFeatureUuid` of its own to suppress the vendored
 * Mutagen class feature (a vendored-data gap, same shape as several
 * ambiguous archetype swaps already worked around in `archetypes.ts`), so
 * the Mutagen pool itself still derives and is repurposed here rather than a
 * new pool being grown for it.
 *
 * The skill-check prohibition (Appraise, Craft, Disable Device, Heal,
 * Knowledge (any), Profession, Sleight of Hand, Spellcraft) has no engine
 * target — skills aren't individually blockable — so it's a `contextNote`
 * reminder, same posture as the "on expiry" riders elsewhere in this
 * codebase. Not injected into `RefData.buffs`; `ResourcesPanel.tsx` resolves
 * `RASUGEN_BUFF_ID` against this module's constant directly.
 */

import type { Buff, Change } from "@pf1/schema";

const c = (formula: string, target: string): Change => ({
  formula,
  target,
  type: "alchemical",
});

/** Stable id, namespaced so it can never collide with a real `refData.buffs` key (see `COGNATOGEN_BUFF_IDS`). */
export const RASUGEN_BUFF_ID = "engine:alchemist-mnemostiller-rasugen";

/**
 * Base duration is 10 min/alchemist level; `duration.value` is never run
 * through the formula evaluator (only a display-heuristic regex in
 * `apps/web/src/model/buffs.ts`'s `suggestRounds`), so the 14th-level
 * Persistent rasugen extension to 1 hour/level can't be expressed as a
 * conditional formula here — it's a contextNote reminder instead.
 */
export const RASUGEN_BUFF: Buff = {
  id: RASUGEN_BUFF_ID,
  name: "Rasugen",
  uuid: "Local.pf1-clean-room.buffs.alchemist-mnemostiller-rasugen",
  subType: "feat",
  changes: [c("2", "allSavingThrows"), c("2 * @classes.alchemist.level", "tempHp"), c("-2", "int")],
  contextNotes: [
    {
      target: "allChecks",
      text: "While a rasugen is in effect you can't attempt Appraise, Craft, Disable Device, Heal, Knowledge (any), Profession, Sleight of Hand, or Spellcraft checks. At 14th level (Persistent rasugen) the duration becomes 1 hour per alchemist level instead of 10 minutes per level. Only one mutagen family effect can be active at a time.",
    },
  ],
  duration: { units: "minute", value: "10 * @classes.alchemist.level" },
};
