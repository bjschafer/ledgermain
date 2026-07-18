import { formatDiceFormula, tryEvaluateFormula } from "@pf1/engine";
import type { Spell, SpellAction } from "@pf1/schema";

/**
 * Display-formatting for a spell's at-the-table facts — range, area/target,
 * duration, components, and damage — resolved against a concrete caster level
 * so `@cl`-scaled values (`medium` range, `@cl`-round durations, `(min(10,
 * @cl))d6` damage) show a real number instead of a formula.
 *
 * This is the counterpart to the DC/concentration math in `spellcasting.ts`:
 * everything here reads straight off the vendored spell data (`SpellAction`'s
 * `range`/`duration`/`area`/`damage`, plus `Spell.components`), which the
 * tracker's `SpellDetail` had until now left unshown.
 *
 * Caller convention (mirrors `spellSave` in `SpellDetail`): range, area, and
 * duration come from the FIRST action that carries the field — a spell's
 * `actions` are cast variants (heal-living vs. harm-undead, ranged vs. melee),
 * and the primary variant leads.
 */

/**
 * `tryEvaluateFormula`/`formatDiceFormula` only swallow a {@link DiceTermError};
 * a genuine parse error still throws (the engine keeps that surfacing for its
 * own callers). But spell `range`/`duration`/`damage` fields carry prose the
 * DSL was never meant to parse — `"1 hour/level; see text"`, `"concentration"`,
 * `"1d8 + 11[Strength]"` — so display formatting must treat an unparseable
 * value as "unresolvable", never let it crash the sheet. These wrap both calls
 * to return null on ANY error.
 */
function safeEvaluate(src: string, cl: number): number | null {
  try {
    return tryEvaluateFormula(src, { cl });
  } catch {
    return null;
  }
}

function safeDice(src: string, cl: number): string | null {
  try {
    return formatDiceFormula(src, { cl });
  } catch {
    return null;
  }
}

/** The first action for which `pick` returns a value, else undefined. */
function firstActionWith<T>(
  spell: Spell,
  pick: (a: SpellAction) => T | undefined | null,
): T | undefined {
  for (const action of spell.actions) {
    const v = pick(action);
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

/**
 * PF1 range bands scale with caster level: close = 25 ft. + 5 ft./2 levels,
 * medium = 100 ft. + 10 ft./level, long = 400 ft. + 40 ft./level. Resolved to
 * a concrete distance for `cl`.
 */
function bandRangeFeet(units: string, cl: number): number | null {
  switch (units) {
    case "close":
      return 25 + 5 * Math.floor(cl / 2);
    case "medium":
      return 100 + 10 * cl;
    case "long":
      return 400 + 40 * cl;
    default:
      return null;
  }
}

const BAND_LABEL: Record<string, string> = { close: "Close", medium: "Medium", long: "Long" };

/**
 * Human range for the spell's primary action, e.g. `"Medium (140 ft.)"`,
 * `"Touch"`, `"30 ft."`, `"Personal"`. `null` when the data carries no range.
 */
export function formatSpellRange(spell: Spell, cl: number): string | null {
  const range = firstActionWith(spell, (a) => a.range);
  if (!range?.units) return null;
  const { units, value } = range;

  const bandFeet = bandRangeFeet(units, cl);
  if (bandFeet !== null) return `${BAND_LABEL[units]} (${bandFeet} ft.)`;

  switch (units) {
    case "touch":
      return "Touch";
    case "personal":
      return "Personal";
    case "melee":
      return "Melee";
    case "reach":
      return "Reach";
    case "unlimited":
      return "Unlimited";
    case "seeText":
    case "spec":
      return value?.trim() ? value.trim() : "See text";
    case "ft":
    case "mi": {
      const unitLabel = units === "mi" ? "mi." : "ft.";
      const n = value !== undefined ? safeEvaluate(value, cl) : null;
      if (n !== null) return `${n} ${unitLabel}`;
      return value?.trim() ? `${value.trim()} ${unitLabel}` : unitLabel;
    }
    default:
      return value?.trim() ? value.trim() : units;
  }
}

/** Area / target text for the spell's primary action, verbatim. `null` if absent. */
export function formatSpellArea(spell: Spell): string | null {
  const area = firstActionWith(spell, (a) => a.area);
  return area?.trim() ? area.trim() : null;
}

const DURATION_UNIT: Record<string, [singular: string, plural: string]> = {
  round: ["round", "rounds"],
  minute: ["minute", "minutes"],
  hour: ["hour", "hours"],
  day: ["day", "days"],
  week: ["week", "weeks"],
  month: ["month", "months"],
};

/**
 * Human duration for the spell's primary action, e.g. `"4 rounds"` (from
 * `{units:"round", value:"@cl"}` at CL 4), `"Instantaneous"`, or the verbatim
 * prose for `spec`/`seeText` values (`"1 minute/level (D) (see text)"`).
 */
export function formatSpellDuration(spell: Spell, cl: number): string | null {
  const duration = firstActionWith(spell, (a) => a.duration);
  if (!duration?.units) return null;
  const { units, value } = duration;

  switch (units) {
    case "inst":
      return "Instantaneous";
    case "perm":
      return "Permanent";
    case "seeText":
    case "spec":
      return value?.trim() ? value.trim() : "See text";
  }

  const labels = DURATION_UNIT[units];
  if (!labels) return value?.trim() ? value.trim() : units;
  if (value === undefined) return labels[1];
  const n = safeEvaluate(value, cl);
  if (n === null) return `${value.trim()} ${labels[1]}`;
  return `${n} ${n === 1 ? labels[0] : labels[1]}`;
}

/** Component shorthand, e.g. `"V, S, M"`. `null` when the spell lists none. */
export function formatSpellComponents(spell: Spell): string | null {
  const c = spell.components;
  const parts: string[] = [];
  if (c.verbal) parts.push("V");
  if (c.somatic) parts.push("S");
  if (c.material) parts.push("M");
  if (c.focus) parts.push("F");
  if (c.divineFocus) parts.push("DF");
  return parts.length > 0 ? parts.join(", ") : null;
}

export interface SpellDamage {
  /** Resolved dice/number for `cl`, e.g. `"4d6"`, `"1d8+4"`, `"1d4+1"`. */
  text: string;
  /** Damage types on this part, e.g. `["fire"]`, `["positive"]`. */
  types: string[];
}

/**
 * Damage for the spell's primary damaging action, resolved to `cl`: dice terms
 * stay symbolic while `@cl` and numeric parts are evaluated, so Fireball's
 * `(min(10,@cl))d6` shows `"4d6"` at CL 4 and Cure Light Wounds' `1d8 +
 * min(5,@cl)` shows `"1d8+4"`. A formula that carries no dice at all resolves
 * to its plain number; anything we can't resolve falls back to the raw
 * formula. `[]` when the spell deals no rolled damage.
 *
 * Only the damage FORMULA scales here — a spell whose effect multiplies
 * (Magic Missile's missile count, Scorching Ray's ray count) has that scaling
 * only in its prose, not the vendored formula, so its per-hit damage shows
 * (`"1d4+1"`) but not the multiplied total.
 */
export function spellDamageParts(spell: Spell, cl: number): SpellDamage[] {
  const parts = firstActionWith(spell, (a) =>
    a.damage?.parts.length ? a.damage.parts : undefined,
  );
  if (!parts) return [];
  const out: SpellDamage[] = [];
  for (const part of parts) {
    const formula = part.formula?.trim();
    if (!formula) continue;
    let text = safeDice(formula, cl);
    if (text === null) {
      const n = safeEvaluate(formula, cl);
      text = n !== null ? String(n) : formula;
    }
    out.push({ text, types: part.types });
  }
  return out;
}
