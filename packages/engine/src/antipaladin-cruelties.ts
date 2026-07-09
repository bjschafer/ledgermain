/**
 * Clean-room PF1 antipaladin cruelty table (Advanced Player's Guide, issue
 * #65 wave B): hand-authored from the published rules — but UNLIKE
 * `witch-hexes.ts`/`oracle-revelations.ts`, this one has a real source: the
 * vendored `class-features.json` "Cruelty" entry carries full prose (the
 * antipaladin class def only links the single generic "Cruelty" stub
 * `ClassFeature`, no per-cruelty breakdown — confirmed: no per-cruelty
 * entries exist), so the tier lists below are transcribed (paraphrased, not
 * verbatim) straight from that vendored description text, not an external
 * site. `changes: []` upstream on the stub, same as every other
 * hand-authored menu table here.
 *
 * PF1 APG RAW (vendored description, paraphrased): "At 3rd level, and every
 * three levels thereafter, an antipaladin can select one cruelty. Each
 * cruelty adds an effect to the antipaladin's touch of corruption ability.
 * Whenever the antipaladin uses touch of corruption to deal damage to one
 * target, the target also receives the additional effect from ONE of the
 * cruelties possessed by the antipaladin. This choice is made when the touch
 * is used [i.e. known cruelties are a menu the player picks from per-use, not
 * a single fixed rider] ... The DC of this save is equal to 10 + 1/2 the
 * antipaladin's level + the antipaladin's Charisma modifier" (see
 * `tables.ts` `antipaladinCrueltyDC`).
 *
 * Level gating: the MENU of selectable cruelties expands at 3rd/6th/9th/12th
 * (`tier`/`minLevel` below) — soft availability filtering only, same
 * convention as `WitchHexDef.minLevel` (see that file's doc comment); never
 * blocks selection. The antipaladin's PICK BUDGET (1 at 3rd, +1 every 3
 * levels thereafter) is separate — see `model/antipaladinCruelties.ts`.
 *
 * A handful of higher-tier cruelties have an in-fiction PREREQUISITE cruelty
 * ("Exhausted... must have the fatigue cruelty before selecting"; "Frightened
 * ... must have the shaken cruelty"; "Nauseated... must have the sickened
 * cruelty") — noted via `contextNotes`, never hard-blocked (this project's
 * hybrid soft-prereq posture; see CLAUDE.md).
 *
 * Modelling posture (mirrors witch-hexes.ts/oracle-revelations.ts's honesty
 * bar): every cruelty here inflicts a condition on a TARGET the antipaladin
 * touches (or heals undead — the alternate use, also display-only), never a
 * bonus to the antipaladin's own sheet, so there is no unconditional Change
 * to give the antipaladin herself. Every entry is `displayOnly: true` with
 * `changes: []`; `contextNotes` carries the save/DC/duration/prereq
 * reminder.
 */

import type { Change, ContextNote } from "@pf1/schema";

export type AntipaladinCrueltyTier = "initial" | "sixth" | "ninth" | "twelfth";

export interface AntipaladinCrueltyDef {
  id: string;
  name: string;
  tier: AntipaladinCrueltyTier;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Earliest antipaladin level this cruelty can be selected at — 3, 6, 9, or 12. Soft-filtered only. */
  minLevel: number;
  /** Typed modifiers granted by the cruelty (empty for every entry — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (save DC, duration, prerequisite cruelty, ...). */
  contextNotes?: ContextNote[];
  /** Always true here — no cruelty has a flat always-on numeric effect. */
  displayOnly: true;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });

const FORT_DC_NOTE = note("Fortitude negates; DC = 10 + 1/2 antipaladin level + Cha mod.");

interface RawCruelty {
  id: string;
  name: string;
  summary: string;
  contextNotes?: ContextNote[];
}

function forTier(
  tier: AntipaladinCrueltyTier,
  minLevel: number,
  entries: RawCruelty[],
): AntipaladinCrueltyDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    tier,
    summary: e.summary,
    minLevel,
    changes: [],
    contextNotes: e.contextNotes ?? [FORT_DC_NOTE],
    displayOnly: true,
  }));
}

const CRUELTY_LIST: AntipaladinCrueltyDef[] = [
  ...forTier("initial", 3, [
    { id: "fatigued", name: "Fatigued", summary: "The target becomes fatigued." },
    {
      id: "shaken",
      name: "Shaken",
      summary: "The target is shaken for 1 round per antipaladin level.",
    },
    {
      id: "sickened",
      name: "Sickened",
      summary: "The target is sickened for 1 round per antipaladin level.",
    },
  ]),
  ...forTier("sixth", 6, [
    { id: "dazed", name: "Dazed", summary: "The target is dazed for 1 round." },
    {
      id: "diseased",
      name: "Diseased",
      summary:
        "The target contracts a disease, as contagion, at antipaladin level as caster level.",
    },
    {
      id: "staggered",
      name: "Staggered",
      summary: "The target is staggered for 1 round per two antipaladin levels.",
    },
  ]),
  ...forTier("ninth", 9, [
    {
      id: "cursed",
      name: "Cursed",
      summary: "The target is cursed, as bestow curse, at antipaladin level as caster level.",
    },
    {
      id: "exhausted",
      name: "Exhausted",
      summary: "The target becomes exhausted.",
      contextNotes: [FORT_DC_NOTE, note("Requires the Fatigued cruelty already selected.")],
    },
    {
      id: "frightened",
      name: "Frightened",
      summary: "The target is frightened for 1 round per two antipaladin levels.",
      contextNotes: [FORT_DC_NOTE, note("Requires the Shaken cruelty already selected.")],
    },
    {
      id: "nauseated",
      name: "Nauseated",
      summary: "The target is nauseated for 1 round per three antipaladin levels.",
      contextNotes: [FORT_DC_NOTE, note("Requires the Sickened cruelty already selected.")],
    },
    {
      id: "poisoned",
      name: "Poisoned",
      summary: "The target is poisoned, as poison, at antipaladin level as caster level.",
    },
  ]),
  ...forTier("twelfth", 12, [
    {
      id: "blinded",
      name: "Blinded",
      summary: "The target is blinded for 1 round per antipaladin level.",
    },
    {
      id: "deafened",
      name: "Deafened",
      summary: "The target is deafened for 1 round per antipaladin level.",
    },
    { id: "paralyzed", name: "Paralyzed", summary: "The target is paralyzed for 1 round." },
    {
      id: "stunned",
      name: "Stunned",
      summary: "The target is stunned for 1 round per four antipaladin levels.",
    },
  ]),
];

export const ANTIPALADIN_CRUELTIES: Record<string, AntipaladinCrueltyDef> = Object.fromEntries(
  CRUELTY_LIST.map((c) => [c.id, c]),
);

export const ANTIPALADIN_CRUELTY_IDS: readonly string[] = CRUELTY_LIST.map((c) => c.id);

/** All cruelty defs of a given tier, in table order. */
export function crueltiesForTier(tier: AntipaladinCrueltyTier): AntipaladinCrueltyDef[] {
  return CRUELTY_LIST.filter((c) => c.tier === tier);
}

/**
 * Antipaladin cruelty save DC, clean-room from the published PF1 APG SRD.
 * Re-exported here (delegating to `tables.ts`) so callers that already
 * import from `antipaladin-cruelties.ts` don't need a second import —
 * mirrors `witch-hexes.ts`'s re-export of `witchHexDC`.
 */
export { antipaladinCrueltyDC } from "./tables.js";
