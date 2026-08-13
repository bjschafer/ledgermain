import type { DerivedClChecks, DerivedSpellDCs, ModifierComponent } from "@pf1/schema";

/**
 * Display folding for `DerivedSheet.spellDCs` / `DerivedSheet.clChecks` — the
 * engine resolves the bonus terms with provenance (`@pf1/engine`
 * `spell-dcs.ts`); this module turns them into the numbers and note strings
 * the spell chip, the details Save/SR rows, and the print sheet render. Pure
 * (no DOM), per the model-layer convention.
 */

export interface SpellDCAdjustment {
  /** Added to the spell's base `10 + spell level + ability mod` DC. */
  bonus: number;
  /** Provenance, e.g. "Spell Focus +1, Greater Spell Focus +1"; null when nothing applies. */
  detail: string | null;
}

const NO_ADJUSTMENT: SpellDCAdjustment = { bonus: 0, detail: null };

function componentDetail(components: ModifierComponent[]): string | null {
  const parts = components
    .filter((c) => c.applied && c.value !== 0)
    .map((c) => `${c.source} ${c.value > 0 ? "+" : ""}${c.value}`);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * The DC adjustment for one spell, by its vendored `Spell.school` tag
 * (`"evo"`, ...). A school with its own engine line already folds the
 * all-schools part in, so exactly one of the two is used — never a sum of
 * both. Zero-adjustment (including no `spellDCs` at all, i.e. every
 * character without a Spell Focus-family effect) returns `{0, null}`.
 */
export function spellDCAdjustment(
  spellDCs: DerivedSpellDCs | undefined,
  schoolTag: string | undefined,
): SpellDCAdjustment {
  if (!spellDCs) return NO_ADJUSTMENT;
  const school =
    schoolTag === undefined ? undefined : spellDCs.schools.find((s) => s.tag === schoolTag);
  if (school) return { bonus: school.bonus, detail: componentDetail(school.components) };
  if (spellDCs.all === 0) return NO_ADJUSTMENT;
  return { bonus: spellDCs.all, detail: componentDetail(spellDCs.allComponents) };
}

/** The bonus on caster level checks to overcome SR; 0 when none. */
export function srCheckBonus(clChecks: DerivedClChecks | undefined): number {
  return clChecks?.sr?.bonus ?? 0;
}

/** Provenance for the SR-check bonus, e.g. "Spell Penetration +2"; null when none. */
export function srCheckDetail(clChecks: DerivedClChecks | undefined): string | null {
  const sr = clChecks?.sr;
  if (!sr) return null;
  return componentDetail(sr.components);
}

/**
 * Per-school DC deltas for the print sheet's caster-block hint, e.g.
 * `["Evocation +1"]`, RELATIVE to a printed base DC that already folds the
 * all-schools bonus in (the print sheet adds `spellDCs.all` to every level's
 * DC column, since it applies to every spell). Empty when no school differs
 * from that base (the common case).
 */
export function spellDCSchoolDeltas(spellDCs: DerivedSpellDCs | undefined): string[] {
  if (!spellDCs) return [];
  const out: string[] = [];
  for (const s of spellDCs.schools) {
    const delta = s.bonus - spellDCs.all;
    if (delta === 0) continue;
    out.push(`${s.label} ${delta > 0 ? "+" : ""}${delta}`);
  }
  return out;
}
