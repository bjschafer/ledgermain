import type { Change, ContextNote, SourceRef } from "@pf1/schema";

import { resolveFoundryMarkup } from "../util/html.js";

/** Looks up a compendium doc's name from its `Compendium.pf1.<pack>.Item.<id>` uuid. */
export type UuidResolver = (uuid: string) => string | undefined;

/**
 * Foundry stores collections (changes, contextNotes, actions) as objects keyed by
 * random ids rather than arrays. These helpers normalize them to arrays while
 * dropping the internal keys we don't need, and tolerate missing/legacy shapes.
 */

type Dict = Record<string, unknown>;

function asRecordArray(value: unknown): Dict[] {
  if (Array.isArray(value)) return value.filter(isDict);
  if (isDict(value)) return Object.values(value).filter(isDict);
  return [];
}

function isDict(v: unknown): v is Dict {
  return typeof v === "object" && v !== null;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function normalizeChanges(value: unknown): Change[] {
  return asRecordArray(value)
    .map((c) => ({
      formula: String(c.formula ?? ""),
      target: normalizeSkillTarget(String(c.target ?? "")),
      type: String(c.type ?? "untyped"),
      // Only "set" is a meaningful departure from the default additive
      // behavior, so omit the field entirely otherwise (keeps the vendored
      // JSON minimal — see Change's doc comment for semantics).
      ...(c.operator === "set" ? { operator: "set" as const } : {}),
    }))
    .filter((c) => c.target !== "");
}

/**
 * The complement of {@link normalizeChanges}: the changes it drops for having
 * no `target`. Almost everywhere that's malformed data and dropping is right,
 * but the `pf-racial-traits` pack leaves a target blank on purpose when the
 * trait says "choose one" — see `RacialTrait.openChanges` in `@pf1/schema`
 * and `transformRacialTrait`.
 */
export function normalizeUntargetedChanges(value: unknown): Change[] {
  return asRecordArray(value)
    .filter((c) => String(c.target ?? "") === "")
    .map((c) => ({
      formula: String(c.formula ?? ""),
      target: "",
      type: String(c.type ?? "untyped"),
      ...(c.operator === "set" ? { operator: "set" as const } : {}),
    }))
    .filter((c) => c.formula !== "");
}

export function normalizeContextNotes(value: unknown, resolveUuid: UuidResolver): ContextNote[] {
  return asRecordArray(value)
    .map((n) => ({
      target: normalizeSkillTarget(String(n.target ?? "")),
      text: resolveFoundryMarkup(String(n.text ?? ""), resolveUuid),
    }))
    .filter((n) => n.text !== "");
}

export function normalizeSources(value: unknown): SourceRef[] | undefined {
  const arr = asRecordArray(value)
    .map((s) => {
      const id = str(s.id);
      if (!id) return null;
      const pages = s.pages == null ? undefined : String(s.pages);
      return pages === undefined ? { id } : { id, pages };
    })
    .filter((s): s is SourceRef => s !== null);
  return arr.length > 0 ? arr : undefined;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/**
 * Foundry renamed its skill keys from three-letter ids to full names
 * (`kna` -> `knowledge.nature`) in class-skill lists and change targets, while
 * formulas kept `@skills.<short>`. Every saved CharacterDoc keys ranks by the
 * short id, so the pipeline maps back rather than letting the rename through.
 */
const LONG_SKILL_IDS: Readonly<Record<string, string>> = {
  acrobatics: "acr",
  appraise: "apr",
  artistry: "art",
  bluff: "blf",
  climb: "clm",
  craft: "crf",
  diplomacy: "dip",
  disableDevice: "dev",
  disguise: "dis",
  escapeArtist: "esc",
  handleAnimal: "han",
  heal: "hea",
  intimidate: "int",
  "knowledge.arcana": "kar",
  "knowledge.dungeoneering": "kdu",
  "knowledge.engineering": "ken",
  "knowledge.geography": "kge",
  "knowledge.history": "khi",
  "knowledge.local": "klo",
  "knowledge.nature": "kna",
  "knowledge.nobility": "kno",
  "knowledge.planes": "kpl",
  "knowledge.religion": "kre",
  linguistics: "lin",
  lore: "lor",
  perception: "per",
  perform: "prf",
  profession: "pro",
  ride: "rid",
  senseMotive: "sen",
  sleightOfHand: "slt",
  spellcraft: "spl",
  stealth: "ste",
  survival: "sur",
  swim: "swm",
  useMagicDevice: "umd",
};

/** Maps a Foundry skill key to its short id, keeping any subskill suffix (`craft.alchemy` -> `crf.alchemy`). */
export function normalizeSkillId(id: string): string {
  const whole = LONG_SKILL_IDS[id];
  if (whole) return whole;
  const dot = id.indexOf(".");
  if (dot < 0) return id;
  const base = LONG_SKILL_IDS[id.slice(0, dot)];
  return base ? `${base}${id.slice(dot)}` : id;
}

/** {@link normalizeSkillId} for a `skill.<id>` target; other targets pass through. */
export function normalizeSkillTarget(target: string): string {
  return target.startsWith("skill.") ? `skill.${normalizeSkillId(target.slice(6))}` : target;
}

/** A class-skill list with every id shortened, sorted by id as upstream shipped it before the rename. */
export function normalizeClassSkills(value: unknown): string[] {
  return asStringArray(value).map(normalizeSkillId).sort();
}

/**
 * Kebab-case slug for synthesizing stable ids from a display name (e.g.
 * "Dragon Disciple" -> "dragon-disciple"). Shared by the archetype and
 * prestige-class transforms, both of which mint their own non-Foundry id
 * scheme for third-party-module content.
 */
export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Best-effort "at the Nth level" scrape for a feature description with no
 * structured level field — the source data (archetype and prestige-class
 * features alike) doesn't always itemize which class level grants a feature,
 * so this falls back to reading it off the feature's own prose. Defaults to
 * 1 when no such phrase is found.
 */
export function guessLevelFromProse(description: string | undefined): number {
  const m = /\b(\d+)(?:st|nd|rd|th)\s+level\b/i.exec(description ?? "");
  return m ? Number(m[1]) : 1;
}

/**
 * Extracts a doc's description and resolves Foundry's enrichers and inline
 * rolls to plain text (see {@link resolveFoundryMarkup}), so raw authoring
 * syntax never leaks into the rendered sheet.
 */
export function descriptionValue(
  sys: Record<string, unknown>,
  resolveUuid: UuidResolver,
): string | undefined {
  const d = sys.description as Record<string, unknown> | undefined;
  // `unidentified` is Foundry's pre-identification blurb and `value` the real
  // one, so `value` wins wherever both exist. But the pack rewrite that landed
  // after v11.11 moved 1,392 items' only description into `unidentified` and
  // left `value` unset — torches and bedrolls, but magic items too, and the
  // text there is the published rule verbatim rather than a decoy. This app has
  // no identification mechanic to hide anything from, so falling back is purely
  // a matter of not throwing away the only description an item has.
  const text = typeof d?.value === "string" && d.value !== "" ? d.value : d?.unidentified;
  return typeof text === "string" && text !== ""
    ? resolveFoundryMarkup(text, resolveUuid)
    : undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * Foundry stores weight as `{ value: number }` (armors, weapons, items all
 * share this shape). Extracts the plain number, or `undefined` when absent.
 */
export function readWeight(value: unknown): number | undefined {
  if (!isDict(value)) return undefined;
  return asNumber(value.value);
}

/** Coins per gold piece, for the `price.unit` denominations the packs use. */
const COINS_PER_GP: Record<string, number> = { gp: 1, sp: 10, cp: 100 };

/**
 * Foundry stores price as `{ base: number, unit: "gp" | "sp" | "cp" }`. It was
 * a bare gp number until the pack rewrite that landed after the v11.11 tag,
 * and the bare form is still accepted here so the reader does not depend on
 * which side of that change a pin sits on.
 *
 * Always returns **gold pieces**, converting the silver and copper entries
 * (361 of them, all mundane gear) rather than carrying the unit downstream —
 * every consumer of `price` treats it as gp, and a bare `base` would have
 * silently overcharged a 4 cp cup of tea by 100x. An unrecognized unit throws
 * rather than guessing, since guessing is how the 100x would come back.
 */
export function readPrice(value: unknown): number | undefined {
  if (typeof value === "number" || typeof value === "string") return asNumber(value);
  if (!isDict(value)) return undefined;
  const base = asNumber(value.base);
  if (base == null) return undefined;
  const unit = value.unit === undefined ? "gp" : value.unit;
  if (typeof unit !== "string" || COINS_PER_GP[unit] === undefined) {
    throw new Error(`[transform] unknown price unit ${JSON.stringify(unit)} (base ${base})`);
  }
  return base / COINS_PER_GP[unit]!;
}

/**
 * Limited-use resource shape shared by class features and items: a formula
 * for the max ("5 + @abilities.wis.mod") and a recharge period ("day",
 * "charges", "single", ...). Foundry tracks a live `value` too, but that's
 * current-use state, not reference data, so it's intentionally dropped here.
 *
 * `source` (class features only, in practice) names another class feature's
 * `tag` whose pool this one draws from instead of having its own daily cap
 * (e.g. Channel Positive Energy's `source: "layOnHands"`) — captured
 * whenever present, alongside or instead of `maxFormula`.
 */
export function normalizeUses(
  value: unknown,
): { maxFormula?: string; per?: string; source?: string } | undefined {
  if (!isDict(value)) return undefined;
  const maxFormula = str(value.maxFormula);
  const per = str(value.per);
  const source = str(value.source);
  return maxFormula !== undefined || per !== undefined || source !== undefined
    ? { maxFormula, per, source }
    : undefined;
}
