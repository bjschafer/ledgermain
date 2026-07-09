/**
 * Bloodrager's Bloodrage class feature (ACG, issue #65) — hand-authored
 * clean-room from the published RAW (AoN/d20pfsrd), analogous to how
 * `bloodlines.ts` hand-authors content the vendored Foundry pack omits.
 *
 * The vendored "Bloodrage" class feature (`class-features.json`, tag
 * `bloodrage`) already carries a correct `uses.maxFormula`
 * (`4 + @abilities.con.mod + ((@class.unlevel - 1) * 2)`, rounds/day) — so
 * `deriveResourcePools` (`resources.ts`) already turns it into a working
 * resource pool for free. What it does NOT carry is `grantsBuffs`: unlike
 * barbarian's "Rage" class feature (which points at the vendored "Rage" buff,
 * `Compendium.pf1.buffs.Item.UgjpRD8vtiSWRxuL`), Bloodrage's `grantsBuffs` is
 * empty upstream, so the resource-pool + linked-buff-toggle shortcut
 * (`model/buffs.ts` `toggleLinkedBuff`, `ResourcesPanel.tsx`
 * `LinkedBuffToggle`) has nothing to activate — this class does NOT "already
 * work end-to-end like Rage" (verified: `resources.ts`'s `linkedBuffIds`
 * resolves `ClassFeature.grantsBuffs` UUIDs against `refData.buffs`, and
 * there both come up empty for Bloodrage).
 *
 * Reusing the vendored "Rage" buff directly would also be numerically WRONG
 * for a bloodrager: its `changes` formulas hardcode
 * `@classes.barbarian.level` (e.g. `4 + (floor((@classes.barbarian.level -
 * 2) / 9) * 2)`), which evaluates against a bloodrager's (zero) barbarian
 * level, not their bloodrager level.
 *
 * RAW (Bloodrage, ACG p. 9 — confirmed via the vendored feature's own
 * description text, which reads verbatim: "...he gains a +4 morale bonus to
 * his Strength and Constitution, as well as a +2 morale bonus on Will saves.
 * In addition, he takes a –2 penalty to Armor Class... Bloodrage counts as
 * the barbarian's rage class feature for the purpose of feat prerequisites,
 * feat abilities, magic item abilities, and spell effects.") is number-for-
 * number identical to the barbarian's own core Rage progression, just keyed
 * to bloodrager level instead of barbarian level — confirmed via Greater
 * Bloodrage (11th, "...increases to +6... Will saves increases to +3")
 * and Mighty Bloodrage (20th, "...increases to +8... to +4"), which land on
 * exactly the same milestones (11th/20th) and values the vendored "Rage"
 * buff's own formula produces for a barbarian at those levels.
 *
 * Deliberately NOT injected into `RefData.buffs` (would require patching two
 * separate loaders — the Node `loadRefData()` in `@pf1/data-pipeline` engine
 * tests read from, and the browser `refdata/loader.ts` fetch — or a full
 * `data:build` supplement, all disproportionate for one buff). Instead this
 * is a plain, self-contained `Buff`-shaped object: `toggleLinkedBuff` (`model
 * /buffs.ts`) accepts any `Buff`, not specifically one sourced from
 * `refData.buffs`, so the web UI can pass this constant directly. See
 * `ResourcesPanel.tsx`'s Bloodrage special-case and `resources.ts`'s
 * `linkedBuffIds` override for the wiring.
 */

import type { Buff, Change } from "@pf1/schema";

const c = (formula: string, target: string, type: string): Change => ({ formula, target, type });

/**
 * Stable id — not a real Foundry compendium id (this buff has no vendored
 * counterpart), but namespaced distinctly so it can never collide with a
 * real `refData.buffs` key.
 */
export const BLOODRAGE_BUFF_ID = "engine:bloodrager-bloodrage";

export const BLOODRAGE_BUFF: Buff = {
  id: BLOODRAGE_BUFF_ID,
  name: "Bloodrage",
  uuid: "Local.pf1-clean-room.buffs.bloodrager-bloodrage",
  subType: "feat",
  changes: [
    c("4 + (floor((@classes.bloodrager.level - 2) / 9) * 2)", "str", "morale"),
    c("4 + (floor((@classes.bloodrager.level - 2) / 9) * 2)", "con", "morale"),
    c("2 + floor((@classes.bloodrager.level - 2) / 9)", "will", "morale"),
    c("-2", "ac", "untyped"),
  ],
  contextNotes: [
    {
      target: "allChecks",
      text: "Can't use Cha-, Dex-, or Int-based skills (except Acrobatics, Fly, Intimidate, Ride) or abilities requiring patience/concentration while bloodraging.",
    },
  ],
  duration: {
    end: "initiative",
    units: "round",
    value: "2 + @classes.bloodrager.level * 2 + @abilities.con.mod",
  },
};
