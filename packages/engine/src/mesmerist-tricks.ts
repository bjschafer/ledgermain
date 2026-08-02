/**
 * Clean-room PF1 mesmerist Trick table (Occult Adventures), hand- authored
 * from the published rules (verified against aonprd.com's Mesmerist Tricks
 * index and each entry's own page/source citation, 2026-07-08).
 *
 * Cadence (PF1 OA RAW, "Tricks": verified against aonprd.com's live
 * Mesmerist class page — "At 1st level, and every 2 levels thereafter, a
 * mesmerist learns a new trick"): 1st, 3rd, 5th, 7th, 9th, 11th, 13th, 15th,
 * 17th, 19th — 10 total by 19th (see `model/mesmeristTricks.ts` for the
 * budget math). Masterful tricks (`tier: "masterful"`) unlock starting at
 * 12th level ("at 12th level, and every 4 levels thereafter, a mesmerist can
 * choose a masterful trick in place of a normal trick" — verified) — NOT an
 * extra budget slot, the same soft-gated-within-the-same-budget shape
 * `WITCH_HEXES`' major/grand tiers use. Implanting a trick draws from the
 * separate Mesmerist Tricks resource pool (already vendored — a real
 * `uses.maxFormula`, see
 * `resources.ts`); this table is only the MENU of which trick a given
 * implant applies, not the pool itself.
 *
 * Scope: FULL vendored parity as of the extension — all 44 vendored tricks (30
 * regular + 14 masterful), pooled across every splatbook the pinned data
 * carries (Occult Adventures, Occult Origins, Occult Realms, Heroes of
 * Golarion, Blood of the Beast). The original cut scoped to OCCULT ADVENTURES
 * CORE ONLY (17 regular + 9 masterful, matching the task brief's own worked
 * example list — "Astounding Avoidance, Compel Alacrity, False Flanker,...");
 * a later pass folds in the remaining 18 splatbook tricks for full-catalog parity, same
 * posture as `witch-hexes.ts`'s own extension.
 *
 * Modelling posture (mirrors witch-hexes.ts's honesty bar): every trick here
 * is a TARGET-SCOPED implant/trigger ability — implanted on a chosen creature
 * (standard action) via `actionNote`'s "implant" half, then triggered later
 * (usually a free action on a stated condition) via `actionNote`'s "trigger"
 * half — never a standing Change on the mesmerist's own sheet. So EVERY entry
 * here is `displayOnly: true` with `changes: []`; `actionNote` carries the
 * implant/trigger action economy the task brief calls for, and `summary`
 * carries the effect.
 */

import type { Change, MesmeristTrick, RefData, SourceRef } from "@pf1/schema";

export type MesmeristTrickTier = "trick" | "masterful";

export interface MesmeristTrickDef {
  id: string;
  name: string;
  tier: MesmeristTrickTier;
  /** Earliest mesmerist level this trick can be selected at — 1 (trick) or 12 (masterful). Soft-filtered only, never blocks. */
  minLevel: number;
  /** Implant/trigger action economy, e.g. "implant: standard · trigger: free (on hit)". */
  actionNote: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Always empty — see file doc comment (target-scoped implant, no standing Change). */
  changes: Change[];
  /** Always true here. */
  displayOnly: true;
}

interface RawTrick {
  id: string;
  name: string;
  actionNote: string;
  summary: string;
}

function forTier(
  tier: MesmeristTrickTier,
  minLevel: number,
  entries: RawTrick[],
): MesmeristTrickDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    tier,
    minLevel,
    actionNote: e.actionNote,
    summary: e.summary,
    changes: [],
    displayOnly: true,
  }));
}

const TRICK_LIST: MesmeristTrickDef[] = [
  ...forTier("trick", 1, [
    {
      id: "astoundingAvoidance",
      name: "Astounding Avoidance",
      actionNote: "implant: standard · trigger: free (on a half-damage save)",
      summary:
        "The implanted subject negates all damage from a successful half-damage-on-save effect (or takes half on a failed save at 12th+ level).",
    },
    {
      id: "breakStupor",
      name: "Break Stupor",
      actionNote:
        "implant: standard · trigger: free (subject would break from fascination/sleep, or becomes confused)",
      summary:
        "End a fascination or magical-sleep effect on the subject fast enough to stop her falling prone or dropping items; can also end confusion, though she then attacks you on her next turn.",
    },
    {
      id: "chainOfEyes",
      name: "Chain of Eyes",
      actionNote: "implant: standard · trigger: free (concentrate to share senses)",
      summary:
        "See and hear through the subject's own senses for 1 minute per level, or until you shift your view back; you're flat-footed while viewing through her.",
    },
    {
      id: "compelAlacrity",
      name: "Compel Alacrity",
      actionNote: "implant: standard · trigger: free (start of turn, enemy in reach)",
      summary:
        "The subject moves 10 ft. (scaling to 30 ft. at 20th level) without provoking attacks of opportunity.",
    },
    {
      id: "enchantingWords",
      name: "Enchanting Words",
      actionNote:
        "implant: standard · trigger: free (subject attempts a Diplomacy/Intimidate check to adjust attitude)",
      summary:
        "The subject uses your Charisma modifier on the check in place of her own; an Intimidate-based adjustment also lasts longer (10 × your Charisma modifier extra minutes, minimum 10).",
    },
    {
      id: "falseFlanker",
      name: "False Flanker",
      actionNote: "implant: standard · trigger: free (subject threatens an enemy)",
      summary: "An illusory duplicate of you appears to help the subject flank for one turn.",
    },
    {
      id: "fearsomeGuise",
      name: "Fearsome Guise",
      actionNote: "implant: standard (grants a disguise) · trigger: free (subject attacks)",
      summary: "You use Intimidate against the subject's target as part of its attack.",
    },
    {
      id: "fleetInShadows",
      name: "Fleet in Shadows",
      actionNote: "implant: standard · trigger: free (subject enters dim light or darker)",
      summary:
        "The subject can move up to double speed (max +30 ft.) for 1 round while in dim light or darker, and can use that bonus speed even in total darkness without being able to see.",
    },
    {
      id: "giftOfWill",
      name: "Gift of Will",
      actionNote:
        "implant: standard · trigger: free (Will save, Sense Motive, or Intimidate check)",
      summary:
        "The subject uses your Will save bonus in place of its own, or gains a Charisma-based morale bonus on the check.",
    },
    {
      id: "levitationBuffer",
      name: "Levitation Buffer",
      actionNote:
        "implant: standard · trigger: free (enemy moves adjacent or starts turn adjacent)",
      summary: "Lift the enemy (half speed, -4 CMD) or push it away as a free bull rush.",
    },
    {
      id: "lifeRevier",
      name: "Life Revier",
      actionNote:
        "implant: standard · trigger: free (subject attempts an Intelligence/Knowledge check to recall a past experience)",
      summary:
        "The subject can use your Charisma modifier in place of her Intelligence modifier on the check, and can attempt it untrained; she still can't recall anything she never actually experienced.",
    },
    {
      id: "linkedReaction",
      name: "Linked Reaction",
      actionNote: "implant: standard · trigger: free (one of a pair is surprised, the other isn't)",
      summary:
        "Both the subject and a linked ally act normally during a surprise round when only one of them is surprised.",
    },
    {
      id: "maskMisery",
      name: "Mask Misery",
      actionNote: "implant: standard · trigger: free (subject gains a minor condition)",
      summary:
        "Suppress a minor condition (shaken, sickened, etc.) on the subject for 1d4 rounds (ignore it entirely at 6th+ level).",
    },
    {
      id: "meekFacade",
      name: "Meek Facade",
      actionNote: "implant: standard · trigger: free (subject is missed by an attack)",
      summary:
        "The attacking enemy must attack only the subject next round; the subject gains +2 dodge AC against it (scaling +1 per 5 levels).",
    },
    {
      id: "mesmericMirror",
      name: "Mesmeric Mirror",
      actionNote:
        "implant: standard · trigger: free (subject is attacked or targeted by an attack spell)",
      summary:
        "A duplicate of the subject appears (up to 5 at 20th level), lasting 1 minute per level.",
    },
    {
      id: "mesmericPantomime",
      name: "Mesmeric Pantomime",
      actionNote: "implant: standard · trigger: free (Str/Dex-based skill check)",
      summary:
        "The subject uses your bonus on that skill, or gains a Charisma-based morale bonus, whichever is higher.",
    },
    {
      id: "misdirection",
      name: "Misdirection",
      actionNote: "implant: standard · trigger: free (subject's attack or attack spell)",
      summary: "You feint the subject's target, denying it its Dexterity bonus to AC.",
    },
    {
      id: "psychicImpression",
      name: "Psychic Impression",
      actionNote: "implant: standard · trigger: free (subject touches a recently-touched object)",
      summary:
        "You sense the emotional state of the last creature (Intelligence 3+) to have touched an object the subject touches, if within the last 10 minutes; no images, language, or identity come through.",
    },
    {
      id: "psychosomaticSurge",
      name: "Psychosomatic Surge",
      actionNote: "implant: standard (lasts 1 hour) · trigger: free (subject takes damage)",
      summary:
        "The subject gains 1d8 + half your level temporary hit points (another 1d8 if brought near death).",
    },
    {
      id: "reflectFear",
      name: "Reflect Fear",
      actionNote:
        "implant: standard · trigger: free (subject is affected by fear, or targeted by a demoralize attempt)",
      summary:
        "The subject suppresses the triggering fear effect for 1d4 rounds (ending it entirely if that outlasts the effect's own duration), and whoever caused it must save or be shaken for 1 round.",
    },
    {
      id: "reflectionOfWeakness",
      name: "Reflection of Weakness",
      actionNote:
        "implant: standard · trigger: free (subject is dealt ability damage/drain/bleed/a condition)",
      summary:
        "Reduce the effect on the subject by 2 and inflict 2 ability damage on the attacker (Will negates).",
    },
    {
      id: "seeInDarkness",
      name: "See in Darkness",
      actionNote: "implant: standard · trigger: free (subject moves into darkness)",
      summary: "The subject gains 60-foot darkvision for 1 minute.",
    },
    {
      id: "shadowSplinter",
      name: "Shadow Splinter",
      actionNote: "implant: standard · trigger: free (subject takes damage)",
      summary:
        "Reduce the subject's damage (max 3 + Cha mod) and redirect the difference to a nearby creature (Will disbelieves).",
    },
    {
      id: "slipBonds",
      name: "Slip Bonds",
      actionNote:
        "implant: standard (also grants +2 circumstance on Escape Artist) · trigger: free (subject is grappled/pinned/restrained)",
      summary:
        "The subject briefly turns incorporeal to slip a restraint (not long enough to pass through barriers); at 12th level she stays incorporeal until the start of your next turn.",
    },
    {
      id: "spectralSmoke",
      name: "Spectral Smoke",
      actionNote:
        "implant: standard · trigger: free (subject is targeted by an attack or attack spell)",
      summary:
        "A 10-ft.-radius smoke cloud (scaling +5 ft. per 5 levels) appears around the subject for 1 round per level.",
    },
    {
      id: "telepathicLink",
      name: "Telepathic Link",
      actionNote:
        "implant: standard · trigger: free (subject and allies are outnumbered in combat)",
      summary:
        "You and the subject can communicate telepathically for 1 minute per level, severed beyond a medium range (100 ft. + 10 ft. per level); you must share a language.",
    },
    {
      id: "umbralShield",
      name: "Umbral Shield",
      actionNote:
        "implant: standard · trigger: free (subject would be exposed to harmful bright light)",
      summary:
        "The subject ignores harmful effects of bright light or sunlight and is immune to the dazzled condition, for 1 minute.",
    },
    {
      id: "unwittingMessenger",
      name: "Unwitting Messenger",
      actionNote:
        "implant: standard (a described recipient plus a short verbal message) · trigger: automatic (subject meets the recipient)",
      summary:
        "The subject delivers your message verbatim to the described recipient on meeting her, with no memory of the message afterward; it fades after 24 hours if never delivered, and a disguise or illusion can misdirect it.",
    },
    {
      id: "vanishArrow",
      name: "Vanish Arrow",
      actionNote:
        "implant: standard · trigger: immediate (before a ranged attack roll against the subject)",
      summary:
        "Opposed Sleight of Hand vs. the attacker's Perception; success negates the ranged attack entirely.",
    },
    {
      id: "voiceOfReason",
      name: "Voice of Reason",
      actionNote:
        "implant: standard · trigger: free (subject saves to disbelieve a sight-based illusion)",
      summary:
        "The subject gains an insight bonus equal to your Charisma modifier on that save, as long as you aren't affected by (or haven't already disbelieved) the illusion yourself.",
    },
  ]),
  ...forTier("masterful", 12, [
    {
      id: "allayPain",
      name: "Allay Pain",
      actionNote: "implant: standard · trigger: free (subject hit by nonlethal damage)",
      summary: "The subject gains DR 15/- against one attack that deals nonlethal damage.",
    },
    {
      id: "avianEscape",
      name: "Avian Escape",
      actionNote: "implant: standard · trigger: free (subject takes damage)",
      summary: "The subject transforms into a raven (raven statistics) to escape.",
    },
    {
      id: "concealingVeil",
      name: "Concealing Veil",
      actionNote: "implant: standard · trigger: free (as needed)",
      summary: "The subject gains the effects of nondetection for 1 round per level.",
    },
    {
      id: "cursedSanction",
      name: "Cursed Sanction",
      actionNote:
        "implant: standard (visible forehead symbol) · trigger: free (attacker hits/targets the subject)",
      summary:
        "The attacker takes a -4 penalty on all rolls for 1 minute per level (Will negates).",
    },
    {
      id: "fakedDeath",
      name: "Faked Death",
      actionNote: "implant: standard · trigger: free (subject takes damage)",
      summary:
        "The subject appears dead (figment), then turns invisible (glamer) for a number of rounds equal to your level, or until it attacks.",
    },
    {
      id: "freeInBody",
      name: "Free in Body",
      actionNote: "implant: standard · trigger: free (start of turn, subject grappled/impeded)",
      summary: "The subject gains freedom of movement for 1 minute.",
    },
    {
      id: "greaterMaskMisery",
      name: "Greater Mask Misery",
      actionNote: "implant: standard · trigger: free (subject gains a condition)",
      summary:
        "As Mask Misery, but also suppresses greater conditions (paralyzed, stunned, etc.); requires the base Mask Misery trick.",
    },
    {
      id: "mentalFallback",
      name: "Mental Fallback",
      actionNote: "implant: standard · trigger: free (subject is affected by a charm/compulsion)",
      summary:
        "You take control of the effect in the subject's place for a number of rounds equal to your level.",
    },
    {
      id: "shadowBlend",
      name: "Shadow Blend",
      actionNote:
        "implant: standard · trigger: free (subject attempts Stealth in dim light or darker)",
      summary:
        "The subject gains total concealment (or just concealment against darkvision) while she stays in dim light or darker, lasting 1 round per level or until she enters normal/bright light.",
    },
    {
      id: "spatialSwitch",
      name: "Spatial Switch",
      actionNote:
        "implant: standard · trigger: immediate (an enemy is adjacent to you or the subject)",
      summary: "You and the subject swap positions, resolved before damage is calculated.",
    },
    {
      id: "spellAnticipation",
      name: "Spell Anticipation",
      actionNote:
        "implant: standard (costs one spell slot) · trigger: free (subject is targeted by an enemy spell)",
      summary: "You cast the anticipated prepared spell at the spellcaster.",
    },
    {
      id: "umbralTransformation",
      name: "Umbral Transformation",
      actionNote: "implant: standard · trigger: free (as needed)",
      summary:
        "The subject becomes a living shadow for 1 round, as shadow body, then is staggered for 1 round afterward.",
    },
    {
      id: "visionOfBlood",
      name: "Vision of Blood",
      actionNote:
        "implant: standard · trigger: free (subject hits with a weapon/natural/unarmed attack)",
      summary: "The target is stunned for 1 round (Will negates; no save on a critical hit).",
    },
    {
      id: "willfulIgnorance",
      name: "Willful Ignorance",
      actionNote: "implant: standard · trigger: free (subject tells a lie)",
      summary:
        "That lie resists truth-detecting magic — a creature trying to detect it must beat a caster level check against DC 15 + your class level, or the magic simply fails to catch it.",
    },
  ]),
];

export const MESMERIST_TRICKS: Record<string, MesmeristTrickDef> = Object.fromEntries(
  TRICK_LIST.map((t) => [t.id, t]),
);

export const MESMERIST_TRICK_IDS: readonly string[] = TRICK_LIST.map((t) => t.id);

/** All trick defs of a given tier, in table order. */
export function tricksForTier(tier: MesmeristTrickTier): MesmeristTrickDef[] {
  return TRICK_LIST.filter((t) => t.tier === tier);
}

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * `RefData.mesmeristTricks` (see that type's doc comment) is the FULL
 * published catalog (44 entries after junk filtering), prose only. The
 * hand-verified table above now matches it 1:1 (full parity, see the file's
 * top doc comment), but this section still merges the two for BROWSING (the
 * picker) and for resolving a picked id back to a definition, mirroring
 * `rage-powers.ts`'s `mergedRagePowerCatalog`/`resolveRagePower` exactly.
 *
 * Collision audit: all 44 hand-authored entries matched a vendored entry by
 * normalized name — zero misses, zero aliases needed. Notably "Life Revier"
 * (the `life_revier` id) is NOT a transcription typo — it's the vendored
 * source's own spelling and AoN's own page title for the trick, verified
 * directly against aonprd.com, so it's transcribed as-is rather than
 * "corrected" to a guessed "Life Reviver".
 */

const MESMERIST_TRICK_NAME_ALIASES: Record<string, string> = {};

function normalizeMesmeristTrickName(name: string): string {
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
export interface MergedMesmeristTrickEntry extends MesmeristTrickDef {
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredToDef(entry: MesmeristTrick): MergedMesmeristTrickEntry {
  return {
    id: entry.id,
    name: entry.name,
    tier: entry.tier,
    minLevel: entry.tier === "masterful" ? 12 : 1,
    actionNote: "",
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/** Resolve a picked trick id (`doc.build.mesmeristTricks` entries) to its definition — hand-authored table first, falling back to the vendored catalog. Mirrors `resolveRagePower`. */
export function resolveMesmeristTrick(id: string, refData: RefData): MesmeristTrickDef | undefined {
  const hand = MESMERIST_TRICKS[id];
  if (hand) return hand;
  const vendored = refData.mesmeristTricks?.[id];
  return vendored ? vendoredToDef(vendored) : undefined;
}

/** The full picker-browsable catalog — mirrors `mergedRagePowerCatalog` exactly. `!entry.displayOnly` marks which rows carry a real, live mechanical effect (none in this table — see file doc comment — so this is always false here, kept for the shared picker convention). */
export function mergedMesmeristTrickCatalog(refData: RefData): MergedMesmeristTrickEntry[] {
  const handByNormName = new Map<string, MesmeristTrickDef>();
  for (const t of TRICK_LIST) {
    handByNormName.set(
      normalizeMesmeristTrickName(MESMERIST_TRICK_NAME_ALIASES[t.id] ?? t.name),
      t,
    );
  }

  const vendored = Object.values(refData.mesmeristTricks ?? {});
  const usedHandIds = new Set<string>();
  const seenNormNames = new Set<string>();
  const merged: MergedMesmeristTrickEntry[] = [];
  for (const v of vendored) {
    const norm = normalizeMesmeristTrickName(v.name);
    const handMatch = seenNormNames.has(norm) ? undefined : handByNormName.get(norm);
    if (handMatch) {
      seenNormNames.add(norm);
      usedHandIds.add(handMatch.id);
      merged.push({ ...handMatch, description: v.description, sources: v.sources });
    } else {
      merged.push(vendoredToDef(v));
    }
  }
  for (const t of TRICK_LIST) {
    if (!usedHandIds.has(t.id)) merged.push(t);
  }
  return merged;
}
