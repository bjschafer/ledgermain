/**
 * Clean-room PF1 Rogue Talents table (issue #65): hand-authored from the
 * published rules (verified against aonprd.com's "Talents - Rogue" and
 * "Talents - Rogue (Unchained)" listings), mirroring `witch-hexes.ts`'s
 * posture — rogue talents are NOT part of the vendored Foundry data pack
 * (both the base Rogue and Rogue (Unchained) class defs only link a single
 * generic "Rogue Talents" stub `ClassFeature`, no per-talent breakdown), so
 * there is no upstream JSON to normalize.
 *
 * Scope: the base rogue talent list runs past 160 entries once advanced
 * talents, catfolk-only talents, and 3rd-party-book talents are counted —
 * far beyond what a hand-curated clean-room menu can responsibly cover in
 * one pass (same "core-only" scoping call as `witch-hexes.ts` limiting to
 * APG-core hexes). This file curates the ~28 most commonly-taken/foundational
 * talents from the CORE list (Advanced Player's Guide + Pathfinder Unchained)
 * — a follow-up issue can extend it. SHARED between the chained rogue and
 * Rogue (Unchained) (`build.rogueTalents` — both classes draw talents from
 * the same list); entries flagged `unchainedOnly` reference an
 * Unchained-only mechanic (Debilitating Injury) and are soft-noted (never
 * hidden) for a chained-rogue picker, same soft-filtering posture as
 * `WitchHexDef.minLevel`.
 *
 * Modelling posture (mirrors `witch-hexes.ts`'s honesty bar): almost every
 * talent here is a situational/activated/forgo-sneak-damage/prose-tier
 * ability with no flat always-on number the engine tracks. Two talents DO
 * carry a genuine, unconditional mechanical grant recognized elsewhere in
 * this codebase's "class feature grants a specific feat/slot" pattern (see
 * `apps/web/src/model/feats.ts`'s `FEATURE_NAME_OVERRIDES` for the
 * precedent):
 *   - Combat Trick grants one generic bonus combat feat SLOT — `bonusFeatSlot: true`,
 *     bridged into `classBonusFeatSlots` in `feats.ts`.
 *   - Finesse Rogue grants Weapon Finesse outright, no player choice needed —
 *     `grantsFeat: "weapon finesse"`, bridged into `grantedFeats` in `feats.ts`.
 * Weapon Training (the rogue-talent version, granting Weapon Focus) is
 * DELIBERATELY left note-tier rather than also wired as a `grantsFeat`: unlike
 * Weapon Finesse, Weapon Focus needs a per-instance weapon CHOICE, and
 * `GrantedFeat` (the fixed-grant shape `feats.ts` already has) has no slot for
 * one — auto-applying it would either guess the weapon or silently omit the
 * choice, neither of which is honest. Firearm Training (grants Exotic Weapon
 * Proficiency (Firearms)) is similarly left note-tier: the exact vendored feat
 * name isn't confirmed against `RefData.feats` here, and an unverified
 * `grantsFeat` string would silently no-op if it doesn't match — safer to
 * surface as a reminder than to guess.
 */

import type { Change, ContextNote, RefData, RogueTalent, SourceRef } from "@pf1/schema";

export interface RogueTalentDef {
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** True if this talent references an Unchained-only mechanic (Debilitating Injury). Soft-noted, never hidden. */
  unchainedOnly?: boolean;
  /**
   * Feat name (lowercase, matched against `RefData.feats` by name) this
   * talent grants outright, no player-chosen target needed. See
   * `apps/web/src/model/feats.ts`'s `grantedFeats` bridge.
   */
  grantsFeat?: string;
  /** True if this talent grants one generic bonus combat-feat SLOT (Combat Trick). See `feats.ts`'s `classBonusFeatSlots` bridge. */
  bonusFeatSlot?: boolean;
  /** Typed modifiers granted by the talent (empty for every entry — see file doc comment). */
  changes: Change[];
  contextNotes?: ContextNote[];
  /** Always true here — no talent has a flat always-on numeric effect on the sheet. */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawTalent {
  id: string;
  name: string;
  summary: string;
  unchainedOnly?: boolean;
  grantsFeat?: string;
  bonusFeatSlot?: boolean;
  contextNotes?: ContextNote[];
}

function toDef(e: RawTalent): RogueTalentDef {
  return {
    id: e.id,
    name: e.name,
    summary: e.summary,
    unchainedOnly: e.unchainedOnly,
    grantsFeat: e.grantsFeat,
    bonusFeatSlot: e.bonusFeatSlot,
    changes: [],
    contextNotes: e.contextNotes,
    displayOnly: true,
  };
}

const TALENT_LIST: RogueTalentDef[] = [
  toDef({
    id: "bleedingAttack",
    name: "Bleeding Attack",
    summary:
      "A sneak attack causes 1 additional point of bleed damage per die of sneak attack damage, each round until healed.",
    contextNotes: [
      note("Per-sneak-attack-die rider — no persistent 'currently bleeding' state tracked here."),
    ],
  }),
  toDef({
    id: "camouflage",
    name: "Camouflage",
    summary:
      "Once per day, craft camouflage granting a +4 bonus on Stealth checks in matching terrain.",
  }),
  toDef({
    id: "cannyObserver",
    name: "Canny Observer",
    summary:
      "Gain a +4 bonus on Perception checks made to overhear conversations or spot concealed objects/traps.",
    contextNotes: [
      note(
        "Scoped to specific check types, not all Perception checks — apply by hand.",
        "skill.per",
      ),
    ],
  }),
  toDef({
    id: "combatTrick",
    name: "Combat Trick",
    summary: "Gain a bonus combat feat.",
    bonusFeatSlot: true,
  }),
  toDef({
    id: "doubleDebilitation",
    name: "Double Debilitation",
    unchainedOnly: true,
    summary:
      "Whenever you inflict a penalty against a target using Debilitating Injury, select two penalties to inflict instead of one.",
    contextNotes: [
      note("Modifies Debilitating Injury (target-scoped, note-tier — see the class feature row)."),
    ],
  }),
  toDef({
    id: "fastGetaway",
    name: "Fast Getaway",
    summary:
      "After a successful sneak attack or Sleight of Hand check, spend a move action to withdraw.",
  }),
  toDef({
    id: "fastPicks",
    name: "Fast Picks",
    summary: "Open locks with Disable Device as a standard action instead of a full-round action.",
  }),
  toDef({
    id: "fastStealth",
    name: "Fast Stealth",
    summary: "Move at full speed while using Stealth with no penalty.",
  }),
  toDef({
    id: "finesseRogue",
    name: "Finesse Rogue",
    summary: "Gain Weapon Finesse as a bonus feat.",
    grantsFeat: "weapon finesse",
  }),
  toDef({
    id: "kiPool",
    name: "Ki Pool",
    summary:
      "Gain a ki pool of points equal to your Wisdom modifier (minimum 1/day); spend 1 point for a +10-foot bonus to speed until the end of your turn.",
    contextNotes: [
      note(
        "A real per-day resource, but talent-driven — not wired as a live pool here; track by hand.",
      ),
    ],
  }),
  toDef({
    id: "ledgeWalker",
    name: "Ledge Walker",
    summary:
      "Move at full speed along narrow surfaces or uneven ground using Acrobatics without penalty, and are not flat-footed while doing so.",
  }),
  toDef({
    id: "majorMagic",
    name: "Major Magic",
    summary: "Cast a chosen 1st-level sorcerer/wizard spell twice per day as a spell-like ability.",
    contextNotes: [note("Requires Minor Magic and Intelligence 11+.")],
  }),
  toDef({
    id: "minorMagic",
    name: "Minor Magic",
    summary:
      "Cast a chosen 0-level sorcerer/wizard spell three times per day as a spell-like ability.",
    contextNotes: [note("Requires Intelligence 10+.")],
  }),
  toDef({
    id: "offensiveDefense",
    name: "Offensive Defense",
    summary: "Gain a +1 dodge bonus to AC per die of sneak attack damage rolled, for 1 round.",
    contextNotes: [note("Conditional, 1-round window after a sneak attack — apply by hand.", "ac")],
  }),
  toDef({
    id: "powerfulSneak",
    name: "Powerful Sneak",
    summary:
      "Take a -2 penalty on a full attack to treat all 1s rolled on sneak attack dice as 2s.",
  }),
  toDef({
    id: "quickDisable",
    name: "Quick Disable",
    summary: "Halve the normal time needed to disable a trap (minimum 1 round).",
  }),
  toDef({
    id: "resiliency",
    name: "Resiliency",
    summary:
      "Once per day, as an immediate action when reduced below 0 hit points, gain temporary hit points equal to your rogue level for 1 minute.",
    contextNotes: [
      note(
        "No temporary-hit-points tracking in this engine (same gap as Rage's temp HP) — apply by hand.",
      ),
    ],
  }),
  toDef({
    id: "rogueCrawl",
    name: "Rogue Crawl",
    summary: "Move at half speed while prone, and may take a 5-foot step while crawling.",
  }),
  toDef({
    id: "ropeMaster",
    name: "Rope Master",
    summary:
      "Climb a rope at normal speed, take 10 on Acrobatics along narrow surfaces even when threatened, and gain a +4 bonus to escape a rope/net.",
  }),
  toDef({
    id: "snipersEye",
    name: "Sniper's Eye",
    summary:
      "Apply sneak attack damage on ranged attacks against targets with concealment (not total concealment) within 30 feet.",
  }),
  toDef({
    id: "standUp",
    name: "Stand Up",
    summary:
      "Stand up from prone as a free action (still provokes an attack of opportunity if threatened).",
  }),
  toDef({
    id: "surpriseAttack",
    name: "Surprise Attack",
    summary:
      "During the surprise round, all creatures you attack are treated as flat-footed, even if they've already acted.",
  }),
  toDef({
    id: "survivalist",
    name: "Survivalist",
    summary: "Add Heal and Survival to your list of class skills.",
    contextNotes: [
      note(
        "Class-skill flags aren't tracked separately from the base class list — record for reference.",
      ),
    ],
  }),
  toDef({
    id: "trapSpotter",
    name: "Trap Spotter",
    summary:
      "Whenever you come within 10 feet of a trap, receive an automatic Perception check to notice it.",
  }),
  toDef({
    id: "underhanded",
    name: "Underhanded",
    summary:
      "Gain a +4 circumstance bonus on Sleight of Hand checks made to conceal a weapon on your body.",
    contextNotes: [
      note("Scoped to concealing a weapon, not all Sleight of Hand checks.", "skill.slt"),
    ],
  }),
  toDef({
    id: "weaponTraining",
    name: "Weapon Training",
    summary: "Gain Weapon Focus as a bonus feat.",
    contextNotes: [
      note(
        "Grants Weapon Focus for a weapon you choose — not auto-applied (no weapon-choice slot on a talent grant); add Weapon Focus by hand and pick a weapon.",
      ),
    ],
  }),
  toDef({
    id: "firearmTraining",
    name: "Firearm Training",
    summary: "Gain Exotic Weapon Proficiency (Firearms) as a bonus feat.",
    contextNotes: [note("Not auto-applied — add Exotic Weapon Proficiency (Firearms) by hand.")],
  }),
];

export const ROGUE_TALENTS: Record<string, RogueTalentDef> = Object.fromEntries(
  TALENT_LIST.map((t) => [t.id, t]),
);

export const ROGUE_TALENT_IDS: readonly string[] = TALENT_LIST.map((t) => t.id);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74 Phase 3b: `RefData.rogueTalents` (see that type's doc comment) is
 * the FULL published catalog (234 entries after junk filtering), prose only.
 * The hand-authored table above stays authoritative for MECHANICS — this
 * section only merges the two for BROWSING (the picker) and for resolving a
 * picked id back to a definition, mirroring `rage-powers.ts`'s identical
 * "vendored catalog overlay" section exactly (matching by NORMALIZED NAME,
 * hand-authored wins the collision, vendored-only entries are display-only).
 *
 * Collision audit (all 27 hand-authored entries, run against the pinned Pf
 * Data 1e slice): all 27 matched a vendored entry by normalized name — no
 * `NAME_ALIASES` entries needed, unlike rage powers' Sixth Sense gap. The
 * source tags some entries' `category` with an `R_`/`UR_` prefix
 * (chained-Rogue-specific vs. Rogue (Unchained)-specific wording — see
 * `RogueTalent`'s doc comment) for a handful of talents that also have a
 * SEPARATELY-KEYED, differently-named "(Unchained Rogue)" variant (e.g.
 * `powerful_sneak` vs. `powerful_sneak_unchained_rogue`) — since the base
 * entry's `name` has no such suffix, it matches the hand-authored entry by
 * normalized name exactly as any other entry would, while the suffixed
 * variant remains its own vendored-only row (same shape as rage powers'
 * Guarded Stance CRB/Unchained-variant collision).
 */

/** Alias map for a hand-authored id whose vendored-catalog counterpart uses a different name — see `rage-powers.ts`'s identical map. Empty: the full 27-entry audit found no drift. */
const ROGUE_TALENT_NAME_ALIASES: Record<string, string> = {};

function normalizeTalentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cheap HTML->text preview for a vendored-only entry's picker row — see `rage-powers.ts`'s identical helper. */
function plainTextPreview(html: string, max = 200): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** A catalog entry the picker can browse — either the hand-authored def with the vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedRogueTalentEntry extends RogueTalentDef {
  nameSuffix?: string;
  /** Vendored grouping tag (see `RogueTalent`'s doc comment for the `R_`/`UR_`/`Advanced ` prefix conventions), when present. */
  category?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  sources?: SourceRef[];
}

function vendoredToDef(entry: RogueTalent): MergedRogueTalentEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked rogue-talent id (`doc.build.rogueTalents` entries) to its
 * definition — hand-authored table first, falling back to the vendored
 * catalog for an id that only exists there. Used by `archetypes.ts` (the
 * Class Features list) instead of indexing `ROGUE_TALENTS` directly, so a
 * vendored-only pick resolves to a real (display-only) definition rather than
 * being silently dropped — mirrors `resolveRagePower`.
 */
export function resolveRogueTalent(id: string, refData: RefData): RogueTalentDef | undefined {
  const hand = ROGUE_TALENTS[id];
  if (hand) return hand;
  const vendored = refData.rogueTalents?.[id];
  return vendored ? vendoredToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id, but carrying the
 * vendored entry's prose/sources along for display) — mirrors
 * `mergedRagePowerCatalog` exactly. `!entry.displayOnly` marks which rows
 * have live mechanics for the picker's "M" badge (only "Combat Trick" and
 * "Finesse Rogue" ever set it — see file doc comment).
 */
export function mergedRogueTalentCatalog(refData: RefData): MergedRogueTalentEntry[] {
  const handByNormName = new Map<string, RogueTalentDef>();
  for (const t of TALENT_LIST) {
    handByNormName.set(normalizeTalentName(ROGUE_TALENT_NAME_ALIASES[t.id] ?? t.name), t);
  }

  const vendored = Object.values(refData.rogueTalents ?? {});
  const usedHandIds = new Set<string>();
  const seenNormNames = new Set<string>();
  const merged: MergedRogueTalentEntry[] = [];
  for (const v of vendored) {
    const norm = normalizeTalentName(v.name);
    const handMatch = seenNormNames.has(norm) ? undefined : handByNormName.get(norm);
    if (handMatch) {
      seenNormNames.add(norm);
      usedHandIds.add(handMatch.id);
      merged.push({ ...handMatch, description: v.description, sources: v.sources });
    } else {
      merged.push(vendoredToDef(v));
    }
  }
  for (const t of TALENT_LIST) {
    if (!usedHandIds.has(t.id)) merged.push(t);
  }
  return merged;
}
