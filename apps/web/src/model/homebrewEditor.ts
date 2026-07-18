/**
 * Form-state <-> `Race`/`Feat`/`TraitDef` mapping for the homebrew authoring
 * UI (phase 2 of homebrew content support — see `model/homebrew.ts` for the
 * phase-1 doc-embedded storage + `RefData` overlay this builds on top of).
 *
 * Kept pure and DOM-free so the mapping (in particular the ability-modifier
 * encoding, which must match the vendored data bit-for-bit — see
 * `buildHomebrewRace`'s doc comment) is unit-testable without React.
 * Components (`components/builder/HomebrewRaceEditor.tsx`,
 * `HomebrewFeatEditor.tsx`, `HomebrewTraitEditor.tsx`) stay thin wrappers
 * around this module.
 */
import type { AbilityId, Feat, Race, SizeId, SkillId, TraitCategory, TraitDef } from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";

import { type ChangeDraft, changesToDrafts, draftsToChanges } from "./changeEditor.js";

export type AbilityMode = "flexible" | "fixed";

const SIZE_IDS: readonly SizeId[] = [
  "fine",
  "dim",
  "tiny",
  "sm",
  "med",
  "lg",
  "huge",
  "grg",
  "col",
];
const SIZE_LABELS: Record<SizeId, string> = {
  fine: "Fine",
  dim: "Diminutive",
  tiny: "Tiny",
  sm: "Small",
  med: "Medium",
  lg: "Large",
  huge: "Huge",
  grg: "Gargantuan",
  col: "Colossal",
};

/** Size picker options, smallest to largest. */
export const SIZE_OPTIONS: readonly { id: SizeId; label: string }[] = SIZE_IDS.map((id) => ({
  id,
  label: SIZE_LABELS[id],
}));

/** A movement mode other than land, e.g. `{ mode: "fly", value: 40 }`. */
export interface SpeedDraft {
  mode: string;
  value: number;
}

export interface HomebrewRaceDraft {
  name: string;
  size: SizeId;
  landSpeed: number;
  otherSpeeds: SpeedDraft[];
  languages: string[];
  creatureType: string;
  creatureSubtypes: string[];
  classSkills: SkillId[];
  abilityMode: AbilityMode;
  /** Fixed-mode only; a missing/0 entry means "no change for this ability". */
  abilityMods: Partial<Record<AbilityId, number>>;
  extraChanges: ChangeDraft[];
}

/** A fresh race draft: flexible +2 (Human-style), Medium, 30 ft land speed. */
export function emptyHomebrewRaceDraft(): HomebrewRaceDraft {
  return {
    name: "",
    size: "med",
    landSpeed: 30,
    otherSpeeds: [],
    languages: ["common"],
    creatureType: "humanoid",
    creatureSubtypes: [],
    classSkills: [],
    abilityMode: "flexible",
    abilityMods: {},
    extraChanges: [],
  };
}

/** Reconstructs an editable draft from an existing homebrew `Race`, for the edit form. */
export function raceToDraft(race: Race): HomebrewRaceDraft {
  const isAbility = (target: string): target is AbilityId =>
    (ABILITY_IDS as readonly string[]).includes(target);
  const abilityChanges = race.changes.filter((c) => isAbility(c.target));
  const extraChanges = race.changes.filter((c) => !isAbility(c.target));
  const abilityMods: Partial<Record<AbilityId, number>> = {};
  for (const c of abilityChanges) abilityMods[c.target as AbilityId] = Number(c.formula) || 0;

  const { land, ...otherSpeedEntries } = race.speeds;
  return {
    name: race.name,
    size: race.size,
    landSpeed: land ?? 30,
    otherSpeeds: Object.entries(otherSpeedEntries).map(([mode, value]) => ({ mode, value })),
    languages: [...race.languages],
    creatureType: race.creatureTypes[0] ?? "humanoid",
    creatureSubtypes: [...race.creatureSubtypes],
    classSkills: [...(race.classSkills ?? [])],
    abilityMode: abilityChanges.length > 0 ? "fixed" : "flexible",
    abilityMods,
    extraChanges: changesToDrafts(extraChanges),
  };
}

export type BuildResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Builds a `Race` from a draft, under `id` (use {@link homebrewId} for new
 * entries — the caller owns id assignment since it's also the `RefData.races`
 * map key `upsertHomebrewRace` stores under).
 *
 * Ability-modifier encoding (fixed mode) is deliberately bit-for-bit
 * identical to how the vendored data encodes a fixed-mod race (verified
 * against Elf in `packages/data-pipeline/data/races.json`: `{ formula: "2",
 * target: "int", type: "racial" }`, no `operator`) — the engine's
 * `raceGrantsFlexibleAbility` heuristic (`@pf1/engine` `tables.ts`) treats
 * ANY race with no ability-targeting change as flexible-+2, so an
 * intentionally-fixed race must emit real ability changes or it silently
 * becomes flexible instead.
 */
export function buildHomebrewRace(id: string, draft: HomebrewRaceDraft): BuildResult<Race> {
  const name = draft.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const speeds: Record<string, number> = { land: Math.max(0, Math.round(draft.landSpeed) || 0) };
  for (const { mode, value } of draft.otherSpeeds) {
    const trimmedMode = mode.trim();
    if (trimmedMode && value > 0) speeds[trimmedMode] = Math.round(value);
  }

  const abilityChanges =
    draft.abilityMode === "fixed"
      ? ABILITY_IDS.filter((a) => draft.abilityMods[a]).map((a) => ({
          formula: String(draft.abilityMods[a]),
          target: a,
          type: "racial",
        }))
      : [];

  const race: Race = {
    id,
    uuid: id,
    name,
    size: draft.size,
    speeds,
    languages: draft.languages.map((l) => l.trim()).filter((l) => l.length > 0),
    creatureTypes: [draft.creatureType.trim() || "humanoid"],
    creatureSubtypes: draft.creatureSubtypes.map((s) => s.trim()).filter((s) => s.length > 0),
    changes: [...abilityChanges, ...draftsToChanges(draft.extraChanges)],
    contextNotes: [],
    ...(draft.classSkills.length > 0 ? { classSkills: draft.classSkills } : {}),
  };
  return { ok: true, value: race };
}

/* ------------------------------------------------------------------- feats -- */

export interface HomebrewFeatDraft {
  name: string;
  /** Plain text; converted to a minimal HTML description via {@link textToDescriptionHtml}. */
  description: string;
  /** Verbatim prose -> `Feat.prerequisites.prereqText` — soft-warning only, never hard-blocks. */
  prereqText: string;
  /** One `FEAT_CATEGORIES` tag, or "" for none. */
  category: string;
  changes: ChangeDraft[];
}

export function emptyHomebrewFeatDraft(): HomebrewFeatDraft {
  return { name: "", description: "", prereqText: "", category: "", changes: [] };
}

/** Reconstructs an editable draft from an existing homebrew `Feat`, for the edit form. */
export function featToDraft(feat: Feat): HomebrewFeatDraft {
  return {
    name: feat.name,
    description: descriptionHtmlToText(feat.description),
    prereqText: feat.prerequisites.prereqText ?? "",
    category: feat.tags[0] ?? "",
    changes: changesToDrafts(feat.changes ?? []),
  };
}

export function buildHomebrewFeat(id: string, draft: HomebrewFeatDraft): BuildResult<Feat> {
  const name = draft.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const feat: Feat = {
    id,
    uuid: id,
    name,
    subType: "feat",
    tags: draft.category ? [draft.category] : [],
    description: textToDescriptionHtml(draft.description),
    prerequisites: {
      abilities: [],
      feats: [],
      skills: [],
      prereqText: draft.prereqText.trim() || undefined,
    },
    changes: draftsToChanges(draft.changes),
  };
  return { ok: true, value: feat };
}

/* ------------------------------------------------------------------ traits -- */

export interface HomebrewTraitDraft {
  name: string;
  category: TraitCategory;
  /** Plain text — rendered as-is (not HTML), matching how vendored `TraitDef.summary` renders. */
  summary: string;
  changes: ChangeDraft[];
}

/** A fresh trait draft; category defaults to the first of the four ("Combat"). */
export function emptyHomebrewTraitDraft(): HomebrewTraitDraft {
  return { name: "", category: "Combat", summary: "", changes: [] };
}

/** Reconstructs an editable draft from an existing homebrew `TraitDef`, for the edit form. */
export function traitToDraft(trait: TraitDef): HomebrewTraitDraft {
  return {
    name: trait.name,
    category: trait.category,
    summary: trait.summary,
    changes: changesToDrafts(trait.changes),
  };
}

export function buildHomebrewTrait(id: string, draft: HomebrewTraitDraft): BuildResult<TraitDef> {
  const name = draft.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const trait: TraitDef = {
    id,
    name,
    category: draft.category,
    summary: draft.summary.trim(),
    changes: draftsToChanges(draft.changes),
  };
  return { ok: true, value: trait };
}

/* --------------------------------------------------------- description HTML -- */

/**
 * Every vendored `RefEntity.description` is HTML rendered via
 * `dangerouslySetInnerHTML` (`FeatDetail`/`FeatureDescription`) — a homebrew
 * feat's author-entered plain text goes through the same rendering path, so
 * it must be escaped first (this is the *local* player's own content, but
 * "trust the current user's textarea" is still worth avoiding when the
 * output feeds `dangerouslySetInnerHTML`). Blank lines split paragraphs;
 * single newlines become `<br>`. Returns `undefined` for empty input,
 * matching `RefEntity.description`'s optional/absent-when-none convention.
 */
export function textToDescriptionHtml(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return trimmed
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** Inverse of {@link textToDescriptionHtml}, for populating the edit form's textarea. */
export function descriptionHtmlToText(html: string | undefined): string {
  if (!html) return "";
  return unescapeHtml(
    html
      .replace(/<\/p>\s*<p>/gi, "\n\n")
      .replace(/<\/?p>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n"),
  ).trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
