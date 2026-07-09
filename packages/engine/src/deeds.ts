/**
 * Clean-room PF1 gunslinger/swashbuckler deed reference table (DESIGN §6,
 * issue #65): hand-authored from the published rules (Ultimate Combat for
 * gunslinger, Pathfinder Unchained for swashbuckler; verified against public
 * SRD text/AoN), mirroring `oracle-revelations.ts`'s posture — with one
 * asymmetry worth flagging up front:
 *
 * - **Gunslinger** deeds ARE individually vendored as real `ClassFeature`
 *   entries (`class-features.json`, granted at the correct levels via
 *   `Class.features`, each with a full prose `description`) — they already
 *   show up in `sheet.classFeatures` / `ClassFeaturesList.tsx` with a
 *   collapsible description today, no engine work needed for that part.
 * - **Swashbuckler** deeds are NOT individually vendored — the class def
 *   only links a single generic "Swashbuckler Deeds" stub `ClassFeature`
 *   (confirmed: `class-features.json` carries no per-deed entries at all,
 *   same "stub only" shape `oracle-revelations.ts` documents for Oracle's
 *   Revelation stub). There is no upstream JSON to normalize for these.
 *
 * Despite that asymmetry, THIS module hand-authors a matching table for
 * BOTH classes — deliberately, for two reasons: (1) parity — the in-play
 * reference panel (`DeedsPanel.tsx`) reads one shape for both classes rather
 * than special-casing gunslinger to reuse vendored prose; (2) the deliverable
 * this table adds that the vendored gunslinger prose does NOT carry in
 * structured form — a per-deed `actionType` and `cost` (grit/panache points)
 * as real fields, plus a terse one-line `summary` instead of a multi-
 * paragraph description. The existing `ClassFeaturesList` panel keeps
 * rendering the full vendored HTML prose for gunslinger deeds unchanged
 * (this table doesn't replace that) — `DeedsPanel` is a second, complementary
 * "what can I spend a grit/panache point on right now" view for both
 * classes, gated on class level like the six APG deed-and-mystery pickers.
 *
 * Deeds are NOT choice-bearing (every gunslinger/swashbuckler gets every
 * deed of her level automatically — contrast oracle revelations, which are
 * a budgeted pick) — so there is no `doc.build.*` field here at all, no
 * picker, and no persisted state. `deedsForClass(classTag, level)` is a pure
 * filter over the static table, called directly by the level the character
 * has in that class.
 *
 * **Precise Strike** (swashbuckler 3rd level) is the one deed with a genuine
 * flat numeric effect (add swashbuckler level to damage with a light or
 * one-handed piercing melee weapon, while panache >= 1) — see
 * `preciseStrikeBonus`. It is NOT modeled as an automatic `damage.weapon.
 * <group>` Change: the vendored weapon-group vocabulary
 * (`@pf1/engine` `weapon-groups.ts`'s `WEAPON_GROUPS` — axes, blades-heavy/
 * light, bows, close, crossbows, double, firearms, flails, hammers, monk,
 * polearms, spears, thrown, tribal) is a weapon-FAMILY taxonomy, not a
 * damage-TYPE/encumbrance-category one — "light or one-handed piercing"
 * cuts across several of those groups (a rapier is blades-light, a piercing
 * spear is spears, a starknife is thrown-or-close depending on build) and
 * neither `WeaponRef` nor `WeaponInstance` carries a piercing/slashing/
 * bludgeoning damage-type field at all (confirmed: `refdata.ts`'s
 * `WeaponRef` has no such field). So there is no clean automatic target to
 * attach the Change to without either inventing a damage-type field the rest
 * of the schema doesn't have, or over-applying to weapons that don't
 * qualify. Per this project's honesty bar (see `traits.ts`), the computed
 * number is instead surfaced as a `contextNotes` reminder on the deed entry
 * itself, AND `DeedsPanel` additionally renders the live number (from
 * `preciseStrikeBonus(swashbucklerLevel)`) inline for the current character
 * — a context note with the real number already substituted in, not a
 * generic reminder — so the player sees "+7 damage" rather than having to
 * do the arithmetic by hand, while the sheet's actual attack/damage totals
 * are left untouched (matching every other "requires manual verification of
 * a condition the engine can't check" entry in this codebase).
 */

import type { ContextNote } from "@pf1/schema";

export interface DeedDef {
  /** `<classTag>:<camelCaseName>` — unique across both tables. */
  id: string;
  classTag: "gunslinger" | "swashbuckler";
  name: string;
  /** Earliest class level this deed is available — gunslinger/swashbuckler gain all deeds of their level automatically. */
  minLevel: number;
  /** Action type as worded in the source text, e.g. "swift", "immediate", "standard", "full-round", "free", "passive" (no action — an always/conditionally-on effect), "move". */
  actionType: string;
  /** Grit/panache point cost, e.g. "1", "1 or 2", "0 (1 to act as swift)", "all (min 1)". "0" means the deed requires holding at least 1 point but doesn't spend one to activate. */
  cost: string;
  /** Short paraphrased rules summary (not verbatim SRD text) shown in the deeds reference panel. */
  summary: string;
  /** Non-mechanical reminders — used for Precise Strike's computed-number caveat and a couple of nested-choice pointers. */
  contextNotes?: ContextNote[];
  /** Always true — no deed here has a flat always-on numeric Change (Precise Strike's bonus is context-note tier, see file doc comment). */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawDeed {
  id: string;
  name: string;
  minLevel: number;
  actionType: string;
  cost: string;
  summary: string;
  contextNotes?: ContextNote[];
}

function forClass(classTag: DeedDef["classTag"], entries: RawDeed[]): DeedDef[] {
  return entries.map((e) => ({
    id: `${classTag}:${e.id}`,
    classTag,
    name: e.name,
    minLevel: e.minLevel,
    actionType: e.actionType,
    cost: e.cost,
    summary: e.summary,
    contextNotes: e.contextNotes,
    displayOnly: true,
  }));
}

/**
 * Ultimate Combat gunslinger deeds. Level gating and grit costs verified
 * against the vendored `class-features.json` prose (Deadeye through True
 * Grit) — see file doc comment for why this table exists alongside that
 * already-working vendored-description path.
 */
const GUNSLINGER_DEED_LIST: DeedDef[] = forClass("gunslinger", [
  {
    id: "deadeye",
    name: "Deadeye",
    minLevel: 1,
    actionType: "passive (modifies an attack)",
    cost: "1 per range increment beyond the first",
    summary:
      "Resolve a firearm attack beyond the first range increment against touch AC instead of normal AC (still takes the normal -2/increment penalty).",
  },
  {
    id: "gunslingersDodge",
    name: "Gunslinger's Dodge",
    minLevel: 1,
    actionType: "immediate",
    cost: "1 (or 0 to drop prone for +4 AC)",
    summary:
      "Move 5 ft. for a +2 AC bonus against a triggering ranged attack, or drop prone for +4 AC instead; light/medium armor and no more than a light load required.",
  },
  {
    id: "quickClear",
    name: "Quick Clear",
    minLevel: 1,
    actionType: "standard (or move for 1 grit)",
    cost: "0 (1 to act as a move action)",
    summary: "Clear the broken condition from a misfired firearm you're wielding.",
  },
  {
    id: "gunslingerInitiative",
    name: "Gunslinger Initiative",
    minLevel: 3,
    actionType: "passive",
    cost: "0 (requires 1+ grit)",
    summary:
      "+2 initiative while holding at least 1 grit point; with Quick Draw, draw a firearm as part of the initiative check.",
  },
  {
    id: "pistolWhip",
    name: "Pistol-Whip",
    minLevel: 3,
    actionType: "standard",
    cost: "1",
    summary:
      "Melee attack with the firearm as a bludgeoning weapon (1d6/1d10 by size), with a free trip attempt on a hit.",
  },
  {
    id: "utilityShot",
    name: "Utility Shot",
    minLevel: 3,
    actionType: "part of a firearm attack",
    cost: "0 (requires 1+ grit)",
    summary:
      "Shoot out a lock, nudge a tiny unattended object, or cauterize a bleed condition instead of dealing normal damage.",
  },
  {
    id: "deadShot",
    name: "Dead Shot",
    minLevel: 7,
    actionType: "full-round",
    cost: "1",
    summary:
      "Pool a full attack's worth of attack rolls into one shot; each extra hit adds another die of the firearm's base damage.",
  },
  {
    id: "startlingShot",
    name: "Startling Shot",
    minLevel: 7,
    actionType: "standard",
    cost: "0 (requires 1+ grit)",
    summary:
      "Purposely miss with a firearm attack to make the target flat-footed until your next turn.",
  },
  {
    id: "targeting",
    name: "Targeting",
    minLevel: 7,
    actionType: "full-round",
    cost: "1",
    summary:
      "Called shot to arms/head/legs/torso/wings for a disarm, confusion, trip, threatened-crit-on-19, or fall effect instead of extra damage.",
  },
  {
    id: "bleedingWound",
    name: "Bleeding Wound",
    minLevel: 11,
    actionType: "free",
    cost: "1 (or 2 for ability bleed)",
    summary:
      "A firearm hit also deals bleed damage equal to your Dexterity modifier, or 1 point of Str/Dex/Con bleed for 2 grit.",
  },
  {
    id: "expertLoading",
    name: "Expert Loading",
    minLevel: 11,
    actionType: "free (reaction to a misfire)",
    cost: "1",
    summary: "Keep a broken gun from exploding on a misfire (it stays broken).",
  },
  {
    id: "lightningReload",
    name: "Lightning Reload",
    minLevel: 11,
    actionType: "swift (or free with Rapid Reload/cartridge)",
    cost: "0 (requires 1+ grit)",
    summary:
      "Reload a barrel as a swift action without provoking, while holding at least 1 grit point.",
  },
  {
    id: "evasive",
    name: "Evasive",
    minLevel: 15,
    actionType: "passive",
    cost: "0 (requires 1+ grit)",
    summary:
      "Gain evasion, uncanny dodge, and improved uncanny dodge (as rogue level = gunslinger level) while holding grit.",
  },
  {
    id: "menacingShot",
    name: "Menacing Shot",
    minLevel: 15,
    actionType: "standard",
    cost: "1",
    summary:
      "Fire into the air to panic every creature in a 30-ft. burst (DC 10 + 1/2 level + Wis mod).",
  },
  {
    id: "slingersLuck",
    name: "Slinger's Luck",
    minLevel: 15,
    actionType: "free (reaction)",
    cost: "2 for a save, 1 for a skill check",
    summary: "Reroll a failed save or skill check, taking the second result even if worse.",
  },
  {
    id: "cheatDeath",
    name: "Cheat Death",
    minLevel: 19,
    actionType: "free (reaction)",
    cost: "all remaining (min 1)",
    summary: "Reduced to 0 hp or below becomes reduced to 1 hp instead.",
  },
  {
    id: "deathsShot",
    name: "Death's Shot",
    minLevel: 19,
    actionType: "free (part of a confirmed crit)",
    cost: "1",
    summary:
      "On a confirmed critical hit, deal normal (non-multiplied) damage and force a Fort save (DC 10 + 1/2 level + Dex mod) or the target dies.",
  },
  {
    id: "stunningShot",
    name: "Stunning Shot",
    minLevel: 19,
    actionType: "free (part of a hit)",
    cost: "2",
    summary:
      "On a hit, force a Fort save (DC 10 + 1/2 level + Wis mod) or stun the target for 1 round.",
  },
  {
    id: "trueGrit",
    name: "True Grit",
    minLevel: 20,
    actionType: "passive",
    cost: "n/a",
    summary:
      "Pick two grit-costing deeds; they cost 1 less grit (minimum 0, still requires 1+ grit to perform).",
  },
]);

/**
 * Pathfinder Unchained swashbuckler deeds. Hand-authored in full — see file
 * doc comment for why (no per-deed vendored data exists; only a generic
 * stub `ClassFeature`). Bleeding Wound, Evasive, and Cheat Death mirror the
 * gunslinger's own deeds nearly verbatim (RAW shares the name and mechanic,
 * substituting panache for grit and "light/one-handed piercing weapon" for
 * "firearm") — confirmed against AoN, not assumed from the gunslinger table.
 */
const SWASHBUCKLER_DEED_LIST: DeedDef[] = forClass("swashbuckler", [
  {
    id: "derringDo",
    name: "Derring-Do",
    minLevel: 1,
    actionType: "free (before the check result is revealed)",
    cost: "1",
    summary:
      "Roll 1d6 and add it to an Acrobatics/Climb/Escape Artist/Fly/Ride/Swim check; a natural 6 lets you roll again, up to your Dex modifier (min 1) times.",
  },
  {
    id: "dodgingPanache",
    name: "Dodging Panache",
    minLevel: 1,
    actionType: "immediate",
    cost: "1",
    summary:
      "Move 5 ft. against a triggering melee attack for a dodge bonus to AC equal to your Charisma modifier (min 0).",
  },
  {
    id: "opportuneParryAndRiposte",
    name: "Opportune Parry and Riposte",
    minLevel: 1,
    actionType: "immediate",
    cost: "1",
    summary:
      "Use your own attack roll to parry a melee attack against you; on a successful parry, make an immediate riposte if you still have panache.",
  },
  {
    id: "kipUp",
    name: "Kip-Up",
    minLevel: 3,
    actionType: "move (or swift for 1 panache)",
    cost: "0 (1 for swift)",
    summary: "Stand from prone without provoking an attack of opportunity.",
  },
  {
    id: "menacingSwordplay",
    name: "Menacing Swordplay",
    minLevel: 3,
    actionType: "swift",
    cost: "0",
    summary:
      "Demoralize (Intimidate) an opponent as a swift action right after hitting it with a piercing melee weapon.",
  },
  {
    id: "preciseStrike",
    name: "Precise Strike",
    minLevel: 3,
    actionType: "passive (swift to double)",
    cost: "0 (1 to double on your next attack)",
    summary:
      "Add your swashbuckler level as precision damage with a light or one-handed piercing melee weapon (or a thrown one within 30 ft.) while you have 1+ panache; spend 1 panache as a swift action to double it on your next attack this turn.",
    contextNotes: [
      note(
        "Numeric bonus is target-scoped (requires a light/one-handed piercing weapon and 1+ panache) — the tracker doesn't verify your weapon choice automatically; the current computed bonus is shown live in the Deeds panel.",
        "wdamage",
      ),
    ],
  },
  {
    id: "swashbucklerInitiative",
    name: "Swashbuckler Initiative",
    minLevel: 3,
    actionType: "passive",
    cost: "0",
    summary:
      "+2 initiative; with Quick Draw, draw a light/one-handed piercing weapon as part of the initiative check.",
  },
  {
    id: "superiorFeint",
    name: "Superior Feint",
    minLevel: 7,
    actionType: "standard",
    cost: "1",
    summary: "Purposely miss to deny the target's Dexterity bonus to AC until your next turn.",
  },
  {
    id: "swashbucklersGrace",
    name: "Swashbuckler's Grace",
    minLevel: 7,
    actionType: "passive",
    cost: "0",
    summary:
      "No penalty for moving at full speed while making Acrobatics checks through threatened squares.",
  },
  {
    id: "targetedStrike",
    name: "Targeted Strike",
    minLevel: 7,
    actionType: "full-round",
    cost: "1",
    summary:
      "Called shot with a piercing weapon (arms/head/legs/torso/wings) for a disarm, confusion, trip, threatened-crit-on-19, or fall effect instead of extra damage.",
  },
  {
    id: "bleedingWound",
    name: "Bleeding Wound",
    minLevel: 11,
    actionType: "part of a hit",
    cost: "1 (or 2 for ability bleed)",
    summary:
      "A light/one-handed piercing weapon hit also deals bleed damage equal to your Dexterity modifier (min 1), or 1 point of Str/Dex/Con bleed for 2 panache.",
  },
  {
    id: "evasive",
    name: "Evasive",
    minLevel: 11,
    actionType: "passive",
    cost: "0 (requires 1+ panache)",
    summary:
      "Gain evasion, uncanny dodge, and improved uncanny dodge (as rogue level = swashbuckler level) while holding panache.",
  },
  {
    id: "subtleBlade",
    name: "Subtle Blade",
    minLevel: 11,
    actionType: "passive",
    cost: "0 (requires 1+ panache)",
    summary:
      "Immune to disarm, steal, and sunder attempts against a wielded piercing weapon while holding panache.",
  },
  {
    id: "dizzyingDefense",
    name: "Dizzying Defense",
    minLevel: 15,
    actionType: "swift",
    cost: "1",
    summary:
      "Fight defensively as a swift action instead of standard (light/one-handed piercing weapon in one hand), for +4 dodge AC at only a -2 attack penalty.",
  },
  {
    id: "perfectThrust",
    name: "Perfect Thrust",
    minLevel: 15,
    actionType: "full-round",
    cost: "0",
    summary: "Single attack against touch AC with a piercing weapon, ignoring damage reduction.",
  },
  {
    id: "swashbucklersEdge",
    name: "Swashbuckler's Edge",
    minLevel: 15,
    actionType: "passive",
    cost: "0",
    summary:
      "Take 10 on Acrobatics/Climb/Escape Artist/Fly/Ride/Swim checks even while distracted or threatened.",
  },
  {
    id: "cheatDeath",
    name: "Cheat Death",
    minLevel: 19,
    actionType: "free (reaction)",
    cost: "all remaining (min 1)",
    summary:
      "Reduced to 0 hp or below becomes reduced to 1 hp instead (doesn't stop instant-death effects).",
  },
  {
    id: "deadlyStab",
    name: "Deadly Stab",
    minLevel: 19,
    actionType: "free (part of a confirmed crit)",
    cost: "1",
    summary:
      "On a confirmed critical hit with a piercing weapon, force a Fort save (DC 10 + 1/2 level + Dex mod) or the target dies.",
  },
  {
    id: "stunningStab",
    name: "Stunning Stab",
    minLevel: 19,
    actionType: "free (part of a hit)",
    cost: "2",
    summary:
      "On a hit with a piercing weapon, force a Fort save (DC 10 + 1/2 level + Dex mod) or stun the target for 1 round.",
  },
]);

export const GUNSLINGER_DEEDS: Record<string, DeedDef> = Object.fromEntries(
  GUNSLINGER_DEED_LIST.map((d) => [d.id, d]),
);
export const SWASHBUCKLER_DEEDS: Record<string, DeedDef> = Object.fromEntries(
  SWASHBUCKLER_DEED_LIST.map((d) => [d.id, d]),
);

const ALL_DEEDS: DeedDef[] = [...GUNSLINGER_DEED_LIST, ...SWASHBUCKLER_DEED_LIST];

/** Every deed a gunslinger/swashbuckler of `level` has access to, in table order (all deeds of her level are automatic — no budget/picking). */
export function deedsForClass(classTag: "gunslinger" | "swashbuckler", level: number): DeedDef[] {
  return ALL_DEEDS.filter((d) => d.classTag === classTag && d.minLevel <= level);
}

/**
 * Precise Strike's precision-damage bonus (swashbuckler 3rd level, APG...
 * Pathfinder Unchained p. 16): flat +swashbuckler level, or double that when
 * the swashbuckler spends the swift-action/1-panache upgrade before the end
 * of her turn. Callers are responsible for checking the "light or one-handed
 * piercing melee weapon (or thrown within 30 ft.), 1+ panache" condition —
 * see `DeedDef`'s `preciseStrike` entry doc comment for why that can't be
 * checked automatically.
 */
export function preciseStrikeBonus(swashbucklerLevel: number, doubled = false): number {
  const base = Math.max(0, Math.trunc(swashbucklerLevel));
  return doubled ? base * 2 : base;
}
