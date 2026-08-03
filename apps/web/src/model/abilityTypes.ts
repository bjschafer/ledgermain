/**
 * The (Ex)/(Su)/(Sp) tag every printed PF1 statblock carries on a class
 * feature, from `RefData.classFeatures[...].abilityType`.
 *
 * It's a display tag with real table consequences, which is why it's worth a
 * tooltip rather than a bare suffix: a supernatural ability switches off in an
 * antimagic field, a spell-like one provokes and can be counterspelled,
 * dispelled, or stopped by spell resistance, and an extraordinary one is none
 * of those.
 *
 * Roughly a quarter of the vendored feature entries carry no `abilityType` at
 * all. Those resolve to `null` and render nothing: an untagged feature is
 * unknown, never assumed extraordinary.
 */

export type AbilityTypeCode = "ex" | "su" | "sp";

export interface AbilityTypeTagInfo {
  code: AbilityTypeCode;
  /** Statblock abbreviation, rendered in parentheses: "Ex", "Su", "Sp". */
  label: string;
  /** What the tag changes at the table, one line. */
  tip: string;
}

const TAGS: Record<AbilityTypeCode, AbilityTypeTagInfo> = {
  ex: {
    code: "ex",
    label: "Ex",
    tip: "Extraordinary: not magical. It still works in an antimagic field, and it cannot be dispelled or counterspelled.",
  },
  su: {
    code: "su",
    label: "Su",
    tip: "Supernatural: magical, but not a spell. It stops working in an antimagic field. Spell resistance, counterspells, and dispel magic do not affect it.",
  },
  sp: {
    code: "sp",
    label: "Sp",
    tip: "Spell-like: works like a spell. It provokes attacks of opportunity, can be counterspelled or dispelled, and spell resistance applies.",
  },
};

/** Resolves a raw `abilityType` value; `null` for absent or unrecognized ones. */
export function abilityTypeTag(raw: string | undefined | null): AbilityTypeTagInfo | null {
  if (!raw) return null;
  return TAGS[raw.toLowerCase() as AbilityTypeCode] ?? null;
}

/** The parenthesized suffix for a raw `abilityType`, e.g. "(Su)"; `null` when untagged. */
export function abilityTypeSuffix(raw: string | undefined | null): string | null {
  const tag = abilityTypeTag(raw);
  return tag ? `(${tag.label})` : null;
}
