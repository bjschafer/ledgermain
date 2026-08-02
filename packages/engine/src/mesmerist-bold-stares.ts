/**
 * Clean-room PF1 mesmerist Bold Stare table (Occult Adventures), hand-authored
 * from the published rules (verified against aonprd.com's Mesmerist Stares
 * index and each entry's own page, 2026-07-08).
 *
 * Cadence (PF1 OA RAW, "Bold Stare": verified against aonprd.com's live
 * Mesmerist class page — gained at 3rd level, "and every 4 levels
 * thereafter, the mesmerist can choose an option that governs how her
 * hypnotic stare functions"): 3rd, 7th, 11th, 15th, 19th — 5 total by 19th
 * (see `model/mesmeristBoldStares.ts` for the budget math). Each pick adds a
 * DIFFERENT rider to the mesmerist's existing Hypnotic Stare penalty
 * (`tables.ts`'s `hypnoticStarePenalty`/`hypnoticStareLabel`) — the stare
 * itself, its DC-less -2/-3 Will-save penalty, and WHICH creature is stared
 * at are already modeled (display-only, per-target); Bold Stare just extends
 * what else that SAME penalty value applies to.
 *
 * Scope: FULL vendored parity as of the extension — all 24 vendored bold stare
 * options, pooled across every splatbook the pinned data carries (Occult
 * Adventures, Occult Origins, Occult Realms, Heroes of Golarion). The original
 * cut scoped to OCCULT ADVENTURES CORE ONLY (pg. 42-43): 7 options (Allure,
 * Disorientation, Psychic Inception, Sapped Magic, Sluggishness,
 * Susceptibility, Timidity) — already more than the 5 a mesmerist ever picks
 * by 19th, so that scope never actually constrained a real build; a later pass folds in
 * the remaining 17 splatbook options (the Devilbane family plus Disquiet,
 * Distracted, Infiltration, Lethality, Nightblindness, Nightmare, Oscillation,
 * Restriction, Sabotage, Sensed, Unaided) for full-catalog browsing.
 *
 * Modelling posture: MOST bold stares are a clean, unconditional extension of
 * the ALREADY-MODELED hypnotic-stare penalty to one or more additional roll
 * categories on the same stared target (e.g. Disorientation: "the penalty
 * also applies on attack rolls") — same target-scoped, per-creature honesty
 * bar as `hypnoticStareLabel` itself (display-only; there's no reliable
 * "current stared target" a Change could apply to), so `riderText` is
 * appended onto `hypnoticStareLabel`'s output by `archetypes.ts`'s Hypnotic
 * Stare dispatch (see `boldStareRiderSummary`) rather than becoming its own
 * separate Change. Psychic Inception is a genuine mechanic-substitution
 * exception (extends WHO can be affected, with a save-adjustment rider) —
 * kept the same displayOnly/note-tier shape as the rest for consistency, its
 * `riderText` just describes the substitution instead of an extra roll
 * category.
 */

import type { Change, MesmeristBoldStare, RefData, SourceRef } from "@pf1/schema";

export interface MesmeristBoldStareDef {
  id: string;
  name: string;
  /**
   * Short clause appended onto `hypnoticStareLabel`'s output, e.g. "also on
   * attack rolls" (renders as "-2 Will save on stared target; also on attack
   * rolls (Disorientation)" — see `boldStareRiderSummary`).
   */
  riderText: string;
  /** Full rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Always empty — see file doc comment (rider on an existing display-only line, no standing Change). */
  changes: Change[];
  /** Always true here. */
  displayOnly: true;
}

interface RawStare {
  id: string;
  name: string;
  riderText: string;
  summary: string;
}

const STARE_LIST: MesmeristBoldStareDef[] = (
  [
    {
      id: "allure",
      name: "Allure",
      riderText: "also on initiative and Perception checks",
      summary:
        "The hypnotic stare penalty also applies to the target's initiative and Perception checks.",
    },
    {
      id: "devilbaneBinding",
      name: "Devilbane Binding",
      riderText:
        "also on Charisma checks to escape planar binding, and vs. binding spell resistance",
      summary:
        "The hypnotic stare penalty also applies to the target's Charisma checks to escape a planar binding effect, and to its spell resistance against a planar binding spell.",
    },
    {
      id: "devilbaneDampening",
      name: "Devilbane Dampening",
      riderText: "also reduces resistance to one energy type you choose",
      summary:
        "The hypnotic stare penalty also reduces the target's resistance to a single energy type you choose when the stare begins (no effect if the target has no resistance to that type).",
    },
    {
      id: "devilbaneDismissal",
      name: "Devilbane Dismissal",
      riderText: "halves the duration of the target's summoning spells",
      summary:
        "The hypnotic stare halves the duration of any conjuration (summoning) spell the target casts, or that's currently affecting it.",
    },
    {
      id: "devilbaneImpediment",
      name: "Devilbane Impediment",
      riderText: "forces a concentration check to activate spell-like abilities",
      summary:
        "The target must succeed at a concentration check (DC 15 + the ability's spell level) to activate a spell-like ability while stared at; on a failure the ability is expended with no effect.",
    },
    {
      id: "devilbaneMundanity",
      name: "Devilbane Mundanity",
      riderText: "also vs. spell resistance (doesn't stack with Sapped Magic)",
      summary:
        "The hypnotic stare penalty also applies to the target's spell resistance; doesn't stack with the Sapped Magic bold stare.",
    },
    {
      id: "devilbaneWithering",
      name: "Devilbane Withering",
      riderText: "also on attack/damage rolls, outsiders only",
      summary:
        "The hypnotic stare penalty also applies to the target's attack and damage rolls, but only if it's an outsider — no effect on other creature types.",
    },
    {
      id: "disorientation",
      name: "Disorientation",
      riderText: "also on attack rolls",
      summary: "The hypnotic stare penalty also applies to the target's attack rolls.",
    },
    {
      id: "disquiet",
      name: "Disquiet",
      riderText: "shaken while in total darkness",
      summary: "The target is shaken while it remains in an area of total darkness.",
    },
    {
      id: "distracted",
      name: "Distracted",
      riderText: "also on concentration checks",
      summary: "The hypnotic stare penalty also applies to the target's concentration checks.",
    },
    {
      id: "infiltration",
      name: "Infiltration",
      riderText: "also on Perception checks and CMD",
      summary: "The hypnotic stare penalty also applies to the target's Perception checks and CMD.",
    },
    {
      id: "lethality",
      name: "Lethality",
      riderText: "also on Fortitude saves vs. poison and disease",
      summary:
        "The hypnotic stare penalty also applies to the target's Fortitude saves against poison and disease.",
    },
    {
      id: "nightblindness",
      name: "Nightblindness",
      riderText: "-10 ft. to the target's darkvision range",
      summary: "The target's darkvision range (if any) is reduced by 10 feet while stared at.",
    },
    {
      id: "nightmare",
      name: "Nightmare",
      riderText: "rolls twice (takes the worse) on Will saves vs. fear",
      summary:
        "The target rolls twice on Will saves against fear effects and takes the worse result.",
    },
    {
      id: "oscillation",
      name: "Oscillation",
      riderText: "treats enemies beyond 30 ft. as concealed",
      summary:
        "The target treats all enemies beyond 30 feet, other than you, as having concealment (20% miss chance).",
    },
    {
      id: "psychicInception",
      name: "Psychic Inception",
      riderText:
        "also affects mindless/mind-immune creatures (they resist 50%/round, +2 on any save)",
      summary:
        "The hypnotic stare (and your mind-affecting spells/abilities on a stared target) can affect creatures that are mindless or normally immune to mind-affecting effects; such a creature gets a +2 bonus on its save (if any) and has a 50% chance each round to act normally despite the effect.",
    },
    {
      id: "restriction",
      name: "Restriction",
      riderText: "treats dim light or darker as difficult terrain",
      summary: "The target treats areas of dim light or darker as difficult terrain.",
    },
    {
      id: "sabotage",
      name: "Sabotage",
      riderText: "also on Diplomacy and Intimidate checks",
      summary:
        "The hypnotic stare penalty also applies to the target's Diplomacy and Intimidate checks.",
    },
    {
      id: "sappedMagic",
      name: "Sapped Magic",
      riderText: "also on spell DCs and spell resistance",
      summary:
        "The hypnotic stare penalty also applies to the DCs of the target's spells/spell-like abilities and to its spell resistance (if any).",
    },
    {
      id: "sensed",
      name: "Sensed",
      riderText: "also on Stealth checks",
      summary: "The hypnotic stare penalty also applies to the target's Stealth checks.",
    },
    {
      id: "sluggishness",
      name: "Sluggishness",
      riderText: "also -5 ft. to all speeds (min 5 ft.) and on Reflex saves",
      summary:
        "The target's speeds are all reduced by 5 ft. (minimum 5 ft.), and the hypnotic stare penalty also applies to its Reflex saves.",
    },
    {
      id: "susceptibility",
      name: "Susceptibility",
      riderText: "also on Sense Motive vs. Bluff, and on Diplomacy/Intimidate DCs against it",
      summary:
        "The hypnotic stare penalty also applies to the target's Sense Motive checks to oppose Bluff, and to the DCs of Diplomacy/Intimidate checks made against it.",
    },
    {
      id: "timidity",
      name: "Timidity",
      riderText: "also on damage rolls",
      summary: "The hypnotic stare penalty also applies to the target's damage rolls.",
    },
    {
      id: "unaided",
      name: "Unaided",
      riderText: "can't grant or receive flanking",
      summary: "The target can neither grant nor receive the benefit of flanking.",
    },
  ] satisfies RawStare[]
).map((e) => ({ ...e, changes: [], displayOnly: true as const }));

export const MESMERIST_BOLD_STARES: Record<string, MesmeristBoldStareDef> = Object.fromEntries(
  STARE_LIST.map((s) => [s.id, s]),
);

export const MESMERIST_BOLD_STARE_IDS: readonly string[] = STARE_LIST.map((s) => s.id);

/**
 * Appends the chosen bold stares' short riders onto `hypnoticStareLabel`'s
 * base output, e.g. `"-2 Will save on stared target; also on attack rolls
 * (Disorientation)"`. Unresolvable ids are silently skipped (same tolerance
 * every other hand-authored table in this engine applies). Returns the base
 * label unchanged when no bold stares are chosen.
 */
export function boldStareRiderSummary(baseLabel: string, boldStareIds: readonly string[]): string {
  const riders = boldStareIds
    .map((id) => MESMERIST_BOLD_STARES[id])
    .filter((s): s is MesmeristBoldStareDef => s !== undefined)
    .map((s) => `${s.riderText} (${s.name})`);
  if (riders.length === 0) return baseLabel;
  return `${baseLabel}; ${riders.join("; ")}`;
}

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * `RefData.mesmeristBoldStares` (see that type's doc comment) is the FULL
 * published catalog (24 entries after junk filtering), prose only. The
 * hand-verified table above now matches it 1:1 (full parity, see the file's
 * top doc comment), but this section still merges the two for BROWSING (the
 * picker) and for resolving a picked id, mirroring `rage-powers.ts`'s
 * `mergedRagePowerCatalog`/`resolveRagePower` exactly.
 *
 * Collision audit: all 24 hand-authored entries matched a vendored entry by
 * normalized name — zero misses, zero aliases needed. NOTE: a vendored-only
 * bold stare (picked straight from the full-catalog picker, were the
 * vendored catalog to ever outgrow this table again on a future data bump)
 * resolves to a definition with an EMPTY `riderText` — `boldStareRiderSummary`
 * above doesn't take a `RefData` and can't look one up, so a vendored-only
 * pick would contribute no clause to the Hypnotic Stare class-feature's
 * summary line (same "unresolvable id silently skipped" tolerance that
 * function already documents) — it would still surface as its own Class
 * Features row via `resolveMesmeristBoldStare`, just without enriching that
 * OTHER row. No such gap exists today.
 */

const MESMERIST_BOLD_STARE_NAME_ALIASES: Record<string, string> = {};

function normalizeBoldStareName(name: string): string {
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
export interface MergedMesmeristBoldStareEntry extends MesmeristBoldStareDef {
  description?: string;
  sources?: SourceRef[];
}

function vendoredToDef(entry: MesmeristBoldStare): MergedMesmeristBoldStareEntry {
  return {
    id: entry.id,
    name: entry.name,
    riderText: "",
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/** Resolve a picked bold-stare id to its definition — hand-authored table first, falling back to the vendored catalog. Mirrors `resolveRagePower`. */
export function resolveMesmeristBoldStare(
  id: string,
  refData: RefData,
): MesmeristBoldStareDef | undefined {
  const hand = MESMERIST_BOLD_STARES[id];
  if (hand) return hand;
  const vendored = refData.mesmeristBoldStares?.[id];
  return vendored ? vendoredToDef(vendored) : undefined;
}

/** The full picker-browsable catalog — mirrors `mergedRagePowerCatalog`. */
export function mergedMesmeristBoldStareCatalog(refData: RefData): MergedMesmeristBoldStareEntry[] {
  const handByNormName = new Map<string, MesmeristBoldStareDef>();
  for (const s of STARE_LIST) {
    handByNormName.set(
      normalizeBoldStareName(MESMERIST_BOLD_STARE_NAME_ALIASES[s.id] ?? s.name),
      s,
    );
  }

  const vendored = Object.values(refData.mesmeristBoldStares ?? {});
  const usedHandIds = new Set<string>();
  const seenNormNames = new Set<string>();
  const merged: MergedMesmeristBoldStareEntry[] = [];
  for (const v of vendored) {
    const norm = normalizeBoldStareName(v.name);
    const handMatch = seenNormNames.has(norm) ? undefined : handByNormName.get(norm);
    if (handMatch) {
      seenNormNames.add(norm);
      usedHandIds.add(handMatch.id);
      merged.push({ ...handMatch, description: v.description, sources: v.sources });
    } else {
      merged.push(vendoredToDef(v));
    }
  }
  for (const s of STARE_LIST) {
    if (!usedHandIds.has(s.id)) merged.push(s);
  }
  return merged;
}
