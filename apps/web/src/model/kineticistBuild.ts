/**
 * Pure kineticist Elemental Focus / Expanded Element / Wild Talent
 * transitions, mirroring `model/occultistImplements.ts`'s shape: a
 * single-choice setter for the primary element (like `setCavalierOrder`), two
 * single-choice setters for the 7th/15th Expanded Element picks, and a
 * toggle-list for `build.kineticistWildTalents` with TWO independently
 * budgeted cadences (infusions vs. utility talents) living in one field — the
 * same "one field, a helper disambiguates" shape
 * `chosenOccultistFocusPowerCount` uses for `occultistFocusPowers`.
 *
 * Infusion budget (verified verbatim against aonprd.com's Kineticist class
 * table): 1st, 3rd, 5th, 9th, 11th, 13th, 17th, 19th — 8 total by 19th.
 * Utility wild talent budget: 2nd, 4th, 6th, 8th, 10th, 12th, 14th, 16th,
 * 18th, 20th — 10 total by 20th. No "Extra Wild Talent"-style feat exists
 * in the vendored slice (confirmed) — neither budget is ever feat-boosted.
 *
 * This module never blocks: taking more than the expected count on either
 * budget, or picking a talent above the character's effective-level gate
 * (`minKineticistLevelForTalent`), is a soft warning only, matching the
 * project's hybrid posture on feat/trait/skill budgets.
 */

import {
  BLAST_SCOPED_WILD_TALENT_IDS,
  INFUSION_BLAST_EFFECTS,
  KINETICIST_WILD_TALENTS,
  minKineticistLevelForTalent,
  resolveKineticistWildTalent,
} from "@pf1/engine";
import type {
  CharacterDoc,
  KineticistBlastLoadout,
  KineticistGatherPowerMode,
  KineticistMetakinesisOption,
  RefData,
} from "@pf1/schema";

/** The kineticist's class level (0 for a non-kineticist, or a stale/multiclassed doc). */
export function kineticistLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "kineticist")?.level ?? 0;
}

/* --------------------------------------------------------------- element */

export function setKineticistElement(doc: CharacterDoc, tag: string | null): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  return {
    ...doc,
    build: { ...doc.build, kineticistElement: trimmed.length > 0 ? trimmed : undefined },
  };
}

/** Kineticist level threshold each Expanded Element pick index becomes available at. */
export const EXPANDED_ELEMENT_LEVELS: readonly [7, 15] = [7, 15];

/** Set (or clear, passing `null`) the Expanded Element pick at `index` (0 = 7th level, 1 = 15th). */
export function setKineticistExpandedElement(
  doc: CharacterDoc,
  index: 0 | 1,
  tag: string | null,
): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  const current = [...(doc.build.kineticistExpandedElements ?? [])];
  while (current.length <= index) current.push("");
  current[index] = trimmed;
  // Trim trailing empty slots so an unset index-1 doesn't linger as "".
  while (current.length > 0 && !current[current.length - 1]) current.pop();
  return {
    ...doc,
    build: { ...doc.build, kineticistExpandedElements: current.length > 0 ? current : undefined },
  };
}

/** The distinct known element tags: primary + any Expanded Element picks, deduped. */
export function knownKineticistElements(doc: CharacterDoc): string[] {
  const tags = [doc.build.kineticistElement, ...(doc.build.kineticistExpandedElements ?? [])];
  return [...new Set(tags.filter((t): t is string => !!t))];
}

/**
 * Record (or clear, passing `null`) which simple blast was picked for
 * `elementTag` — only air and water offer a choice. Clearing drops the key
 * entirely rather than storing "", so the doc never carries an entry that
 * `chosenSimpleBlast` would have to treat as stale.
 */
export function setKineticistSimpleBlast(
  doc: CharacterDoc,
  elementTag: string,
  blastId: string | null,
): CharacterDoc {
  const trimmed = typeof blastId === "string" ? blastId.trim() : "";
  const next = { ...doc.build.kineticistSimpleBlasts };
  if (trimmed.length > 0) next[elementTag] = trimmed;
  else delete next[elementTag];
  return {
    ...doc,
    build: {
      ...doc.build,
      kineticistSimpleBlasts: Object.keys(next).length > 0 ? next : undefined,
    },
  };
}

/* ------------------------------------------------------ elemental defense */

/**
 * Record how much of the burn currently held went into the Elemental Defense
 * rather than a blast (`live.kineticistDefenseBurn` — a division of burn
 * already accepted, not new burn). Never validated against the burn held or
 * the talent's cap here: the engine clamps both, so an overstated value is
 * inert rather than wrong, matching every other soft budget in this app.
 */
export function setKineticistDefenseBurn(doc: CharacterDoc, points: number): CharacterDoc {
  const n = Math.max(0, Math.trunc(points));
  return {
    ...doc,
    live: { ...doc.live, kineticistDefenseBurn: n > 0 ? n : undefined },
  };
}

/** Shape Shroud of Water into an armor bonus or a shield bonus (a standard action at the table). */
export function setKineticistShroudMode(doc: CharacterDoc, mode: "armor" | "shield"): CharacterDoc {
  return {
    ...doc,
    live: { ...doc.live, kineticistShroudMode: mode === "shield" ? "shield" : undefined },
  };
}

/**
 * Drop the defense's burn investment, for a rest. Every defense's boost lasts
 * "until the next time your burn is removed", so the counter can't survive
 * the rest that empties the pool and silently re-apply the next time burn is
 * accepted.
 */
export function clearKineticistDefenseBurn(doc: CharacterDoc): CharacterDoc {
  if (doc.live.kineticistDefenseBurn === undefined) return doc;
  return { ...doc, live: { ...doc.live, kineticistDefenseBurn: undefined } };
}

/* --------------------------------------------------------- blast loadout */

/**
 * The loadout is per-ACTIVATION state, so every setter here normalizes an
 * empty result back to `undefined`: clearing the last pick has to leave the
 * document indistinguishable from one that never had a loadout, or a stale
 * empty object would keep the tracker's panel looking armed.
 */
function withLoadout(doc: CharacterDoc, next: KineticistBlastLoadout): CharacterDoc {
  const empty =
    !next.form && !next.substance && !next.gatherPower && (next.metakinesis ?? []).length === 0;
  return { ...doc, live: { ...doc.live, kineticistBlastLoadout: empty ? undefined : next } };
}

/** Pick (or clear, passing `null`) the form or substance infusion shaping the blast. */
export function setKineticistBlastInfusion(
  doc: CharacterDoc,
  slot: "form" | "substance",
  talentId: string | null,
): CharacterDoc {
  const trimmed = typeof talentId === "string" ? talentId.trim() : "";
  return withLoadout(doc, {
    ...doc.live.kineticistBlastLoadout,
    [slot]: trimmed.length > 0 ? trimmed : undefined,
  });
}

/** Set (or clear, passing `null`) how long she spent gathering power. */
export function setKineticistGatherPower(
  doc: CharacterDoc,
  mode: KineticistGatherPowerMode | null,
): CharacterDoc {
  return withLoadout(doc, {
    ...doc.live.kineticistBlastLoadout,
    gatherPower: mode ?? undefined,
  });
}

/** Add or remove one Metakinesis option. */
export function toggleKineticistMetakinesis(
  doc: CharacterDoc,
  option: KineticistMetakinesisOption,
): CharacterDoc {
  const current = doc.live.kineticistBlastLoadout?.metakinesis ?? [];
  const next = current.includes(option)
    ? current.filter((o) => o !== option)
    : [...current, option];
  return withLoadout(doc, {
    ...doc.live.kineticistBlastLoadout,
    metakinesis: next.length > 0 ? next : undefined,
  });
}

/**
 * Drop the whole loadout. Every part of it is a choice made fresh for each
 * blast, so getting back to a bare blast has to be one action rather than
 * four.
 */
export function clearKineticistBlastLoadout(doc: CharacterDoc): CharacterDoc {
  if (doc.live.kineticistBlastLoadout === undefined) return doc;
  return { ...doc, live: { ...doc.live, kineticistBlastLoadout: undefined } };
}

/**
 * Whether a wild talent moves a real number, which is what the picker's "M"
 * badge means everywhere in this app. Three ways it can: an unconditional
 * `changes[]`, a structured effect that rewrites a blast line when the talent
 * is loaded as an infusion, or a blast-scoped effect the engine applies from
 * the picked-talent list directly.
 */
export function talentMovesNumbers(talentId: string): boolean {
  return (
    (KINETICIST_WILD_TALENTS[talentId]?.changes?.length ?? 0) > 0 ||
    INFUSION_BLAST_EFFECTS[talentId] !== undefined ||
    BLAST_SCOPED_WILD_TALENT_IDS.has(talentId)
  );
}

export interface KineticistInfusionOption {
  id: string;
  name: string;
  burn: number;
}

/**
 * The infusions the character knows, split by slot, for the loadout menus.
 * A vendored-only infusion carries no form/substance split (the published
 * prose labels only a handful), so it is offered in BOTH menus rather than
 * being hidden from the one it belongs in.
 */
export function knownKineticistInfusions(
  doc: CharacterDoc,
  refData: RefData,
  slot: "form" | "substance",
): KineticistInfusionOption[] {
  return (doc.build.kineticistWildTalents ?? [])
    .flatMap((id) => {
      const talent = resolveKineticistWildTalent(id, refData);
      if (!talent || talent.category !== "infusion") return [];
      const handAuthored = KINETICIST_WILD_TALENTS[id];
      if (handAuthored && handAuthored.kind !== slot) return [];
      return [{ id, name: talent.name, burn: talent.burn }];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------------------------------------------------------- wild talents */

export function hasKineticistWildTalent(doc: CharacterDoc, id: string): boolean {
  return (doc.build.kineticistWildTalents ?? []).includes(id);
}

/** Add or remove a wild talent id. No-op add if already present (no duplicates). */
export function toggleKineticistWildTalent(doc: CharacterDoc, talentId: string): CharacterDoc {
  const current = doc.build.kineticistWildTalents ?? [];
  const has = current.includes(talentId);
  const kineticistWildTalents = has
    ? current.filter((t) => t !== talentId)
    : [...current, talentId];
  return { ...doc, build: { ...doc.build, kineticistWildTalents } };
}

/**
 * How many CHOSEN talent ids resolve to the given category (unresolvable/
 * stale ids don't count) — resolves against BOTH the hand-authored table AND
 * the vendored catalog's infusion/utility subset, so a vendored-only pick
 * counts towards its own budget too.
 */
export function chosenKineticistTalentCount(
  doc: CharacterDoc,
  refData: RefData,
  category: "infusion" | "utility",
): number {
  return (doc.build.kineticistWildTalents ?? []).filter(
    (id) => resolveKineticistWildTalent(id, refData)?.category === category,
  ).length;
}

const INFUSION_LEVELS: readonly number[] = [1, 3, 5, 9, 11, 13, 17, 19];
const UTILITY_LEVELS: readonly number[] = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];

export function expectedKineticistTalentCount(
  doc: CharacterDoc,
  category: "infusion" | "utility",
): number {
  const level = kineticistLevel(doc);
  if (level <= 0) return 0;
  const thresholds = category === "infusion" ? INFUSION_LEVELS : UTILITY_LEVELS;
  return thresholds.filter((t) => level >= t).length;
}

export function kineticistTalentsNeedWarning(
  doc: CharacterDoc,
  refData: RefData,
  category: "infusion" | "utility",
): boolean {
  return (
    chosenKineticistTalentCount(doc, refData, category) >
    expectedKineticistTalentCount(doc, category)
  );
}

/**
 * True when `talentId` is above the effective-level gate for the character's
 * current kineticist level (soft warning only — see file doc comment). False
 * (never "below level") for an unresolvable id. Resolves against both the
 * hand-authored table and the vendored catalog — the vendored `level` field IS
 * a real level gate for this subsystem, unlike rage powers' (see
 * `KineticWildTalent.level`'s doc comment).
 */
export function kineticistTalentBelowLevel(
  doc: CharacterDoc,
  refData: RefData,
  talentId: string,
): boolean {
  const talent = resolveKineticistWildTalent(talentId, refData);
  if (!talent) return false;
  const level = kineticistLevel(doc);
  if (level <= 0) return false;
  return level < minKineticistLevelForTalent(talent.level);
}
