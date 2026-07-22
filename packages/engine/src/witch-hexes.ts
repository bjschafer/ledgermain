/**
 * Clean-room PF1 witch hex table (Advanced Player's Guide, issue #65):
 * hand-authored from the published rules (verified against aonprd.com's
 * book-scoped legacy Witch class page, which lets hexes be split by exact
 * source book), mirroring `magus-arcana.ts`'s/`oracle-revelations.ts`'s
 * posture — hexes are NOT part of the vendored Foundry data pack (the Witch
 * class def only links the generic "Hex"/"Major Hex"/"Grand Hex" stub
 * `ClassFeature`s, no per-hex breakdown — confirmed: `class-features.json`
 * carries no per-hex entries), so there is no upstream JSON to normalize.
 *
 * Scope: the 27 Advanced Player's Guide "core" hexes — 14 regular hexes
 * (available from 1st level), 8 major hexes (10th level), 5 grand hexes
 * (18th level). Ultimate Magic adds another 21 hexes (10 regular/8 major/3
 * grand) that are OUT OF SCOPE here, same posture as `oracle-revelations.ts`
 * scoping down to APG-core-only mysteries and `magus-arcana.ts` scoping down
 * to base Ultimate Magic arcana — add them in a follow-up if the tracker
 * needs to represent a higher-splatbook witch.
 *
 * Save DC (PF1 APG RAW, stated once as a blanket rule on the witch's Hex
 * class feature, not repeated per-hex): "10 + 1/2 the witch's level + the
 * witch's Intelligence modifier" — see `tables.ts` `witchHexDC`.
 *
 * Level gating: `minLevel` is 1 for a regular hex, 10 for a major hex, 18 for
 * a grand hex — these are NOT extra picks on top of the regular hex budget
 * (APG: "in place of one of her regular hex choices"), just additional
 * options unlocked within the same budget once the witch reaches that level
 * (see `model/witchHexes.ts`'s budget math). Soft availability filtering
 * only (see `magus-arcana.ts`'s identical convention) — never blocks
 * selection.
 *
 * Modelling posture (mirrors oracle-revelations.ts/magus-arcana.ts's honesty
 * bar): almost every hex here is a situational, activated, save-triggered,
 * or resource-scaling ability with no flat always-on number the engine
 * tracks. A few come close to a real static effect —
 *   - Cauldron grants a flat +4 insight bonus on Craft (Alchemy) checks, but
 *     Craft is a player-named parameterized skill (`crf.<material>` — see
 *     `tables.ts`'s `PARAMETERIZED_SKILL_PREFIXES` doc comment) with no
 *     guaranteed "Craft (Alchemy)" entry on the sheet to target reliably;
 *   - Flight's 1st-tier benefit (at-will feather fall + a Swim bonus) is
 *     passive, but its actual fly-speed components (levitate, then a true
 *     fly speed) are both limited daily-use activations, not a permanent
 *     fly speed — so "Flight grants passive flight" would overstate it;
 *   - Ward grants a static +2 (scaling) deflection AC / resistance bonus to
 *     an ally once activated, persisting until triggered — the closest thing
 *     here to a genuine toggle, but it targets an ALLY the witch chooses at
 *     activation time, not the witch's own sheet, so there's no reliable
 *     "self" Change target either.
 * None of these clear the bar for an unconditional Change on the WITCH's own
 * sheet, so — same discipline as `oracle-revelations.ts`'s Sidestep
 * Secret/Mental Acuity near-misses — EVERY entry here is `displayOnly: true`
 * with `changes: []`; a `contextNotes` reminder carries the DC/duration/
 * activation shape instead, and flags Cauldron/Flight/Ward specifically as
 * the ones worth a closer look by hand.
 *
 * Issue #75 audit: the buff-gated-changes mechanism (`Change.activeWhenBuff`,
 * built for the rage powers' "while raging" shape — see `rage-powers.ts`)
 * does NOT unlock anything here. None of the three near-misses above is
 * "unconditional while a specific, id-identifiable buff is active": Cauldron
 * is always-on but blocked by the parameterized-skill targeting problem,
 * Flight's fly speed is a limited daily-use activation with no existing
 * buffId/effectTag to gate on, and Ward lands on an ALLY's sheet, not the
 * witch's. All three stay deliberately deferred.
 */

import type { Change, ContextNote, RefData, SourceRef, WitchHex } from "@pf1/schema";

export type WitchHexTier = "hex" | "major" | "grand";

export interface WitchHexDef {
  id: string;
  name: string;
  tier: WitchHexTier;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Earliest witch level this hex can be selected at — 1 (hex), 10 (major), or 18 (grand). Soft-filtered only. */
  minLevel: number;
  /** Typed modifiers granted by the hex (empty for every entry — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (save DC, duration, nested per-use choice, ...). */
  contextNotes?: ContextNote[];
  /** Always true here — no hex has a flat always-on numeric effect. */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

interface RawHex {
  id: string;
  name: string;
  summary: string;
  contextNotes?: ContextNote[];
}

function forTier(tier: WitchHexTier, minLevel: number, entries: RawHex[]): WitchHexDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    tier,
    summary: e.summary,
    minLevel,
    changes: [],
    contextNotes: e.contextNotes,
    displayOnly: true,
  }));
}

const HEX_LIST: WitchHexDef[] = [
  ...forTier("hex", 1, [
    {
      id: "blight",
      name: "Blight",
      summary:
        "Curse an animal, plant, or patch of land: a creature touched takes ongoing Constitution damage each day, or plants in the area wither over a week.",
      contextNotes: [
        note("Fort/Will save applies (creature target); DC = 10 + 1/2 witch level + Int mod."),
      ],
    },
    {
      id: "cackle",
      name: "Cackle",
      summary:
        "Move action: extend the duration of your own active Agony, Charm, Evil Eye, Fortune, or Misfortune hex on a target by 1 round.",
    },
    {
      id: "cauldron",
      name: "Cauldron",
      summary: "Gain Brew Potion as a bonus feat and a +4 insight bonus on Craft (Alchemy) checks.",
      contextNotes: [
        note(
          "+4 insight bonus on Craft (Alchemy) checks — not auto-applied (Craft is a player-named parameterized skill with no guaranteed matching entry); add it by hand to your Craft (Alchemy) skill if you have one.",
          "skill.crf",
        ),
      ],
    },
    {
      id: "charm",
      name: "Charm",
      summary:
        "Shift a creature's attitude one step friendlier (two steps at 8th level) for a number of rounds equal to your Intelligence modifier.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "coven",
      name: "Coven",
      summary:
        "Count as a hag for coven-forming purposes; as an aid-another action, grant +1 caster level to another witch's coven hex within 30 ft.",
    },
    {
      id: "disguise",
      name: "Disguise",
      summary: "Use as disguise self, for a number of hours per day equal to your witch level.",
    },
    {
      id: "evilEye",
      name: "Evil Eye",
      summary:
        "Impose a -2 penalty (-4 at 8th level) to AC, an ability check, an attack roll, a saving throw, or a skill check (your choice each use) for several rounds.",
      contextNotes: [
        note(
          "Will save reduces the duration to 1 round; DC = 10 + 1/2 witch level + Int mod. Which category is penalized is chosen per use.",
        ),
      ],
    },
    {
      id: "flight",
      name: "Flight",
      summary:
        "1st: at-will feather fall plus a swim speed bonus. 3rd: levitate 1/day. 5th: fly for minutes/day equal to witch level.",
      contextNotes: [
        note(
          "Only the feather fall + swim-speed benefit is passive; levitate/fly are limited daily-use activations, not a permanent fly speed — apply manually while active.",
          "speed.fly",
        ),
      ],
    },
    {
      id: "fortune",
      name: "Fortune",
      summary:
        "An ally within 30 ft. rerolls one d20 check and keeps the better result, for 1 round (2 rounds at 8th, 3 at 16th).",
    },
    {
      id: "healing",
      name: "Healing",
      summary:
        "Touch acts as cure light wounds (cure moderate wounds at 5th level), once per day per creature.",
    },
    {
      id: "misfortune",
      name: "Misfortune",
      summary:
        "Force a target to roll a d20 check twice and take the worse result, for 1 round (2 rounds at 8th, 3 at 16th).",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "slumber",
      name: "Slumber",
      summary:
        "Put a creature to sleep as sleep, for a number of rounds equal to your witch level (no HD cap); ends if the sleeper takes damage.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "tongues",
      name: "Tongues",
      summary:
        "Understand any spoken language for minutes/day equal to your witch level; speak any language too, starting at 5th level.",
    },
    {
      id: "ward",
      name: "Ward",
      summary:
        "Grant an ally a +2 deflection bonus to AC and +2 resistance bonus on saves (scaling +1 at 8th/16th), lasting until they're hit or fail a save. Only one Ward active at a time; cannot target yourself.",
      contextNotes: [
        note(
          "Static ally buff once activated (persists until triggered) — targets an ally you choose, not yourself, so there's no reliable self-Change target here; apply manually to the ally's sheet while active.",
          "ac",
        ),
      ],
    },
  ]),
  ...forTier("major", 10, [
    {
      id: "agony",
      name: "Agony",
      summary:
        "Nauseate a target within 60 ft. for a number of rounds equal to your Intelligence modifier.",
      contextNotes: [note("Fort negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "hagsEye",
      name: "Hag's Eye",
      summary:
        "Create an invisible magical sensor (as arcane eye) that other witches in your coven can also see through.",
    },
    {
      id: "majorHealing",
      name: "Major Healing",
      summary:
        "Touch acts as cure serious wounds (cure critical wounds at 15th level), once per day per creature.",
    },
    {
      id: "nightmares",
      name: "Nightmares",
      summary:
        "Once per night, inflict a nightmare (as the spell) on a creature you can name or have seen.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "retribution",
      name: "Retribution",
      summary:
        "A cursed target takes half the melee damage it deals to others as damage to itself, for 1 round.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "vision",
      name: "Vision",
      summary:
        "Touch grants a 1-minute glimpse of a possible future; unwilling targets resist with a save.",
      contextNotes: [
        note("Will negates on an unwilling target; DC = 10 + 1/2 witch level + Int mod."),
      ],
    },
    {
      id: "waxenImage",
      name: "Waxen Image",
      summary:
        "Craft a wax duplicate of a target; on a failed save, you can puppet the target's actions through it.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "weatherControl",
      name: "Weather Control",
      summary: "Use as control weather, once per day, requiring a 1-hour casting time.",
    },
  ]),
  ...forTier("grand", 18, [
    {
      id: "deathCurse",
      name: "Death Curse",
      summary:
        "Curse a target with escalating fatigue, then exhaustion, then death over 3 rounds unless it saves.",
      contextNotes: [note("Fort negates each stage; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "eternalSlumber",
      name: "Eternal Slumber",
      summary:
        "Put a target into a permanent magical sleep, removable only by wish, miracle, or the witch's death.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "forcedReincarnation",
      name: "Forced Reincarnation",
      summary: "Kill a target and force it to reincarnate as a new creature, as the spell.",
      contextNotes: [note("Will negates; DC = 10 + 1/2 witch level + Int mod.")],
    },
    {
      id: "lifeGiver",
      name: "Life Giver",
      summary:
        "Once per day, a full-round touch resurrects a dead creature as resurrection, with no material cost.",
    },
    {
      id: "naturalDisaster",
      name: "Natural Disaster",
      summary:
        "Once per day, unleash a combined storm of vengeance and earthquake effect, requiring concentration to maintain.",
    },
  ]),
];

export const WITCH_HEXES: Record<string, WitchHexDef> = Object.fromEntries(
  HEX_LIST.map((h) => [h.id, h]),
);

export const WITCH_HEX_IDS: readonly string[] = HEX_LIST.map((h) => h.id);

/** All hex defs of a given tier, in table order. */
export function hexesForTier(tier: WitchHexTier): WitchHexDef[] {
  return HEX_LIST.filter((h) => h.tier === tier);
}

/**
 * Witch hex save DC, clean-room from the published PF1 APG SRD: "the DC of a
 * hex is equal to 10 + 1/2 the witch's level + the witch's Intelligence
 * modifier". Re-exported here (delegating to `tables.ts`) so callers that
 * already import from `witch-hexes.ts` don't need a second import.
 */
export { witchHexDC } from "./tables.js";

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74 Phase 3b: `RefData.hexes` (see that type's doc comment) is the
 * FULL published witch-hex catalog (~104 entries after junk filtering),
 * prose only. The hand-verified table above stays authoritative for
 * MECHANICS — this section only merges the two for BROWSING (the picker) and
 * for resolving a picked id back to a definition (`collect.ts`/
 * `archetypes.ts`), mirroring `rage-powers.ts`'s `mergedRagePowerCatalog`
 * exactly.
 *
 * Matching is by NORMALIZED NAME, never id — same rationale as rage powers:
 * this file's camelCase ids vs. the vendored dataset's snake_case slugs are
 * disjoint by construction.
 *
 * Collision audit (all 27 hand-authored entries, run against the pinned Pf
 * Data 1e slice): all 27 matched a vendored entry by normalized name, with NO
 * naming drift — the source's own spelling matched ours exactly
 * (case-insensitively) for every entry, so `HEX_NAME_ALIASES` is empty (kept
 * for the same reason `rage-powers.ts`'s alias map is: a FUTURE
 * hand-authored addition that drifts from the vendored spelling has
 * somewhere to record it). No vendored-catalog-internal name collisions
 * either (unlike rage powers' Guarded Stance/Stance-variant case) — every one
 * of the 104 vendored hexes has a unique normalized name.
 *
 * Tier: every matched hex's vendored `tier` field agrees with this table's
 * own `tier` for that entry (8 of the 27 are `major`, 5 are `grand`, the rest
 * `hex`) — verified during the audit, not merely assumed.
 */

/** Alias map for a hand-authored id whose vendored-catalog counterpart uses a different name — see the collision-audit comment above. Empty today (no drift found); kept for a future addition. */
const HEX_NAME_ALIASES: Record<string, string> = {};

function normalizeHexName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cheap HTML->text preview for a vendored-only entry's picker row (the hand-authored table's `summary` field is a curated paraphrase this app doesn't have for vendored-only prose). */
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

/** A catalog entry the picker can browse — either the hand-authored def (matched) with the vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedWitchHexEntry extends WitchHexDef {
  /** Ability-type suffix as published, e.g. "(Su)" — undefined when no vendored counterpart backs this id. */
  nameSuffix?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredHexToDef(entry: WitchHex): MergedWitchHexEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    tier: entry.tier,
    // A regular hex is available from 1st level; major/grand hexes are
    // available once a witch reaches the level that tier unlocks — same
    // 1/10/18 mapping the hand-authored table uses (APG RAW, not a fabricated
    // gate — this source carries no per-entry level field at all).
    minLevel: entry.tier === "major" ? 10 : entry.tier === "grand" ? 18 : 1,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked witch-hex id (`doc.build.witchHexes` entries) to its
 * definition — hand-authored table first (mechanics-authoritative), falling
 * back to the vendored catalog for an id that only exists there. Used by
 * `collect.ts` (modifier collection) and `archetypes.ts` (the Class Features
 * list) instead of indexing `WITCH_HEXES` directly, so a vendored-only pick
 * resolves to a real (display-only) definition rather than being silently
 * dropped.
 */
export function resolveWitchHex(id: string, refData: RefData): WitchHexDef | undefined {
  const hand = WITCH_HEXES[id];
  if (hand) return hand;
  const vendored = refData.hexes?.[id];
  return vendored ? vendoredHexToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id and tier, but carrying
 * the vendored entry's prose/sources along for display), plus any
 * hand-authored entry with no vendored counterpart appended (none today —
 * see the collision-audit comment above; the fallback exists for a future
 * addition). `!entry.displayOnly` would mark a live-mechanics row for the
 * picker's "M" badge, same convention as `mergedRagePowerCatalog` — every hex
 * here is `displayOnly` today (see the file's top doc comment), so the badge
 * never actually appears yet.
 */
export function mergedWitchHexCatalog(refData: RefData): MergedWitchHexEntry[] {
  const handByNormName = new Map<string, WitchHexDef>();
  for (const h of HEX_LIST) {
    handByNormName.set(normalizeHexName(HEX_NAME_ALIASES[h.id] ?? h.name), h);
  }

  const usedHandIds = new Set<string>();
  const merged: MergedWitchHexEntry[] = [];
  for (const v of Object.values(refData.hexes ?? {})) {
    const handMatch = handByNormName.get(normalizeHexName(v.name));
    if (handMatch) {
      usedHandIds.add(handMatch.id);
      merged.push({
        ...handMatch,
        nameSuffix: v.nameSuffix,
        description: v.description,
        sources: v.sources,
      });
    } else {
      merged.push(vendoredHexToDef(v));
    }
  }
  for (const h of HEX_LIST) {
    if (!usedHandIds.has(h.id)) merged.push(h);
  }
  return merged;
}
