/**
 * Damage-type and DR/energy-resistance qualifier vocabulary (clean-room from
 * the published PF1 rules — the vendored slice carries neither).
 *
 * Two related vocabularies live here because they have to agree:
 *
 *   - **Damage types** — what an incoming hit is made of. Not present in the
 *     vendored data at all: `weapons.json` carries `damageDice`/`critMult`/
 *     `weaponGroups` but no bludgeoning/piercing/slashing, and no upstream
 *     entity names an energy type as data. Hand-authored here, same posture
 *     as `tables.ts`.
 *   - **DR/ER qualifiers** — what *bypasses* a damage reduction, or which
 *     energy a resistance covers. Already this engine's own convention: no
 *     vendored content uses `dr`/`eres` change targets (see `defenses.ts`),
 *     so both sides of the eventual damage-vs-defenses match are ours to
 *     keep consistent.
 *
 * The type lattice is deliberately not flat. "Weapon" (physical damage of
 * unstated bludgeoning/piercing/slashing) is a first-class node rather than a
 * missing value, because it is *sufficient* to resolve the overwhelming
 * majority of real DR — DR/—, DR/adamantine, DR/silver, DR/cold iron,
 * DR/magic, DR/good all care only that the damage is physical. Only the
 * B/P/S-qualified entries (DR 5/bludgeoning and friends) need the subtype.
 * `unspecified` sits above both branches and means "not stated", against
 * which nothing should be applied automatically.
 *
 * Qualifier normalization exists because the same qualifier was reachable
 * under two spellings: hand-authored engine content emits `dr.cold-iron`
 * (kebab) while the web app's Change-authoring form offered `dr.coldIron`
 * (camel). `defenses.ts` grouped on the raw post-dot string, so a character
 * with both sources showed two DR seals instead of taking the single highest
 * — the exact stacking rule that module exists to enforce. Normalizing on
 * ingest also means older saved documents holding the camel spelling need no
 * migration: they resolve to the same canonical id on load.
 */

/** Which branch of the type lattice a damage type sits on. */
export type DamageCategory = "physical" | "energy" | "unspecified";

/**
 * A damage type. `weapon` is physical damage whose B/P/S subtype wasn't
 * stated; `unspecified` is damage whose nature wasn't stated at all.
 */
export type DamageTypeId =
  | "unspecified"
  | "weapon"
  | "bludgeoning"
  | "piercing"
  | "slashing"
  | "acid"
  | "cold"
  | "electricity"
  | "fire"
  | "sonic";

export interface DamageTypeDef {
  id: DamageTypeId;
  label: string;
  category: DamageCategory;
  /** Extra spellings that resolve to this type beyond prefixes of its own id. */
  aliases?: readonly string[];
}

/** Every damage type, in display order (unspecified, physical, then energy). */
export const DAMAGE_TYPES: readonly DamageTypeDef[] = [
  {
    id: "unspecified",
    label: "unspecified",
    category: "unspecified",
    aliases: ["untyped", "generic", "unknown"],
  },
  { id: "weapon", label: "weapon", category: "physical", aliases: ["physical", "phys", "bps"] },
  { id: "bludgeoning", label: "bludgeoning", category: "physical", aliases: ["blunt"] },
  { id: "piercing", label: "piercing", category: "physical" },
  { id: "slashing", label: "slashing", category: "physical" },
  { id: "acid", label: "acid", category: "energy" },
  { id: "cold", label: "cold", category: "energy", aliases: ["ice", "frost"] },
  {
    id: "electricity",
    label: "electricity",
    category: "energy",
    aliases: ["lightning", "electric", "shock"],
  },
  { id: "fire", label: "fire", category: "energy", aliases: ["flame", "burn"] },
  { id: "sonic", label: "sonic", category: "energy", aliases: ["thunder"] },
];

const BY_ID = new Map<string, DamageTypeDef>(DAMAGE_TYPES.map((d) => [d.id, d]));

/** Lookup by canonical id; `undefined` for anything not a `DamageTypeId`. */
export function damageType(id: string): DamageTypeDef | undefined {
  return BY_ID.get(id);
}

/** True for `weapon` and the three B/P/S subtypes — the types DR applies to. */
export function isPhysicalDamage(id: DamageTypeId): boolean {
  return BY_ID.get(id)?.category === "physical";
}

/** True for the five energy types — the types energy resistance applies to. */
export function isEnergyDamage(id: DamageTypeId): boolean {
  return BY_ID.get(id)?.category === "energy";
}

/**
 * Single-letter shorthand, curated rather than derived, because pure prefix
 * matching leaves the most useful letters ambiguous: `p` prefixes both
 * "piercing" and "physical", and `s` prefixes both "slashing" and "sonic".
 * Each letter here resolves to the reading that is far more common at a
 * table; the longer forms (`ph`, `so`) remain reachable by prefix and are
 * how you spell the other reading.
 */
const SHORTHAND: Record<string, DamageTypeId> = {
  b: "bludgeoning",
  p: "piercing",
  s: "slashing",
  w: "weapon",
  a: "acid",
  c: "cold",
  e: "electricity",
  f: "fire",
  u: "unspecified",
};

/**
 * Resolves a single word to a damage type: curated shorthand first, then any
 * id or alias the word is an unambiguous prefix of. Returns `undefined` when
 * the word matches nothing or prefixes more than one type, so an ambiguous
 * abbreviation surfaces as unparsed rather than as a silent wrong guess.
 */
export function resolveDamageWord(word: string): DamageTypeId | undefined {
  const w = word.trim().toLowerCase();
  if (!w) return undefined;

  const short = SHORTHAND[w];
  if (short) return short;

  const hits = new Set<DamageTypeId>();
  for (const def of DAMAGE_TYPES) {
    const spellings = [def.id, ...(def.aliases ?? [])];
    if (spellings.some((s) => s.startsWith(w))) hits.add(def.id);
  }
  return hits.size === 1 ? [...hits][0] : undefined;
}

/**
 * Alternate spellings that fold onto a different canonical qualifier. Kept
 * deliberately small: only spellings that unambiguously denote the same
 * bypass, never inference (no "holy" -> "good").
 */
const QUALIFIER_ALIASES: Record<string, string> = {
  "alchemical-silver": "silver",
  coldiron: "cold-iron",
};

/**
 * Canonical form for a DR bypass / energy-resistance qualifier: lowercased,
 * camelCase split, whitespace and underscores folded to single hyphens.
 * `"coldIron"`, `"Cold Iron"` and `"cold_iron"` all land on `"cold-iron"`.
 *
 * Unknown qualifiers pass through cleaned rather than being dropped — a
 * user-authored buff may name any bypass it likes, and silently discarding
 * one would lose a real defense off the sheet.
 */
export function normalizeQualifier(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  if (!cleaned) return raw.trim();
  return QUALIFIER_ALIASES[cleaned] ?? cleaned;
}

/** The no-bypass DR qualifier ("DR 5/—"), as emitted by `defenses.ts`. */
export const DR_NONE_QUALIFIER = "—";

/**
 * Display form for a canonical qualifier: `"cold-iron"` -> `"cold iron"`.
 * The no-bypass em dash is passed through untouched.
 */
export function qualifierLabel(qualifier: string): string {
  if (qualifier === DR_NONE_QUALIFIER) return qualifier;
  return qualifier.replace(/-/g, " ");
}
