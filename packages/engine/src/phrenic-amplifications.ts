/**
 * Clean-room PF1 psychic Phrenic Amplification table (Occult Adventures,
 * issue #65 follow-through — `psychic-disciplines.ts` shipped bonus
 * spells/phrenic pool ability and explicitly deferred amplifications as
 * "prose-heavy, genuinely choice-bearing content"), hand-authored from the
 * published rules (verified against aonprd.com's Phrenic Amplifications
 * index and each entry's own page, 2026-07-08).
 *
 * Cadence (PF1 OA RAW, "Phrenic Amplification": gained at 1st level, then
 * "at 3rd level, and every 4 levels thereafter" — verified against
 * aonprd.com's live Psychic class page): 1st, 3rd, 7th, 11th, 15th, 19th —
 * six total by 19th, the SAME six-threshold cadence
 * `ORACLE_REVELATIONS`/`model/oracleRevelations.ts`'s `REVELATION_LEVELS`
 * uses (see `model/psychicAmplifications.ts`, which reuses that shape rather
 * than re-deriving it).
 *
 * Major amplifications unlock starting at 11th level ("at 11th level, and
 * every 4 levels thereafter, a psychic can choose one of the following major
 * amplifications IN PLACE OF a phrenic amplification" — verified) — NOT an
 * extra budget slot, the same soft-gated-within-the-same-budget shape
 * `WITCH_HEXES`' major/grand tiers use (`WitchHexDef.tier`/`minLevel`).
 *
 * Scope: every amplification on aonprd.com's Phrenic Amplifications index —
 * 22 basic + 9 major, 31 total. Unlike `WITCH_HEXES`/`ORACLE_REVELATIONS`
 * (which scope tightly to a single core rulebook and explicitly exclude
 * later splatbooks), this list mixes Occult Adventures core (pg. 60-64) with
 * a handful of Pathfinder Player Companion entries (Heroes of Golarion,
 * Occult Origins) — there is no OA-core-only subset large enough to usefully
 * separate (only 12 of the 22 basic amplifications are OA-core proper), and
 * the issue #65 task brief's own worked example explicitly names a
 * Player-Companion-sourced entry (Biokinetic Healing, Occult Origins pg. 16)
 * alongside OA-core ones — so this table takes the full union rather than
 * fragmenting by source book.
 *
 * Modelling posture (mirrors witch-hexes.ts/oracle-revelations.ts's honesty
 * bar): every amplification is a spend-points, CAST-TIME RIDER applied to a
 * spell being cast that same action ("linked spell") — not a standing buff
 * on the psychic's own sheet, and several don't even affect the psychic
 * (they modify the linked spell's targets or the spell itself). There is no
 * persistent Change the stacking engine could safely apply. So EVERY entry
 * here is `displayOnly: true` with `changes: []`; the pool-point cost is
 * carried inline in `costLabel` and repeated in the summary, same "pool-cost
 * honesty line" posture the issue #65 task brief calls for.
 */

import type { Change, PhrenicAmplification, RefData, SourceRef } from "@pf1/schema";

export type PhrenicAmplificationTier = "basic" | "major";

export interface PhrenicAmplificationDef {
  id: string;
  name: string;
  tier: PhrenicAmplificationTier;
  /** Earliest psychic level this amplification can be selected at — 1 (basic) or 11 (major). Soft-filtered only, never blocks. */
  minLevel: number;
  /** Phrenic pool point cost, e.g. "1 point", "1 or 2 points", "points = spell level". */
  costLabel: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Always empty — see file doc comment (cast-time rider, no standing Change). */
  changes: Change[];
  /** Always true here. */
  displayOnly: true;
}

interface RawAmp {
  id: string;
  name: string;
  costLabel: string;
  summary: string;
}

function forTier(
  tier: PhrenicAmplificationTier,
  minLevel: number,
  entries: RawAmp[],
): PhrenicAmplificationDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    tier,
    minLevel,
    costLabel: e.costLabel,
    summary: e.summary,
    changes: [],
    displayOnly: true,
  }));
}

const AMPLIFICATION_LIST: PhrenicAmplificationDef[] = [
  ...forTier("basic", 1, [
    {
      id: "biokineticHealing",
      name: "Biokinetic Healing",
      costLabel: "1 point",
      summary: "A linked transmutation spell also heals its target 2 hp per spell level.",
    },
    {
      id: "complexCountermeasures",
      name: "Complex Countermeasures",
      costLabel: "1 or 2 points",
      summary:
        "Increase the DC to identify, dispel, counterspell, or beat your caster level check against the linked spell by 2 (4 at 2 points).",
    },
    {
      id: "conjuredArmor",
      name: "Conjured Armor",
      costLabel: "1 point",
      summary:
        "A linked conjuration (summoning) spell's creatures gain a +2 deflection bonus to AC (+3 at 8th level, +4 at 15th).",
    },
    {
      id: "defensivePrognostication",
      name: "Defensive Prognostication",
      costLabel: "1 or 2 points",
      summary:
        "Gain a +2 (or +4) insight bonus to your own AC for a number of rounds equal to the linked divination spell's level.",
    },
    {
      id: "dragonsBreath",
      name: "Dragon's Breath",
      costLabel: "2 points",
      summary: "Reshape a linked line- or burst-area spell into a 30-ft. cone breath weapon.",
    },
    {
      id: "focusedForce",
      name: "Focused Force",
      costLabel: "1 point",
      summary: "Increase a linked force-descriptor spell's damage die by one step (1d4→1d6, etc.).",
    },
    {
      id: "intenseFocus",
      name: "Intense Focus",
      costLabel: "1 or 2 points",
      summary: "+2 (or +4) bonus on the concentration check made to cast the linked spell.",
    },
    {
      id: "mindsEye",
      name: "Mind's Eye",
      costLabel: "2 or 3 points",
      summary:
        "+4 insight bonus on the linked spell's ranged touch/spell attack roll; the 3rd point also ignores cover.",
    },
    {
      id: "mindshield",
      name: "Mindshield",
      costLabel: "1 or 2 points per target",
      summary:
        "The linked spell's targets gain a +2 (or +4) morale bonus on Will saves for 1 round per psychic level.",
    },
    {
      id: "mindtouch",
      name: "Mindtouch",
      costLabel: "1 point per target",
      summary:
        "If the linked spell hits or the target fails its save, detect the target's surface thoughts as detect thoughts.",
    },
    {
      id: "ongoingDefense",
      name: "Ongoing Defense",
      costLabel: "1 point",
      summary:
        "Extend the duration of a linked intellect fortress/mental barrier/thought shield/tower of iron will spell by 1 round.",
    },
    {
      id: "overpoweringMind",
      name: "Overpowering Mind",
      costLabel: "2, 4, or 6 points",
      summary:
        "Increase the Will save DC of a linked mind-affecting spell by 1 (2 at 4 points, 3 at 6 points).",
    },
    {
      id: "perfectBody",
      name: "Perfect Body",
      costLabel: "1 point",
      summary:
        "After casting a linked transmutation spell, gain a +2 bonus on your next Reflex or Fortitude save.",
    },
    {
      id: "phrenicStrike",
      name: "Phrenic Strike",
      costLabel: "no cost (requires ≥1 pool point)",
      summary:
        "Deliver a linked touch-range spell through an unarmed strike instead of a touch attack.",
    },
    {
      id: "psychicDefense",
      name: "Psychic Defense",
      costLabel: "1 point",
      summary:
        "+4 bonus on your next Bluff, Diplomacy, Intimidate, or Sense Motive check made during the same social encounter.",
    },
    {
      id: "psychofeedback",
      name: "Psychofeedback",
      costLabel: "2 points",
      summary:
        "Sacrifice a spell of 2nd level or higher to gain a +1 enhancement bonus per spell level to Str, Dex, or Con for 1 minute per psychic level.",
    },
    {
      id: "relentlessCasting",
      name: "Relentless Casting",
      costLabel: "1 point",
      summary:
        "Roll twice (take the better) on the caster level check to overcome the linked spell's target's spell resistance.",
    },
    {
      id: "telempathicRestoration",
      name: "Telempathic Restoration",
      costLabel: "1 point",
      summary:
        "Remove dazed, frightened, panicked, shaken, or stunned from a telepathic bond target (or yourself).",
    },
    {
      id: "transferFear",
      name: "Transfer Fear",
      costLabel: "1 point",
      summary:
        "When a linked fear effect succeeds against its target, remove an existing fear effect from yourself or a telepathic ally instead.",
    },
    {
      id: "undercastSurge",
      name: "Undercast Surge",
      costLabel: "2 points per level",
      summary:
        "Raise the effective level of an undercast linked spell without spending a higher-level slot.",
    },
    {
      id: "whisperOfAncients",
      name: "Whisper of Ancients",
      costLabel: "1 or 2 points",
      summary:
        "While casting a linked divination spell, gain a +2 (or +4) bonus on an associated skill check.",
    },
    {
      id: "willOfTheDead",
      name: "Will of the Dead",
      costLabel: "2 points",
      summary: "The linked mind-affecting spell can affect undead despite their normal immunity.",
    },
  ]),
  ...forTier("major", 11, [
    {
      id: "deflectionField",
      name: "Deflection Field",
      costLabel: "2 points",
      summary:
        "While a linked spell's deflection bonus to AC is active, the first ranged attack that misses you is reflected back at its attacker.",
    },
    {
      id: "dispellingPulse",
      name: "Dispelling Pulse",
      costLabel: "3 points",
      summary:
        "A creature hit by (or that fails its save against) the linked spell is also affected as though targeted by dispel magic.",
    },
    {
      id: "dualAmplification",
      name: "Dual Amplification",
      costLabel: "1 point + both amplifications' costs",
      summary: "Apply two other amplifications to the same linked spell.",
    },
    {
      id: "mimicMetamagic",
      name: "Mimic Metamagic",
      costLabel: "2+ points",
      summary:
        "Apply a metamagic feat you know to the linked spell without increasing its level or casting time.",
    },
    {
      id: "spaceRendingSpell",
      name: "Space-Rending Spell",
      costLabel: "1 point per 10 ft. (max = linked spell level)",
      summary: "Teleport up to 10 ft. per point spent as part of casting the linked spell.",
    },
    {
      id: "subordinateSpell",
      name: "Subordinate Spell",
      costLabel: "3 + 2× subordinate spell's level",
      summary:
        "Simultaneously cast a second prepared spell (level ≤ linked spell's level − 5) on yourself.",
    },
    {
      id: "synapticShock",
      name: "Synaptic Shock",
      costLabel: "1 point per target",
      summary:
        "A creature affected by the linked spell becomes confused for 1 round when the effect ends (or immediately on a failed save).",
    },
    {
      id: "telepathicTargeting",
      name: "Telepathic Targeting",
      costLabel: "2 points",
      summary:
        "Target a linked mind-affecting spell at a telepathic bond contact beyond the spell's normal range.",
    },
    {
      id: "turningShield",
      name: "Turning Shield",
      costLabel: "points = linked spell's level",
      summary: "Gain the benefit of spell turning for 1 round per psychic level.",
    },
  ]),
];

export const PHRENIC_AMPLIFICATIONS: Record<string, PhrenicAmplificationDef> = Object.fromEntries(
  AMPLIFICATION_LIST.map((a) => [a.id, a]),
);

export const PHRENIC_AMPLIFICATION_IDS: readonly string[] = AMPLIFICATION_LIST.map((a) => a.id);

/** All amplification defs of a given tier, in table order. */
export function amplificationsForTier(tier: PhrenicAmplificationTier): PhrenicAmplificationDef[] {
  return AMPLIFICATION_LIST.filter((a) => a.tier === tier);
}

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * Issue #74 Phase 3c: `RefData.phrenicAmplifications` (see that type's doc
 * comment) is the FULL published catalog (31 entries after junk filtering),
 * prose only. The hand-verified table above stays authoritative for
 * MECHANICS — this section only merges the two for BROWSING (the picker)
 * and for resolving a picked id, mirroring `rage-powers.ts`'s
 * `mergedRagePowerCatalog`/`resolveRagePower` exactly.
 *
 * Collision audit: ALL 31 hand-authored entries matched a vendored entry by
 * normalized name — a clean 1:1 match (including "Space-Rending Spell" vs.
 * the source's "Space-rending Spell", a case-only difference the normalizer
 * already ignores) — zero orphans, zero vendored-only entries, zero aliases
 * needed. The only subsystem in this wave where that's true.
 */

const PHRENIC_AMPLIFICATION_NAME_ALIASES: Record<string, string> = {};

function normalizeAmplificationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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
export interface MergedPhrenicAmplificationEntry extends PhrenicAmplificationDef {
  nameSuffix?: string;
  description?: string;
  sources?: SourceRef[];
}

function vendoredToDef(entry: PhrenicAmplification): MergedPhrenicAmplificationEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    tier: entry.tier,
    minLevel: entry.tier === "major" ? 11 : 1,
    costLabel: "see description",
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/** Resolve a picked amplification id to its definition — hand-authored table first, falling back to the vendored catalog. Mirrors `resolveRagePower`. */
export function resolvePhrenicAmplification(
  id: string,
  refData: RefData,
): PhrenicAmplificationDef | undefined {
  const hand = PHRENIC_AMPLIFICATIONS[id];
  if (hand) return hand;
  const vendored = refData.phrenicAmplifications?.[id];
  return vendored ? vendoredToDef(vendored) : undefined;
}

/** The full picker-browsable catalog — mirrors `mergedRagePowerCatalog`. Never actually produces a vendored-only row today (see file doc comment's collision audit) — kept for the shared picker convention and future-proofing against a later vendored-source update. */
export function mergedPhrenicAmplificationCatalog(
  refData: RefData,
): MergedPhrenicAmplificationEntry[] {
  const handByNormName = new Map<string, PhrenicAmplificationDef>();
  for (const a of AMPLIFICATION_LIST) {
    handByNormName.set(
      normalizeAmplificationName(PHRENIC_AMPLIFICATION_NAME_ALIASES[a.id] ?? a.name),
      a,
    );
  }

  const vendored = Object.values(refData.phrenicAmplifications ?? {});
  const usedHandIds = new Set<string>();
  const seenNormNames = new Set<string>();
  const merged: MergedPhrenicAmplificationEntry[] = [];
  for (const v of vendored) {
    const norm = normalizeAmplificationName(v.name);
    const handMatch = seenNormNames.has(norm) ? undefined : handByNormName.get(norm);
    if (handMatch) {
      seenNormNames.add(norm);
      usedHandIds.add(handMatch.id);
      merged.push({ ...handMatch, description: v.description, sources: v.sources });
    } else {
      merged.push(vendoredToDef(v));
    }
  }
  for (const a of AMPLIFICATION_LIST) {
    if (!usedHandIds.has(a.id)) merged.push(a);
  }
  return merged;
}
