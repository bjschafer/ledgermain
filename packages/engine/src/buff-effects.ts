/**
 * Hand-authored extra `Change[]` appended to a small, named set of vendored
 * buffs whose own `changes[]` are missing a numeric effect their published
 * description text promises — same "vendored gap, patched clean-room" posture
 * as `archetype-effects.ts`/`feat-effects.ts` patch a gap in a class
 * feature/feat rather than a buff.
 *
 * Keyed by the buff's NAME, not its `RefData.buffs` id (a content hash that
 * could shift across a future data-pipeline rebuild) — `ActiveBuff.name` is a
 * snapshot of `RefData.buffs[id].name` taken at activation time (see
 * `apps/web/src/model/buffs.ts` `makeActiveBuff`), so this lookup works
 * identically for every activation path (`toggleLinkedBuff`, `toggleTableBuff`,
 * or a manual add from the Buffs panel) without needing the buff's id at
 * collect-time. Applied generically in `collect.ts`'s active-buffs loop.
 *
 * Read and left unpromoted, beyond the save-category rejects documented
 * below `SAVE_CATEGORY_PATCHES`:
 * - Jump and both Aeromantic Concoction buffs (Air Walk, Feather Fall) grant
 *   a bonus to Acrobatics checks to make high or long jumps specifically,
 *   not to Acrobatics generally — the same "jump checks are narrower than
 *   Acrobatics" gap `class-feature-effects.ts`'s Talmandor's Blessing leaves
 *   unwired, for the identical reason: `skill.acr` has no jump-only slice.
 * - Magboots' +10 circumstance bonus only applies while climbing metal
 *   surfaces; `skill.clm` has no material-scoped slice, and an unconditional
 *   Change would overstate onto climbing rope, wood, or stone too. Animal
 *   Focus (Snake)'s dodge-AC-vs-AoO half is the same "attacks of
 *   opportunity" scope, but `Change.acCategories` gives AC (unlike attack) a
 *   real AoO slice — see `ANIMAL_FOCUS_SNAKE_AOO_AC` below. The buff's attack
 *   half stays prose: `attack` still has no AoO-only slice.
 * - Inspiring Pain's +2 only applies to nonlethal damage rolls; like Spire
 *   Totem's nonlethal-only damage bonus in `rage-powers.ts`, the engine's
 *   weapon-damage targets are whole-attack, so an unconditional Change would
 *   overstate onto lethal damage too.
 * - Opportune Advice and Knowledgeable Strike (both Cryptid Scholar) grant
 *   their bonus to ALLIES, not to whoever activates the buff, and scope it to
 *   creatures sharing the type and subtype of a specific identified monster
 *   (a per-use choice, not a standing property) — Knowledgeable Strike's
 *   extra damage is also dice-based precision damage on the next hit, which
 *   its own vendored note already flags as unsuited to a `Change`.
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
 * NOT vendored (a vendored-data bug): the buff's own `changes[]` never
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

/**
 * Animal Focus (Snake) (id `wm3VB0brsAuhua0V`). The vendored buff ships no
 * `changes[]` at all — both halves of its benefit arrive as contextNotes:
 *   - `ac`: "+[[2 + floor((@item.level - 1) / 7) * 2]] against attacks of
 *     opportunity"
 *   - `attack`: "+[[2 + floor((@item.level - 1) / 7) * 2]] to attacks of
 *     opportunity"
 * `Change.acCategories` gives the AC half a real `aoo` slice (see
 * `ac-categories.ts`), so this patches that half in; the attack half stays
 * prose, since `attack` has no such slice — the buff no longer belongs in
 * `BUFF_PROSE_RULINGS` (it now has a wired route), but its attack-vs-AoO
 * remainder still needs the reminder note the vendored contextNote carries.
 * Formula mirrors the buff's own scaling (`@item.level` is the
 * buff's own set level, per `collect.ts`'s "`@item.level` / `@cl` in a buff
 * formula" comment) rather than a fresh derivation.
 */
const ANIMAL_FOCUS_SNAKE_AOO_AC: Change = {
  formula: "2 + floor((@item.level - 1) / 7) * 2",
  target: "ac",
  type: "dodge",
  acCategories: ["aoo"],
};

/**
 * The other shape of vendored gap this table fills: a buff whose save bonus
 * applies only against a CATEGORY of effects. The pack has no way to say
 * "against fear", so bless arrives with its +1 morale to attack rolls as a
 * real `Change` and the save half as the contextNote "+1 Morale vs Fear
 * effects" — text, and nothing that moves a number. `Change.saveCategories`
 * closes that: each entry below is transcribed from the note beside it, keeps
 * out of the save's headline total, and shows as a situational total instead
 * (see `save-categories.ts`).
 *
 * Only promoted where the whole bonus is a standing modifier that fits the
 * vocabulary. All 190 vendored buffs were read for this sweep; left as prose:
 * - Angelic Aspect (all three tiers): the evil-creature-scoped resistance and
 *   deflection notes name a property of the attacker, not the effect. The
 *   "+2 Morale vs existing Enchantment [charm] and [compulsion] effects" note
 *   looks like a fit but isn't one — Protection from Evil (which Angelic
 *   Aspect grants) only ever offers that +2 as an EXTRA saving throw against
 *   an effect already controlling the target, rolled at the original effect's
 *   DC, per its own published text. There is no standing enchantment-save
 *   bonus in the spell to promote, only a break-free grant conditioned on an
 *   active effect this loop has no way to read.
 * - Lion's Call (the vendored formula evaluates to +0, so there is no number
 *   to carry), Sunblock Kohl and Veemod (light-based dazzling, a descriptor
 *   with no `SAVE_CATEGORIES` entry), Opportune Advice (gated on having
 *   identified the creature, and scoped to that creature's own type and
 *   subtype — a property of the attacker), and Temporary Alliance (gated on
 *   an allying cavalier/samurai currently threatening the target).
 * - Filter Mask and Freedom of Movement grant immunity outright, with no
 *   bonus for the vocabulary to carry.
 * - Danger Ward (Fortitude/Reflex/Will) is a once-per-day reroll carrying a
 *   competence bonus on the REROLL, not a standing modifier — the same
 *   reroll-not-a-bonus family as `feat-save-categories.ts`'s Aboleth Deceiver
 *   reject.
 * - Endure Elements only waives Fortitude saves against extreme temperature;
 *   there is no bonus to carry.
 * - Animal Focus (Mouse)'s note describes evasion (no damage on a successful
 *   Reflex save), not a flat modifier.
 * - Sheltering Walls' cover note restates a Reflex `Change` the buff already
 *   ships unconditionally; it is not an additional conditional layer.
 * - Spell Deflection's note is itself a dice-based mechanic, not a saving
 *   throw.
 *
 * Inspire Courage covers "charm and fear", both of which the vocabulary
 * carries. Burst of Glory and Remove Fear are flat, unconditional bonuses
 * against fear, the same shape as Bless/Aid — confirmed against aonprd.com's
 * spell pages (Burst of Glory: "+1 sacred bonus on attack rolls and saves
 * against fear effects"; Remove Fear: "+4 morale bonus against fear effects").
 */
export const SAVE_CATEGORY_PATCHES: Readonly<Record<string, readonly Change[]>> = {
  // "+1 Morale vs Fear effects" — the save half of bless/aid, whose attack
  // half the pack already ships.
  Aid: [{ formula: "1", target: "allSavingThrows", type: "morale", saveCategories: ["fear"] }],
  Bless: [{ formula: "1", target: "allSavingThrows", type: "morale", saveCategories: ["fear"] }],
  // "-1 vs Fear effects" — untyped, matching the pack's own untyped attack
  // penalty; penalties stack regardless.
  Bane: [{ formula: "-1", target: "allSavingThrows", type: "untyped", saveCategories: ["fear"] }],
  // "+4 Morale vs death spells and magical death effects" (the buff ships no
  // changes at all). The "even if a save is not normally allowed" clause and
  // the energy-drain immunity stay in the note.
  "Death Ward": [
    { formula: "4", target: "allSavingThrows", type: "morale", saveCategories: ["death"] },
  ],
  // The save bonus is morale where the same buff's attack/damage bonus is
  // competence, and scales on the same schedule.
  "Inspire Courage": [
    {
      formula: "1 + max(0, floor((@item.level + 1) / 6))",
      target: "allSavingThrows",
      type: "morale",
      saveCategories: ["charm", "fear"],
    },
  ],
  "Karyukai Tea Set": [
    { formula: "4", target: "allSavingThrows", type: "morale", saveCategories: ["fear"] },
    { formula: "4", target: "allSavingThrows", type: "morale", saveCategories: ["poison"] },
  ],
  "Daikyu of Commanding Presence": [
    { formula: "2", target: "allSavingThrows", type: "morale", saveCategories: ["fear"] },
  ],
  // "+1 sacred bonus on attack rolls and saves against fear effects" — the
  // pack ships the attack half as a real `Change`, same gap shape as bless.
  "Burst of Glory": [
    { formula: "1", target: "allSavingThrows", type: "sacred", saveCategories: ["fear"] },
  ],
  // "+4 morale bonus against fear effects" (the buff ships no changes at
  // all, unlike bless/aid's attack-bonus half).
  "Remove Fear": [
    { formula: "4", target: "allSavingThrows", type: "morale", saveCategories: ["fear"] },
  ],
  // Purity is the one entry that DOUBLES a bonus rather than adding one: the
  // buff already ships an unconditional `1 + floor(@item.level / 5)` sacred
  // bonus, doubled against curses, diseases, and poisons at caster level 10.
  // Two sacred bonuses don't stack, so this carries the whole doubled value
  // and wins on highest-within-type rather than summing on top.
  Purity: [
    {
      formula: "if(gte(@item.level, 10), 2 * (1 + floor(@item.level / 5)), 0)",
      target: "allSavingThrows",
      type: "sacred",
      saveCategories: ["curse", "disease", "poison"],
    },
  ],
};

export const BUFF_CHANGE_PATCHES: Readonly<Record<string, readonly Change[]>> = {
  "Rage (Unchained)": [RAGE_UNCHAINED_TEMP_HP],
  "Animal Focus (Snake)": [ANIMAL_FOCUS_SNAKE_AOO_AC],
  ...SAVE_CATEGORY_PATCHES,
};

/**
 * Buff names in {@link SAVE_CATEGORY_PATCHES} whose patch captures the WHOLE
 * benefit of the `allSavingThrows` note it was transcribed from, versus one
 * that leaves a remainder in prose. Every entry is "full" except Death Ward:
 * its note's "even if a save is not normally allowed" clause grants a save
 * where none would otherwise exist, which has no expressible `Change` form
 * and stays in the note (see the doc comment above). Consulted by the UI so
 * a note still carrying an unmodeled remainder keeps its manual-apply
 * reminder instead of reading as fully handled.
 */
export const BUFF_SAVE_NOTE_COVERAGE: Readonly<Record<string, "full" | "partial">> = {
  Aid: "full",
  Bless: "full",
  Bane: "full",
  "Death Ward": "partial",
  "Inspire Courage": "full",
  "Karyukai Tea Set": "full",
  "Daikyu of Commanding Presence": "full",
  Purity: "full",
};

/**
 * Vendored buffs deliberately ruled prose-only: each promises a number the
 * `Change` vocabulary cannot carry honestly, for the reasons documented in
 * this file's header (jump-only Acrobatics slices, material-scoped Climb,
 * reroll-scoped save bonuses, light-effect save scopes, AoO-scoped
 * attack/AC, nonlethal-only damage, and ally-directed monster-scoped
 * bonuses). `scripts/mech-coverage.ts` consumes this set as reviewed
 * triage; membership means "read and rejected", never "not yet examined".
 */
export const BUFF_PROSE_RULINGS: ReadonlySet<string> = new Set([
  "Danger Ward (Fortitude)",
  "Danger Ward (Reflex)",
  "Danger Ward (Will)",
  "Sunblock Kohl",
  "Veemod (Brown)",
  "Jump",
  "Aeromantic Concoction (Air Walk)",
  "Aeromantic Concoction (Feather Fall)",
  "Magboots",
  "Inspiring Pain",
  "Opportune Advice (Cryptid Scholar)",
  "Knowledgeable Strike (Cryptid Scholar)",
]);
