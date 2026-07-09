/**
 * Hand-authored extra `Change[]` appended to a small, named set of vendored
 * buffs whose own `changes[]` are missing a numeric effect their published
 * description text promises (issue #67) — same "vendored gap, patched
 * clean-room" posture as `archetype-effects.ts`/`feat-effects.ts` patch a gap
 * in a class feature/feat rather than a buff.
 *
 * Keyed by the buff's NAME, not its `RefData.buffs` id (a content hash that
 * could shift across a future data-pipeline rebuild) — `ActiveBuff.name` is a
 * snapshot of `RefData.buffs[id].name` taken at activation time (see
 * `apps/web/src/model/buffs.ts` `makeActiveBuff`), so this lookup works
 * identically for every activation path (`toggleLinkedBuff`, `toggleTableBuff`,
 * or a manual add from the Buffs panel) without needing the buff's id at
 * collect-time. Applied generically in `collect.ts`'s active-buffs loop.
 */

import type { Change } from "@pf1/schema";

/**
 * Unchained Barbarian's Rage (UC) buff ("Rage (Unchained)" in the vendored
 * data, id `ciAO4KwMonUzAGY0`). The buff's own description text ("You also
 * gain 2 temporary hit points per Hit Die...") and the separate Greater Rage
 * (UC)/Mighty Rage (UC) class features (which raise the per-Hit-Die amount to
 * 3 at 11th, 4 at 20th) are real PF1 Unchained RAW — confirmed against
 * d20pfsrd.com's "Unchained Barbarian" page:
 *   - 1st: "She also gains 2 temporary hit points per Hit Die."
 *   - 11th (Greater Rage): "The amount of temporary hit points gained when
 *     entering a rage increases to 3 per Hit Die."
 *   - 20th (Mighty Rage): "...increases to 4 per Hit Die."
 *   - "These temporary hit points are lost first when damage is taken,
 *     disappear when rage ends, and are not replenished if the barbarian
 *     enters rage again within 1 minute of the previous rage ending."
 * (the 1-minute no-replenish clause isn't modeled — this tracker has no
 * inter-rage cooldown timer; see `apps/web/src/model/hp.ts`
 * `applyGrantedTempHp`'s doc comment for what IS modeled: temp HP clearing to
 * 0 when the buff deactivates, which matches "disappear when rage ends"
 * exactly).
 *
 * NOT vendored — see IMPLEMENTATION_PLAN.md's "Vendored-data bugs found" #2
 * (2026-07-07 barbarian-unchained audit): the buff's own `changes[]` never
 * got a corresponding `tempHp` Change, despite the description text and the
 * separate Greater/Mighty Rage class features agreeing this is real RAW.
 *
 * Tier formula mirrors the buff's OWN vendored attack/damage/Will scaling
 * formula exactly (`2 + max(0, floor((@classes.barbarianUnchained.level - 2)
 * / 9))`, which already evaluates to 2 at levels 2-10, 3 at 11-19, 4 at
 * 20+) rather than a fresh `if`/`gte` chain, so a future data-pipeline diff
 * on the buff's own tier breakpoints stays trivially comparable to this
 * patch. `@attributes.hd.total` is TOTAL Hit Dice / character level
 * (`rolldata.ts`), matching "per Hit Die" literally — a multiclass barbarian
 * (Unchained) still gets the full per-HD amount, not just per barbarian
 * level, per the ability's own wording (deliberately a DIFFERENT roll-data
 * path than the buff's own `@classes.barbarianUnchained.level`-scaled
 * attack/damage changes, which key off class level, not total HD).
 */
const RAGE_UNCHAINED_TEMP_HP: Change = {
  formula:
    "(2 + max(0, floor((@classes.barbarianUnchained.level - 2) / 9))) * @attributes.hd.total",
  target: "tempHp",
  type: "untyped",
};

export const BUFF_CHANGE_PATCHES: Readonly<Record<string, readonly Change[]>> = {
  "Rage (Unchained)": [RAGE_UNCHAINED_TEMP_HP],
};
