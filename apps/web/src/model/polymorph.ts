/**
 * Pure polymorph-form transitions (issue #70): entering/ending a Wild Shape
 * (or Beast Shape/Elemental Body/Plant Shape spell) transformation, editing
 * the form's free-text label/notes, and the player-entered natural-attack
 * lines — see `@pf1/engine` `polymorph.ts` for the tier/size/element table
 * and the attack-bonus math, and `CharacterDoc.live.activeForm`'s doc
 * comment for the schema shape.
 *
 * No separate `build.*` half (unlike `model/companion.ts`/`model/familiar.ts`):
 * a form has no standing configuration to persist between activations, so —
 * like `model/buffs.ts`'s `activeBuffs` — every transition here operates
 * directly on `live.activeForm`, entered fresh each time.
 */

import {
  POLYMORPH_TIER_IDS,
  POLYMORPH_TIERS,
  wildShapeTiersForLevel,
  type PolymorphFormOption,
  type PolymorphTier,
} from "@pf1/engine";
import type {
  ActiveForm,
  ActiveFormNaturalAttack,
  CharacterDoc,
  RefData,
  SizeId,
} from "@pf1/schema";

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

/** Human-readable label for a {@link SizeId}, e.g. "huge" -> "Huge". */
export function sizeLabel(size: SizeId): string {
  return SIZE_LABELS[size] ?? size;
}

/** The character's druid class level (0 for a non-druid). */
export function druidLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "druid")?.level ?? 0;
}

/** Wild Shape's currently-available polymorph tiers for a druid (empty for a non-druid or below 4th level). */
export function wildShapeTiers(doc: CharacterDoc): PolymorphTier[] {
  return wildShapeTiersForLevel(druidLevel(doc));
}

/**
 * A known spell counts as a polymorph source when its name starts with one of
 * these — matching the tier families in `@pf1/engine`'s polymorph table
 * (Beast Shape I-IV, Elemental Body I-IV, Plant Shape I-III). Matched on the
 * spell's NAME rather than its compendium id because the id is opaque.
 */
const POLYMORPH_SPELL_PREFIXES = ["beast shape", "elemental body", "plant shape"];

/** Every spell id the document knows, across the primary list and every per-class list. */
function allKnownSpellIds(doc: CharacterDoc): string[] {
  const byClass = Object.values(doc.build.spells.byClass ?? {}).flatMap((b) => b.known);
  return [...doc.build.spells.known, ...byClass];
}

/** Whether the character knows/has prepared any polymorph-family spell. */
export function hasPolymorphSpell(doc: CharacterDoc, refData: RefData): boolean {
  return allKnownSpellIds(doc).some((id) => {
    const name = refData.spells[id]?.name.toLowerCase();
    return name !== undefined && POLYMORPH_SPELL_PREFIXES.some((p) => name.startsWith(p));
  });
}

/**
 * Whether to offer the tracker's Polymorph / Wild Shape panel at all. Most
 * characters never transform, so the panel is hidden unless the character has
 * a source for it — or is transformed right now, which must never become
 * unreachable (e.g. the setting is flipped off mid-form).
 *
 * `settings.polymorphEnabled` overrides the detection in both directions; see
 * its schema doc comment.
 */
export function polymorphPanelVisible(doc: CharacterDoc, refData: RefData): boolean {
  if (doc.live.activeForm) return true;
  const setting = doc.build.settings?.polymorphEnabled;
  if (setting !== undefined) return setting;
  if (wildShapeTiers(doc).length > 0) return true;
  if (doc.identity.classes.some((c) => c.tag === "shifter")) return true;
  return hasPolymorphSpell(doc, refData);
}

/** Every polymorph tier id — for a non-druid source (a spell) that picks a tier directly. */
export function allPolymorphTiers(): readonly PolymorphTier[] {
  return POLYMORPH_TIER_IDS;
}

/** Display name for a tier id, e.g. "beastShapeIII" -> "Beast Shape III". Falls back to the raw id if unknown. */
export function polymorphTierName(tier: string): string {
  return POLYMORPH_TIERS[tier as PolymorphTier]?.name ?? tier;
}

/** Every size/creature-type/element row `tier`'s menu offers (empty for an unknown tier id). */
export function polymorphFormOptions(tier: string): readonly PolymorphFormOption[] {
  return POLYMORPH_TIERS[tier as PolymorphTier]?.options ?? [];
}

/** Stable key for one `PolymorphFormOption`, for use as a `<select>` value/React key. */
export function formOptionKey(
  option: Pick<PolymorphFormOption, "creatureType" | "size" | "element">,
): string {
  return `${option.creatureType}:${option.size}:${option.element ?? ""}`;
}

export function currentActiveForm(doc: CharacterDoc): ActiveForm | undefined {
  return doc.live.activeForm;
}

/** Enter a new form, replacing any currently active one. */
export function startActiveForm(
  doc: CharacterDoc,
  form: Pick<ActiveForm, "tier" | "creatureType" | "size" | "element" | "formName">,
): CharacterDoc {
  return {
    ...doc,
    live: {
      ...doc.live,
      activeForm: {
        tier: form.tier,
        creatureType: form.creatureType,
        size: form.size,
        element: form.element,
        formName: form.formName.trim() || "Wild Shape form",
        naturalAttacks: [],
      },
    },
  };
}

/** End the current transformation, reverting to normal form. No-op if not currently transformed. */
export function endActiveForm(doc: CharacterDoc): CharacterDoc {
  if (!doc.live.activeForm) return doc;
  return { ...doc, live: { ...doc.live, activeForm: undefined } };
}

function updateActiveForm(doc: CharacterDoc, patch: Partial<ActiveForm>): CharacterDoc {
  const current = doc.live.activeForm;
  if (!current) return doc;
  return { ...doc, live: { ...doc.live, activeForm: { ...current, ...patch } } };
}

export function setActiveFormName(doc: CharacterDoc, formName: string): CharacterDoc {
  return updateActiveForm(doc, { formName });
}

export function setActiveFormNotes(doc: CharacterDoc, notes: string): CharacterDoc {
  return updateActiveForm(doc, { notes: notes || undefined });
}

export function addNaturalAttack(doc: CharacterDoc, attack: ActiveFormNaturalAttack): CharacterDoc {
  const current = doc.live.activeForm;
  if (!current) return doc;
  return updateActiveForm(doc, { naturalAttacks: [...(current.naturalAttacks ?? []), attack] });
}

export function updateNaturalAttack(
  doc: CharacterDoc,
  index: number,
  patch: Partial<ActiveFormNaturalAttack>,
): CharacterDoc {
  const current = doc.live.activeForm;
  const attacks = current?.naturalAttacks;
  if (!attacks || index < 0 || index >= attacks.length) return doc;
  return updateActiveForm(doc, {
    naturalAttacks: attacks.map((a, i) => (i === index ? { ...a, ...patch } : a)),
  });
}

export function removeNaturalAttack(doc: CharacterDoc, index: number): CharacterDoc {
  const current = doc.live.activeForm;
  const attacks = current?.naturalAttacks;
  if (!attacks || index < 0 || index >= attacks.length) return doc;
  return updateActiveForm(doc, { naturalAttacks: attacks.filter((_, i) => i !== index) });
}
