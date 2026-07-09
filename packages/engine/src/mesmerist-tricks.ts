/**
 * Clean-room PF1 mesmerist Trick table (Occult Adventures, issue #65), hand-
 * authored from the published rules (verified against aonprd.com's Mesmerist
 * Tricks index and each entry's own page/source citation, 2026-07-08).
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
 * `uses.maxFormula`, see IMPLEMENTATION_PLAN.md's 2026-07-07 wave note and
 * `resources.ts`); this table is only the MENU of which trick a given
 * implant applies, not the pool itself.
 *
 * Scope: aonprd.com's Mesmerist Tricks index lists 30 regular + 14 masterful
 * tricks pooled across several splatbooks (Occult Adventures, Occult
 * Origins, Occult Realms, Heroes of Golarion, Blood of the Beast) — this
 * table scopes to OCCULT ADVENTURES CORE ONLY (pg. 40-44, verified per-entry
 * against each trick's own source citation), matching this project's usual
 * "core rulebook first" posture (`witch-hexes.ts`/`oracle-revelations.ts`):
 * 17 regular + 9 masterful, 26 total. The issue #65 task brief's own worked
 * example list ("Astounding Avoidance, Compel Alacrity, False Flanker, ...")
 * is exactly this OA-core regular subset.
 *
 * Modelling posture (mirrors witch-hexes.ts's honesty bar): every trick here
 * is a TARGET-SCOPED implant/trigger ability — implanted on a chosen
 * creature (standard action) via `actionNote`'s "implant" half, then
 * triggered later (usually a free action on a stated condition) via
 * `actionNote`'s "trigger" half — never a standing Change on the mesmerist's
 * own sheet. So EVERY entry here is `displayOnly: true` with `changes: []`;
 * `actionNote` carries the implant/trigger action economy the issue #65 task
 * brief calls for, and `summary` carries the effect.
 */

import type { Change } from "@pf1/schema";

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
      id: "compelAlacrity",
      name: "Compel Alacrity",
      actionNote: "implant: standard · trigger: free (start of turn, enemy in reach)",
      summary:
        "The subject moves 10 ft. (scaling to 30 ft. at 20th level) without provoking attacks of opportunity.",
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
      id: "psychosomaticSurge",
      name: "Psychosomatic Surge",
      actionNote: "implant: standard (lasts 1 hour) · trigger: free (subject takes damage)",
      summary:
        "The subject gains 1d8 + half your level temporary hit points (another 1d8 if brought near death).",
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
      id: "shadowSplinter",
      name: "Shadow Splinter",
      actionNote: "implant: standard · trigger: free (subject takes damage)",
      summary:
        "Reduce the subject's damage (max 3 + Cha mod) and redirect the difference to a nearby creature (Will disbelieves).",
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
      id: "vanishArrow",
      name: "Vanish Arrow",
      actionNote:
        "implant: standard · trigger: immediate (before a ranged attack roll against the subject)",
      summary:
        "Opposed Sleight of Hand vs. the attacker's Perception; success negates the ranged attack entirely.",
    },
  ]),
  ...forTier("masterful", 12, [
    {
      id: "avianEscape",
      name: "Avian Escape",
      actionNote: "implant: standard · trigger: free (subject takes damage)",
      summary: "The subject transforms into a raven (raven statistics) to escape.",
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
      id: "visionOfBlood",
      name: "Vision of Blood",
      actionNote:
        "implant: standard · trigger: free (subject hits with a weapon/natural/unarmed attack)",
      summary: "The target is stunned for 1 round (Will negates; no save on a critical hit).",
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
