/**
 * Pure, framework-agnostic transitions over a {@link CharacterDoc}. Every
 * function returns a NEW document (no mutation), so they are trivially unit-
 * testable without a DOM and safe to use as React state reducers. The builder UI
 * is a thin view over these; persistence (Dexie) and recompute (engine) live
 * elsewhere. Mirrors DESIGN.md §3.1.
 */
import type {
  AbilityId,
  ArmorRef,
  CharacterDoc,
  ElementalSchoolTag,
  ItemInstance,
  RefData,
  SkillId,
  WeaponInstance,
  WeaponRef,
  WizardSchoolTag,
  WornArmor,
} from "@pf1/schema";

import { normalizeWeaponGroup } from "@pf1/engine";

import { applyAbilitiesToWeapon, sanitizeAbilities } from "./abilities.js";
import { eligibleAdvancementTargets } from "./casterLevel.js";
import { localId } from "./ids.js";
import { applyMaterialToArmor, MATERIALS } from "./materials.js";
import { normalizeAlignmentCode, slugifySkillLabel } from "./names.js";
import { knownSpellsFor, setKnownSpellsFor, storedClassTag } from "./spellcasting.js";

const ABILITY_IDS: AbilityId[] = ["str", "dex", "con", "int", "wis", "cha"];

/** A fresh, valid level-0 document with default scores and no choices made. */
export function createEmptyDoc(id: string): CharacterDoc {
  return {
    schemaVersion: 2,
    id,
    ownerId: "local",
    version: 1,
    updatedAt: new Date().toISOString(),
    identity: { name: "New Adventurer", race: "", classes: [] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      clericDomains: [],
      archetypes: [],
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
      spells: { prepared: [] },
    },
  };
}

/**
 * Normalize a document loaded from persistence to the current shape. Older docs
 * stored `build.spells.prepared` (always empty/unused) and lacked `live.spells`;
 * this moves preparation to live state. v2 adds `build.clericDomains` and
 * `PreparedSpell.kind` (defaulting to `"normal"` for pre-existing entries —
 * domain slot support for clerics). Idempotent and non-destructive.
 */
export function migrateDoc(doc: CharacterDoc): CharacterDoc {
  const build = doc.build as typeof doc.build & {
    spells?: { known?: string[]; prepared?: unknown };
  };
  const known = build.spells?.known ?? [];
  let next = doc;
  let changed = false;

  if (!doc.live.spells) {
    next = { ...next, live: { ...next.live, spells: { prepared: [] } } };
    changed = true;
  }
  // Drop any legacy `build.spells.prepared`, keeping only `known`.
  if (build.spells && "prepared" in build.spells) {
    next = { ...next, build: { ...next.build, spells: { known } } };
    changed = true;
  }
  // v2: ensure `clericDomains` exists (default empty). No schemaVersion bump
  // here — the field is optional; this just backfills the canonical empty
  // array so downstream `includes` checks don't crash on older docs.
  if (!next.build.clericDomains) {
    next = { ...next, build: { ...next.build, clericDomains: [] } };
    changed = true;
  }
  // Same treatment for `archetypes` (Stage 11.3) — optional, backfilled to `[]`.
  if (!next.build.archetypes) {
    next = { ...next, build: { ...next.build, archetypes: [] } };
    changed = true;
  }
  // `PreparedSpell.kind` is optional and defaults to "normal" — existing
  // prepared entries need no rewrite; tracker code treats absent as normal.

  // Alignment stored as a full label ("Neutral Good") instead of a code ("NG"):
  // older imports and pre-normalization saves carry the label form, which the
  // Identity select can't match (it silently showed "—"). `setAlignment` and
  // the external importers normalize new writes; this backfills existing docs
  // on load. Unknown strings are kept as-is (the sheet renders them raw).
  if (next.identity.alignment) {
    const code = normalizeAlignmentCode(next.identity.alignment);
    if (code && code !== next.identity.alignment) {
      next = { ...next, identity: { ...next.identity, alignment: code } };
      changed = true;
    }
  }

  return changed ? next : doc;
}

export { ABILITY_IDS };

export function setName(doc: CharacterDoc, name: string): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, name } };
}

/**
 * Set alignment, accepting either a code ("NG") or a full label ("Neutral
 * Good", case-insensitive) and normalizing to the code the builder's
 * Alignment dropdown expects — so a label-shaped value (e.g. from an
 * external import, or a hand-authored fixture) doesn't silently show as "—"
 * in the dropdown while the sheet still displays the raw text. An
 * unrecognized string is stored as-is; the dropdown already falls back to
 * showing the raw value in that case.
 */
export function setAlignment(doc: CharacterDoc, alignment: string): CharacterDoc {
  const code = normalizeAlignmentCode(alignment);
  return { ...doc, identity: { ...doc.identity, alignment: code ?? alignment } };
}

export function setDeity(doc: CharacterDoc, deity: string): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, deity } };
}

/**
 * Set the cleric's chosen domain tags (PF1 normally two; UI caps at two here).
 * Pass `[]` to clear. A tag may name either a `Domain` (`refData.domainSpellLists`
 * key) or a `Subdomain` (`refData.subdomainSpellLists` key) — no validation here
 * (pure model layer — the builder picker gates the choices). Replaces the whole
 * list (not add-remove) to keep domain swapping simple.
 */
export function setClericDomains(doc: CharacterDoc, domains: string[]): CharacterDoc {
  const trimmed = domains.filter((d) => typeof d === "string" && d.length > 0);
  return {
    ...doc,
    build: { ...doc.build, clericDomains: trimmed.slice(0, 2) },
  };
}

/**
 * The top-level `Domain.tag` a `clericDomains` entry displays under: itself
 * for a domain tag, its `parentDomainTags[0]` for a subdomain tag (used by
 * `DomainPicker` to keep a swapped-in subdomain's slot highlighted under its
 * parent domain in the picker grid). Returns `tag` unchanged for a tag that
 * matches neither collection (soft-warning posture — never throws).
 */
export function parentDomainTagOf(refData: RefData, tag: string): string {
  const subdomain = Object.values(refData.subdomains).find((s) => s.tag === tag);
  return subdomain?.parentDomainTags[0] ?? tag;
}

/**
 * Set the sorcerer's chosen bloodline tag (single tag, unlike the two-domain
 * cleric shape). Pass `null` (or a blank/whitespace string) to clear. No
 * validation that the tag exists in `refData.bloodlineSpellLists` (soft-warning
 * posture, same as `setClericDomains`).
 */
export function setSorcererBloodline(doc: CharacterDoc, tag: string | null): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  return {
    ...doc,
    build: {
      ...doc.build,
      sorcererBloodline: trimmed.length > 0 ? trimmed : undefined,
      // A variant (dragon type / element) only makes sense for the
      // bloodline it was picked under — clear it on any bloodline change,
      // same posture as setWizardSchool clearing opposition schools.
      sorcererBloodlineVariant: undefined,
    },
  };
}

/**
 * Set the energy-type/subtype variant (e.g. Draconic dragon type, Elemental
 * element) for bloodlines that need one (issue #34; see
 * `@pf1/engine` `BLOODLINES[tag].variantOptions`). Pass `null` (or a blank
 * string) to clear. Free-choice, no validation that the id exists in the
 * bloodline's `variantOptions` — soft-warning posture, matching
 * `setSorcererBloodline`. Display-only: the engine derives no numeric Change
 * from this field (see `bloodlines.ts`'s doc comment).
 */
export function setSorcererBloodlineVariant(
  doc: CharacterDoc,
  variant: string | null,
): CharacterDoc {
  const trimmed = typeof variant === "string" ? variant.trim() : "";
  return {
    ...doc,
    build: {
      ...doc.build,
      sorcererBloodlineVariant: trimmed.length > 0 ? trimmed : undefined,
    },
  };
}

/**
 * Set the bloodrager's chosen bloodline tag (issue #65). Mirrors
 * `setSorcererBloodline` exactly (single tag, `null`/blank clears, no
 * validation against `@pf1/engine` `BLOODRAGER_BLOODLINES` — soft-warning
 * posture). Clears any stored variant on change, same as
 * `setSorcererBloodline`.
 */
export function setBloodragerBloodline(doc: CharacterDoc, tag: string | null): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  return {
    ...doc,
    build: {
      ...doc.build,
      bloodragerBloodline: trimmed.length > 0 ? trimmed : undefined,
      bloodragerBloodlineVariant: undefined,
    },
  };
}

/**
 * Set the energy-type/subtype variant (Draconic dragon type, Elemental
 * element) for a bloodrager bloodline that needs one — mirrors
 * `setSorcererBloodlineVariant` exactly. Display-only.
 */
export function setBloodragerBloodlineVariant(
  doc: CharacterDoc,
  variant: string | null,
): CharacterDoc {
  const trimmed = typeof variant === "string" ? variant.trim() : "";
  return {
    ...doc,
    build: {
      ...doc.build,
      bloodragerBloodlineVariant: trimmed.length > 0 ? trimmed : undefined,
    },
  };
}

/**
 * Set (or clear, with `null`) the brawler's currently-borrowed Martial
 * Flexibility feat (issue #65) — `live.martialFlexibilityFeatId`. Pure
 * record-keeping: does NOT validate the feat is a combat feat, doesn't check
 * prerequisites, and doesn't drain the `martialFlexibility` resource pool
 * (matching `toggleLinkedBuff`'s posture of never coupling a pool's uses/day
 * count to a live toggle — see `@pf1/engine` `resources.ts`'s doc comment).
 */
export function setMartialFlexibilityFeat(doc: CharacterDoc, featId: string | null): CharacterDoc {
  const trimmed = typeof featId === "string" ? featId.trim() : "";
  return {
    ...doc,
    live: {
      ...doc.live,
      martialFlexibilityFeatId: trimmed.length > 0 ? trimmed : undefined,
    },
  };
}

/**
 * Set the oracle's chosen mystery tag (single tag, PF1 grants exactly one at
 * L1, never changed thereafter). Pass `null` (or a blank/whitespace string)
 * to clear. No validation that the tag exists in `@pf1/engine`
 * `ORACLE_MYSTERIES` (soft-warning posture, same as `setSorcererBloodline`).
 */
export function setOracleMystery(doc: CharacterDoc, tag: string | null): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  return {
    ...doc,
    build: { ...doc.build, oracleMystery: trimmed.length > 0 ? trimmed : undefined },
  };
}

/**
 * Set the oracle's chosen curse tag (single tag, PF1 grants exactly one at
 * L1, never changed thereafter). Pass `null` (or a blank/whitespace string)
 * to clear. No validation that the tag exists in `@pf1/engine`
 * `ORACLE_CURSES` (soft-warning posture, same as `setOracleMystery`).
 */
export function setOracleCurse(doc: CharacterDoc, tag: string | null): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  return {
    ...doc,
    build: { ...doc.build, oracleCurse: trimmed.length > 0 ? trimmed : undefined },
  };
}

/**
 * Set the psychic's chosen discipline tag (single tag, PF1 grants exactly one
 * at L1, never changed thereafter). Pass `null` (or a blank/whitespace
 * string) to clear. No validation that the tag exists in `@pf1/engine`
 * `PSYCHIC_DISCIPLINES` (soft-warning posture, same as `setOracleMystery`).
 */
export function setPsychicDiscipline(doc: CharacterDoc, tag: string | null): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  return {
    ...doc,
    build: { ...doc.build, psychicDiscipline: trimmed.length > 0 ? trimmed : undefined },
  };
}

/**
 * Set the witch's chosen patron tag (single tag, PF1 grants exactly one at
 * L1, never changed thereafter). Pass `null` (or a blank/whitespace string)
 * to clear. No validation that the tag exists in `@pf1/engine`
 * `WITCH_PATRONS` (soft-warning posture, same as `setOracleMystery`).
 */
export function setWitchPatron(doc: CharacterDoc, tag: string | null): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  return {
    ...doc,
    build: { ...doc.build, witchPatron: trimmed.length > 0 ? trimmed : undefined },
  };
}

/**
 * Set the shaman's chosen spirit tag (single tag, PF1 grants exactly one at
 * L1, never changed thereafter). Pass `null` (or a blank/whitespace string)
 * to clear. No validation that the tag exists in `@pf1/engine`
 * `SHAMAN_SPIRITS` (soft-warning posture, same as `setOracleMystery`).
 */
export function setShamanSpirit(doc: CharacterDoc, tag: string | null): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  return {
    ...doc,
    build: { ...doc.build, shamanSpirit: trimmed.length > 0 ? trimmed : undefined },
  };
}

/**
 * Set the cavalier/samurai's chosen order tag (single tag, PF1 grants
 * exactly one at L1, never changed thereafter). Pass `null` (or a blank/
 * whitespace string) to clear. No validation that the tag exists in
 * `@pf1/engine` `CAVALIER_ORDERS`/`SAMURAI_ORDERS`, or that it's one the
 * character's class(es) can actually take — soft-warning posture, same as
 * `setOracleMystery` (the picker UI is expected to only offer legal options
 * for the classes present, e.g. hiding Warrior/Ronin from a pure cavalier).
 */
export function setCavalierOrder(doc: CharacterDoc, tag: string | null): CharacterDoc {
  const trimmed = typeof tag === "string" ? tag.trim() : "";
  return {
    ...doc,
    build: { ...doc.build, cavalierOrder: trimmed.length > 0 ? trimmed : undefined },
  };
}

/**
 * Set the antipaladin's Fiendish Boon form (PF1 APG RAW: chosen at 5th
 * level, "once the form is chosen, it cannot be changed" — same
 * single-fixed-choice posture as `setWitchPatron`, just a two-value union
 * instead of a free-choice RefData tag). Pass `null` to clear.
 */
export function setAntipaladinBoon(
  doc: CharacterDoc,
  boon: "weapon" | "servant" | null,
): CharacterDoc {
  return {
    ...doc,
    build: { ...doc.build, antipaladinBoon: boon ?? undefined },
  };
}

/**
 * Set the vigilante's chosen specialization (single choice, PF1 grants
 * exactly one at L1, never changed thereafter). Pass `null` to clear. No
 * validation beyond the "avenger" | "stalker" union — the picker UI only
 * offers those two values. See `character.ts`'s `vigilanteSpecialization`
 * doc comment for what this drives (`compute.ts`'s BAB loop, and the
 * Hidden Strike detail line in `archetypes.ts`).
 */
export function setVigilanteSpecialization(
  doc: CharacterDoc,
  spec: "avenger" | "stalker" | null,
): CharacterDoc {
  return {
    ...doc,
    build: { ...doc.build, vigilanteSpecialization: spec ?? undefined },
  };
}

/**
 * Set (or clear) the fighter's Weapon Training group pick for tier
 * `tierIndex` (0 = 5th level, 1 = 9th, 2 = 13th, 3 = 17th — see
 * `build.weaponTrainingGroups`'s doc comment). Pass `null` (or a blank/
 * whitespace string) to clear that tier. Free-choice, no hard validation
 * that `group` is one of `@pf1/engine`'s `WEAPON_GROUPS` (same soft posture
 * as `setOracleMystery`/`setOracleCurse`) — the picker UI is expected to only
 * offer real options, but a stale/hand-edited value is left alone rather
 * than silently dropped. Trailing cleared tiers are popped so the array
 * stays minimal; an earlier tier left cleared while a later one is set is a
 * soft-invalid state this function doesn't prevent (mirrors every other
 * free-choice picker in this app — the picker UI only exposes tiers the
 * fighter has actually reached, so this shouldn't normally arise).
 * Out-of-range `tierIndex` (outside 0–3) is a no-op.
 */
export function setWeaponTrainingGroup(
  doc: CharacterDoc,
  tierIndex: number,
  group: string | null,
): CharacterDoc {
  if (tierIndex < 0 || tierIndex > 3) return doc;
  const current = [...(doc.build.weaponTrainingGroups ?? [])];
  while (current.length <= tierIndex) current.push(""); // fill gaps, never leave sparse holes
  const trimmed = typeof group === "string" ? group.trim() : "";
  current[tierIndex] = trimmed;
  while (current.length > 0 && !current[current.length - 1]) current.pop();
  return {
    ...doc,
    build: {
      ...doc.build,
      weaponTrainingGroups: current.length > 0 ? current : undefined,
    },
  };
}

/**
 * Set the wizard's specialization school (or `"uni"` for Universalist), or an
 * `ElementalSchoolTag`. Pass `null` to clear the choice entirely (back-compat
 * "unset" state, treated identically to Universalist by the model layer).
 * Setting `"uni"` clears `wizardOppositionSchools` — a Universalist has none.
 * Setting any other tag leaves opposition alone; the player must set it via
 * `setWizardOppositionSchools` (no auto-suggestion — free-choice, same
 * soft-warning posture as `setClericDomains`). An elemental tag leaves
 * opposition alone too, though the builder doesn't render the opposition
 * picker for one (see `SchoolPicker`) — elemental schools use a different,
 * unmodeled one-of-four-elements opposition mechanic (see `WizardSchool` doc
 * comment in `@pf1/schema`).
 */
export function setWizardSchool(
  doc: CharacterDoc,
  tag: WizardSchoolTag | ElementalSchoolTag | null,
): CharacterDoc {
  const build = { ...doc.build, wizardSchool: tag ?? undefined };
  if (tag === "uni") {
    build.wizardOppositionSchools = [];
  }
  return { ...doc, build };
}

/**
 * Set the specialist wizard's two opposition school tags. Pass `null` (or an
 * empty array) to clear. Caps at two and strips blanks, same shape as
 * `setClericDomains`. No validation that a tag differs from
 * `build.wizardSchool` — free-choice, soft-warning posture.
 */
export function setWizardOppositionSchools(doc: CharacterDoc, tags: string[] | null): CharacterDoc {
  const trimmed = (tags ?? []).filter((t) => typeof t === "string" && t.length > 0);
  return {
    ...doc,
    build: { ...doc.build, wizardOppositionSchools: trimmed.slice(0, 2) },
  };
}

/**
 * Set or clear the arcane bond (wizard L1 choice: familiar or bonded object).
 * `null` clears. A familiar bond requires a non-blank `familiarKind` (the
 * transition no-ops otherwise, so callers can pass raw picker state); whether
 * the kind exists in the engine's familiar table is NOT validated here (soft
 * warning posture — unknown kinds simply apply nothing in the engine). An
 * object bond stores the display name as typed; whitespace-only names are
 * dropped entirely (a player may record "bonded object" without naming the
 * item). Stored raw, not trimmed, so a controlled input can carry mid-typing
 * spaces.
 */
export function setArcaneBond(
  doc: CharacterDoc,
  bond:
    | { type: "familiar"; familiarKind: string }
    | { type: "object"; bondedItemName?: string }
    | null,
): CharacterDoc {
  if (bond === null) {
    const build = { ...doc.build };
    delete build.arcaneBond;
    return { ...doc, build };
  }
  if (bond.type === "familiar") {
    const kind = bond.familiarKind.trim();
    if (kind.length === 0) return doc;
    return {
      ...doc,
      build: { ...doc.build, arcaneBond: { type: "familiar", familiarKind: kind } },
    };
  }
  const name = bond.bondedItemName;
  const hasName = typeof name === "string" && name.trim().length > 0;
  return {
    ...doc,
    build: {
      ...doc.build,
      arcaneBond: { type: "object", ...(hasName ? { bondedItemName: name } : {}) },
    },
  };
}

/**
 * Set the chosen archetype ids (keys into `refData.archetypes`). Replaces the
 * whole list, same shape as `setClericDomains`. No conflict validation here —
 * the model layer stays free-choice; the engine's `resolveClassFeatures`
 * applies swaps last-wins if two chosen archetypes ever overlap a slot.
 */
export function setArchetypes(doc: CharacterDoc, archetypes: string[]): CharacterDoc {
  const trimmed = archetypes.filter((a) => typeof a === "string" && a.length > 0);
  return { ...doc, build: { ...doc.build, archetypes: trimmed } };
}

/**
 * Set the free-text bonus languages (`build.bonusLanguages` — see
 * `model/languages.ts`). Replaces the whole list, same shape as
 * `setArchetypes`; blank entries are dropped. No dedup here (the display
 * layer in `model/languages.ts` dedupes against racial languages) and no
 * validation against a real-world language list — soft-warning posture,
 * matching the project's other free-choice fields.
 */
export function setBonusLanguages(doc: CharacterDoc, languages: string[]): CharacterDoc {
  const trimmed = languages.map((l) => l.trim()).filter((l) => l.length > 0);
  return { ...doc, build: { ...doc.build, bonusLanguages: trimmed } };
}

export function setGender(doc: CharacterDoc, gender: string): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, gender } };
}

export function setAge(doc: CharacterDoc, age: string): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, age } };
}

export function setHeight(doc: CharacterDoc, height: string): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, height } };
}

export function setWeight(doc: CharacterDoc, weight: string): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, weight } };
}

export function setAppearance(doc: CharacterDoc, appearance: string): CharacterDoc {
  return { ...doc, identity: { ...doc.identity, appearance } };
}

export function setAbility(doc: CharacterDoc, ability: AbilityId, value: number): CharacterDoc {
  const clamped = clampInt(value, 1, 50);
  return { ...doc, abilities: { ...doc.abilities, [ability]: clamped } };
}

/**
 * Set (or clear) the builder's point-buy budget (issue #86). Pass `null` to
 * turn point buy off, hiding the readout entirely (back-compat default). No
 * validation against the standard 10/15/20/25 budgets — a table can house-rule
 * a custom number, same free-choice posture as the rest of the builder.
 */
export function setAbilityPointBuyBudget(doc: CharacterDoc, budget: number | null): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      abilityPointBuyBudget: budget == null ? undefined : budget,
    },
  };
}

export function setRace(doc: CharacterDoc, raceId: string): CharacterDoc {
  const identity = { ...doc.identity, race: raceId };
  delete identity.flexibleAbility;
  // Multitalented's 2nd favored class (issue #4) is Half-Elf-specific; drop
  // it on any race change so it can't linger and inflate the FCB budget for
  // a race that never grants it (model/race.ts:favoredClassBonusLevels also
  // guards against this independently, but clearing here keeps the doc tidy).
  delete identity.favoredClass2;
  // Alternate racial traits (issue #35) belong to a specific race; drop them on
  // any race change so a stale swap can't apply (the engine also ignores ids
  // whose race doesn't match, but clearing here keeps the doc tidy and the
  // picker in sync).
  const build = { ...doc.build };
  delete build.racialTraits;
  return { ...doc, identity, build };
}

/**
 * Set or clear the flexible +2 ability choice (Human / Half-Elf / Half-Orc).
 * When `ability` is null, the key is removed so a stale choice never lingers.
 */
export function setFlexibleAbility(doc: CharacterDoc, ability: AbilityId | null): CharacterDoc {
  const identity = { ...doc.identity };
  if (ability === null) {
    delete identity.flexibleAbility;
  } else {
    identity.flexibleAbility = ability;
  }
  return { ...doc, identity };
}

/** Add a class at level 1 (no-op if the tag is already present). */
export function addClass(doc: CharacterDoc, tag: string): CharacterDoc {
  if (doc.identity.classes.some((c) => c.tag === tag)) return doc;
  const classes = [...doc.identity.classes, { tag, level: 1 }];
  const favoredClass = doc.identity.favoredClass ?? tag;
  return { ...doc, identity: { ...doc.identity, classes, favoredClass } };
}

export function removeClass(doc: CharacterDoc, tag: string): CharacterDoc {
  const classes = doc.identity.classes.filter((c) => c.tag !== tag);
  const identity = { ...doc.identity, classes };

  // Casting-advancement cleanup (issue #66 chunk 2): the removed class can be
  // on either side of `build.castingAdvancement` — (a) it WAS a prestige
  // class with its own slots (drop its key outright), or (b) it was some
  // OTHER prestige class's chosen TARGET (null out just that slot entry,
  // leaving the prestige class's other slots/choices intact). Same "a stale
  // reference never lingers" posture `setRace`'s racialTraits cleanup and
  // `setFavoredClass`'s favoredClass2 cleanup use elsewhere in this file.
  const advancement = doc.build.castingAdvancement;
  if (!advancement) return { ...doc, identity };

  let changed = tag in advancement;
  const nextAdvancement: Record<string, (string | null)[]> = {};
  for (const [prestigeTag, slots] of Object.entries(advancement)) {
    if (prestigeTag === tag) continue; // (a)
    const nextSlots = slots.map((t) => (t === tag ? null : t)); // (b)
    if (nextSlots.some((t, i) => t !== slots[i])) changed = true;
    nextAdvancement[prestigeTag] = nextSlots;
  }
  if (!changed) return { ...doc, identity };
  return { ...doc, identity, build: { ...doc.build, castingAdvancement: nextAdvancement } };
}

/**
 * Set (or clear, with `targetTag: null`) the chosen target class for a
 * prestige class's casting-advancement slot (issue #66 chunk 2) — see
 * `CharacterDoc.build.castingAdvancement`'s doc comment for the storage
 * shape. Validated via `eligibleAdvancementTargets` — the same check
 * `model/casterLevel.ts`'s `castingAdvancementBonus` enforces defensively at
 * read time — so an ineligible target (not on `identity.classes`, not a real
 * caster, or the wrong kind for this slot) is silently ignored rather than
 * stored: the doc should never carry a choice `castingAdvancementBonus` would
 * reject anyway. Also a no-op when `prestigeTag` has no `castingAdvancement`
 * slots in `refData` at all, or `slotIndex` is out of range for it.
 */
export function setCastingAdvancementTarget(
  doc: CharacterDoc,
  refData: RefData,
  prestigeTag: string,
  slotIndex: number,
  targetTag: string | null,
): CharacterDoc {
  const classDef = Object.values(refData.classes).find((c) => c.tag === prestigeTag);
  const slotCount = classDef?.castingAdvancement?.length ?? 0;
  if (slotIndex < 0 || slotIndex >= slotCount) return doc;
  if (
    targetTag !== null &&
    !eligibleAdvancementTargets(doc, refData, prestigeTag, slotIndex).includes(targetTag)
  ) {
    return doc;
  }

  const existing = doc.build.castingAdvancement?.[prestigeTag] ?? [];
  const nextSlots = [...existing];
  while (nextSlots.length < slotCount) nextSlots.push(null);
  nextSlots[slotIndex] = targetTag;

  return {
    ...doc,
    build: {
      ...doc.build,
      castingAdvancement: { ...doc.build.castingAdvancement, [prestigeTag]: nextSlots },
    },
  };
}

export function setClassLevel(doc: CharacterDoc, tag: string, level: number): CharacterDoc {
  const lvl = clampInt(level, 1, 20);
  const classes = doc.identity.classes.map((c) => (c.tag === tag ? { ...c, level: lvl } : c));
  return { ...doc, identity: { ...doc.identity, classes } };
}

export function setFavoredClass(doc: CharacterDoc, tag: string): CharacterDoc {
  const identity = { ...doc.identity, favoredClass: tag };
  // Can't be the same as the 2nd favored class — see favoredClass2 doc
  // comment (favoredClassBonusLevels would double-count that class's level).
  if (identity.favoredClass2 === tag) delete identity.favoredClass2;
  return { ...doc, identity };
}

/**
 * Set/clear the Half-Elf Multitalented 2nd favored class (issue #4). Pass
 * `null` to clear it (toggling the same tag off again in the UI). A no-op
 * when `tag` matches the primary favored class — see `favoredClass2` doc
 * comment on `CharacterDoc.identity`.
 */
export function setFavoredClass2(doc: CharacterDoc, tag: string | null): CharacterDoc {
  const identity = { ...doc.identity };
  if (tag === null || tag === identity.favoredClass) {
    delete identity.favoredClass2;
  } else {
    identity.favoredClass2 = tag;
  }
  return { ...doc, identity };
}

export function setSkillRank(doc: CharacterDoc, skill: SkillId, ranks: number): CharacterDoc {
  const r = clampInt(ranks, 0, totalLevel(doc));
  const next = { ...doc.build.skillRanks };
  if (r <= 0) delete next[skill];
  else next[skill] = r;
  return { ...doc, build: { ...doc.build, skillRanks: next } };
}

/**
 * Add a new Craft/Profession/Perform subskill instance (issue #24), keyed
 * `"<base>.<slug>"` where `<slug>` is derived from the player's free-text
 * label (see `model/names.ts:slugifySkillLabel` — the slug IS the label,
 * there is no separate stored display string). Starts at 1 rank so the row
 * doesn't immediately vanish (0-rank skill entries are pruned by
 * `setSkillRank`, same as every other skill). A blank label, or one that
 * slugifies to nothing, is a no-op. Slug collisions (two instances with the
 * same label) are disambiguated with a numeric suffix.
 */
export function addSkillInstance(doc: CharacterDoc, base: string, label: string): CharacterDoc {
  const slug = slugifySkillLabel(label);
  if (!slug) return doc;
  let id = `${base}.${slug}`;
  for (let n = 2; doc.build.skillRanks[id] != null; n++) {
    id = `${base}.${slug}-${n}`;
  }
  return setSkillRank(doc, id, 1);
}

/**
 * Rename a parameterized skill instance by re-slugging its label — moves the
 * existing ranks to the new id (or is a no-op if the label is blank/unchanged,
 * or the new slug collides with an existing instance). Bare ids (no ".") are
 * not renameable this way; nothing in the UI currently offers it, but this
 * keeps `skillName`'s doc comment about renames true.
 */
export function renameSkillInstance(
  doc: CharacterDoc,
  id: SkillId,
  newLabel: string,
): CharacterDoc {
  const dot = id.indexOf(".");
  if (dot === -1) return doc;
  const base = id.slice(0, dot);
  const slug = slugifySkillLabel(newLabel);
  if (!slug) return doc;
  const newId = `${base}.${slug}`;
  if (newId === id) return doc;
  if (doc.build.skillRanks[newId] != null) return doc;
  const ranks = doc.build.skillRanks[id];
  if (ranks == null) return doc;
  const next = { ...doc.build.skillRanks };
  delete next[id];
  next[newId] = ranks;
  return { ...doc, build: { ...doc.build, skillRanks: next } };
}

/**
 * Add or remove the PRIMARY instance of `featId`. Adding always succeeds
 * (no-op safety against duplicates via `.includes`); removing delegates to
 * {@link removeFeatInstance} (no `instanceId`), which — for a RAW-repeatable
 * feat (issue #58) with extra instances already taken — promotes the first
 * extra instance into the primary slot instead of leaving `build.feats`
 * without the feat while `build.extraFeats` still references it. For a
 * non-repeatable feat (never has extra instances), this is unchanged from
 * before issue #58: remove from `feats[]` and clear its `featChoices` entry.
 */
export function toggleFeat(doc: CharacterDoc, featId: string): CharacterDoc {
  const has = doc.build.feats.includes(featId);
  if (has) return removeFeatInstance(doc, featId);
  return { ...doc, build: { ...doc.build, feats: [...doc.build.feats, featId] } };
}

/**
 * Add another instance of `featId` (issue #58: RAW-repeatable feats — Weapon
 * Focus, Skill Focus, Improved Critical, the "Extra X" pool feats, ... see
 * `apps/web/src/model/repeatableFeats.ts` for the curated set). If the
 * character doesn't have `featId` at all yet, this is identical to
 * `toggleFeat`'s add branch (adds the PRIMARY instance to `build.feats`).
 * Once a primary instance exists, every subsequent call appends a fresh
 * `build.extraFeats` entry (its own instance id, no choice yet) — the UI's
 * choice picker then targets that instance id via `setExtraFeatChoice`
 * (`model/feats.ts`). Does NOT check whether `featId` is actually in the
 * repeatable set — that's a UI-gating concern (only repeatable feats get a
 * "take again" button); this transition trusts the caller, same posture as
 * every other free-choice transition in this module.
 */
export function addFeatInstance(doc: CharacterDoc, featId: string): CharacterDoc {
  if (!doc.build.feats.includes(featId)) {
    return { ...doc, build: { ...doc.build, feats: [...doc.build.feats, featId] } };
  }
  const instanceId = localId("feat-");
  const extraFeats = [...(doc.build.extraFeats ?? []), { instanceId, featId }];
  return { ...doc, build: { ...doc.build, extraFeats } };
}

/**
 * Remove one instance of `featId` (issue #58). `instanceId` selects WHICH:
 *  - omitted (or `undefined`): the PRIMARY instance (`build.feats` +
 *    `featChoices[featId]`). If no `build.extraFeats` entries for this feat
 *    exist, this is `toggleFeat`'s pre-#58 remove behavior exactly — drop it
 *    from `feats[]` and delete its `featChoices` entry. If extra instances
 *    DO exist, the FIRST one is instead PROMOTED into the primary slot (its
 *    choice, if any, moves into `featChoices[featId]`) rather than leaving
 *    `build.feats` without the feat while `extraFeats` still references it —
 *    every other module in this app (`grantedFeats`, prereq checks,
 *    `featSlots.ts`, saved rolls) keys "does the character have this feat"
 *    off `build.feats.includes(featId)`, so that invariant (primary present
 *    iff any instance is) must hold.
 *  - a `build.extraFeats[].instanceId`: removes just that instance, leaving
 *    the primary (and any other extra instances) untouched.
 * No-op if `featId` isn't owned at all, or `instanceId` matches nothing.
 */
export function removeFeatInstance(
  doc: CharacterDoc,
  featId: string,
  instanceId?: string,
): CharacterDoc {
  if (instanceId !== undefined) {
    const extraFeats = (doc.build.extraFeats ?? []).filter((e) => e.instanceId !== instanceId);
    return {
      ...doc,
      build: { ...doc.build, extraFeats: extraFeats.length > 0 ? extraFeats : undefined },
    };
  }
  if (!doc.build.feats.includes(featId)) return doc;

  const extras = doc.build.extraFeats ?? [];
  const promoteIdx = extras.findIndex((e) => e.featId === featId);

  if (promoteIdx === -1) {
    const feats = doc.build.feats.filter((f) => f !== featId);
    let build = { ...doc.build, feats };
    if (doc.build.featChoices?.[featId] !== undefined) {
      const featChoices = { ...doc.build.featChoices };
      delete featChoices[featId];
      build = { ...build, featChoices };
    }
    return { ...doc, build };
  }

  const promoted = extras[promoteIdx]!;
  const remaining = extras.filter((_, i) => i !== promoteIdx);
  const featChoices = { ...doc.build.featChoices };
  if (promoted.choiceId !== undefined) featChoices[featId] = promoted.choiceId;
  else delete featChoices[featId];
  return {
    ...doc,
    build: {
      ...doc.build,
      extraFeats: remaining.length > 0 ? remaining : undefined,
      featChoices,
    },
  };
}

/**
 * Add/remove `spellId` from `classTag`'s known-spell list (the spellbook, for
 * a curated-list caster). `classTag` is explicit rather than assumed — pass
 * the caster class the player is currently viewing (see
 * `model/spellcasting.ts` `casterClassesOf`); for a single-caster document
 * that is always its one caster class, so behavior is unchanged from before
 * multiclass support. Removing a spell also prunes any of that class's
 * prepared instances of it, so the prepared loadout never references an
 * unknown spell.
 */
export function toggleKnownSpell(
  doc: CharacterDoc,
  refData: RefData,
  spellId: string,
  classTag: string,
): CharacterDoc {
  const known = knownSpellsFor(doc, refData, classTag);
  const has = known.includes(spellId);
  const next = has ? known.filter((s) => s !== spellId) : [...known, spellId];
  const withKnown = setKnownSpellsFor(doc, refData, classTag, next);
  // Removing a spell from the spellbook invalidates any prepared instances of
  // it FOR THIS CLASS — prune them so the prepared loadout never references
  // unknown spells (a different class's prepared instances of a same-named
  // spell id, e.g. one on both the cleric and wizard lists, are untouched).
  const tag = storedClassTag(doc, refData, classTag);
  if (has && doc.live.spells?.prepared.some((p) => p.spellId === spellId && p.classTag === tag)) {
    return {
      ...withKnown,
      live: {
        ...withKnown.live,
        spells: {
          ...withKnown.live.spells!,
          prepared: withKnown.live.spells!.prepared.filter(
            (p) => !(p.spellId === spellId && p.classTag === tag),
          ),
        },
      },
    };
  }
  return withKnown;
}

export function setGear(doc: CharacterDoc, gear: ItemInstance[]): CharacterDoc {
  return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Append a magic item (by RefData id) to gear, equipped by default.
 * No deduplication — the user may carry multiple copies of the same item.
 */
export function addGearItem(doc: CharacterDoc, itemId: string): CharacterDoc {
  const gear = [...doc.build.gear, { itemId, equipped: true }];
  return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Enforces PF1's magic armor/shield invariants on a `WornArmor` (issue #8;
 * mirrors `normalizeWeaponInstance`, applied to the armor half of the same
 * "+10 total bonus" rule):
 *  - `enhancement` clamped to [0, 10].
 *  - `masterwork` dropped once `enhancement` is positive (a magic enhancement
 *    bonus already implies masterwork quality; the flag is only meaningful
 *    at +0).
 *  - `abilities` require `enhancement >= 1` (a mundane suit can't carry a
 *    special ability) — cleared entirely otherwise.
 *  - `abilities` truncated (keeping earliest-selected first) so `enhancement`
 *    plus their combined bonus-equivalent never exceeds +10 — PF1 RAW caps
 *    armor/shield special abilities by the same total-bonus rule as weapons.
 *  - `shieldTier` (issue #81) only meaningful on `slot === "shield"` —
 *    dropped on body armor (e.g. after a slot switch in the edit form).
 */
function normalizeWornArmor(armor: WornArmor): WornArmor {
  const next = { ...armor };
  if (next.enhancement != null) {
    next.enhancement = clampInt(next.enhancement, 0, 10);
  }
  const enh = next.enhancement ?? 0;
  if (enh > 0) delete next.masterwork;
  if (enh < 1) {
    delete next.abilities;
  } else if (next.abilities && next.abilities.length > 0) {
    const kept = sanitizeAbilities(next.abilities, enh);
    if (kept.length > 0) next.abilities = kept;
    else delete next.abilities;
  }
  if (next.slot !== "shield") delete next.shieldTier;
  return next;
}

/**
 * Append a manually-entered worn armor or shield. `name` is the user-supplied
 * display label (e.g. "Chainmail +1"). The item is equipped by default.
 * {@link normalizeWornArmor} enforces the enhancement/abilities invariants
 * (e.g. a hand-entered suit can't carry abilities beyond the +10 cap either).
 */
export function addWornArmor(doc: CharacterDoc, armor: WornArmor, name: string): CharacterDoc {
  const gear = [...doc.build.gear, { equipped: true, armor: normalizeWornArmor(armor), name }];
  return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Append a worn armor or shield selected from `RefData.armors`. Snapshots the
 * physical stats onto a new `WornArmor` (negating ACP, since the schema stores
 * penalties as negative and the ref keeps the source magnitude), and records
 * the `armorId` for display + future re-sync. Optional `enhancement` and
 * `material` apply modifiers at pick-time (mithral: weight class shift, maxDex
 * +2, ACP −3, ASF −10%). Optional `abilities` are stored for display (all
 * armor abilities are display-only) and run through {@link normalizeWornArmor},
 * which drops them below `enhancement` 1 and truncates the combined
 * bonus-equivalent to the same +10 cap as magic weapons (issue #8). Optional
 * `masterwork` (only meaningful at `enhancement` 0 — a magic enhancement bonus
 * already implies masterwork quality, mirroring `normalizeWeaponInstance`)
 * reduces the snapshotted ACP magnitude by 1 (floored at 0); the "Masterwork"
 * name prefix is shown only when explicitly set at +0, since it's implied
 * (and not called out) once enhancement is positive. No deduplication.
 */
/**
 * Maps `ArmorRef.proficiency` (Foundry's raw shield tag — see refdata.ts's
 * doc comment for the full vocabulary) to `WornArmor.shieldTier` (issue #81).
 * "other" covers the Buckler and Dwarven War-Shield, both of which need the
 * standard Shield Proficiency feat, not Tower Shield Proficiency — same
 * bucket as light/heavy shields. `undefined` for anything else (body armor
 * tags, or a missing/unrecognized proficiency), read downstream as "unknown,
 * don't penalize."
 */
function shieldTierFromProficiencyTag(tag: string | undefined): WornArmor["shieldTier"] {
  switch (tag) {
    case "lightShield":
    case "other":
      return "light";
    case "heavyShield":
      return "heavy";
    case "towerShield":
      return "tower";
    default:
      return undefined;
  }
}

export function addWornArmorFromRef(
  doc: CharacterDoc,
  armor: ArmorRef,
  enhancement: number = 0,
  material?: string,
  abilities?: string[],
  masterwork?: boolean,
): CharacterDoc {
  const ref = applyMaterialToArmor(armor, material);
  const enh = clampInt(enhancement, 0, 10);
  const mw = enh === 0 && masterwork === true;
  const matName = material && material !== "steel" ? (MATERIALS[material]?.name ?? null) : null;
  const name = [mw ? "Masterwork" : null, matName, armor.name, ...(enh > 0 ? [`+${enh}`] : [])]
    .filter(Boolean)
    .join(" ");

  // Masterwork quality (explicit at +0, or implied by a magic enhancement
  // bonus) reduces the armor check penalty by 1, floored at 0 magnitude so
  // it can never flip into a positive (bonus) ACP.
  const acpMagnitude = masterwork || enh >= 1 ? Math.max(0, (ref.acp ?? 0) - 1) : ref.acp;
  const shieldTier =
    ref.slot === "shield" ? shieldTierFromProficiencyTag(ref.proficiency) : undefined;

  const worn: WornArmor = normalizeWornArmor({
    slot: ref.slot,
    ac: ref.ac,
    ...(enh > 0 ? { enhancement: enh } : {}),
    ...(mw ? { masterwork: true } : {}),
    ...(material && material !== "steel" ? { material } : {}),
    ...(ref.maxDex != null ? { maxDex: ref.maxDex } : {}),
    ...(acpMagnitude ? { acp: -acpMagnitude } : {}),
    ...(ref.weightClass ? { type: ref.weightClass } : {}),
    ...(abilities && abilities.length > 0 ? { abilities } : {}),
    // ASF (issue #8) is read from `ref`, not the base `armor`, so mithral's
    // -10% (applied by `applyMaterialToArmor`) is captured in the snapshot.
    ...(ref.asf ? { asf: ref.asf } : {}),
    // Weight (issue #16 encumbrance) is read from the base ref, not
    // `applyMaterialToArmor`'s output — mithral's real-world weight halving
    // isn't modeled by that helper yet (documented gap in materials.ts).
    ...(armor.weight ? { weight: armor.weight } : {}),
    ...(shieldTier ? { shieldTier } : {}),
  });
  const inst: ItemInstance = {
    equipped: true,
    armor: worn,
    armorId: armor.id,
    name,
  };
  const gear = [...doc.build.gear, inst];
  return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Toggle the equipped flag for the gear item at `index`.
 * Out-of-range indices are silently ignored.
 */
export function setGearEquipped(doc: CharacterDoc, index: number, equipped: boolean): CharacterDoc {
  if (index < 0 || index >= doc.build.gear.length) return doc;
  const gear = doc.build.gear.map((inst, i) => (i === index ? { ...inst, equipped } : inst));
  return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Remove the gear item at `index`. Out-of-range indices are silently ignored.
 */
export function removeGear(doc: CharacterDoc, index: number): CharacterDoc {
  if (index < 0 || index >= doc.build.gear.length) return doc;
  const gear = doc.build.gear.filter((_, i) => i !== index);
  return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Partially update the gear item at `index`. Merges a `Partial<ItemInstance>`
 * patch — can update `armor`, `name`, `equipped`, etc. Out-of-range indices
 * are silently ignored. A present `armor` is run through
 * {@link normalizeWornArmor}: enhancement clamped to [0, 10]; `masterwork`
 * dropped once enhancement becomes positive (mirrors
 * `normalizeWeaponInstance`'s invariant — a magic enhancement bonus already
 * implies masterwork quality); `abilities` dropped below enhancement 1 and
 * truncated to the +10 combined-bonus cap (issue #8).
 */
export function updateGearItem(
  doc: CharacterDoc,
  index: number,
  patch: Partial<ItemInstance>,
): CharacterDoc {
  if (index < 0 || index >= doc.build.gear.length) return doc;
  const current = doc.build.gear[index]!;
  const merged: ItemInstance = { ...current, ...patch };
  if (merged.armor) {
    merged.armor = normalizeWornArmor(merged.armor);
  }
  const gear = doc.build.gear.map((g, i) => (i === index ? merged : g));
  return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Append a free-text mundane gear item (issue #16) — the picker fallback for
 * anything not in `RefData.items` (ammo, rations, rope, potions bought at
 * market, ...). Unlike `addGearItem`, there is no `itemId`: weight/price are
 * entered directly since there's no ref to look them up from. Equipped by
 * default (a custom item like ammo isn't really "worn," but `equipped` also
 * doubles as "carried, not left behind" for the encumbrance total, and every
 * other gear-add path defaults it true).  A blank `name` is a no-op (returns
 * `doc` unchanged) so the UI can call this unconditionally from a form submit.
 */
export function addCustomGearItem(
  doc: CharacterDoc,
  name: string,
  opts?: { weight?: number; price?: number; quantity?: number; charges?: number },
): CharacterDoc {
  const label = name.trim();
  if (!label) return doc;
  const inst: ItemInstance = { equipped: true, name: label };
  if (opts?.weight != null && opts.weight > 0) inst.weight = opts.weight;
  if (opts?.price != null && opts.price > 0) inst.price = opts.price;
  if (opts?.charges != null && opts.charges > 0) inst.charges = Math.trunc(opts.charges);
  if (opts?.quantity != null) {
    const q = clampInt(opts.quantity, 0, 99999);
    if (q !== 1) inst.quantity = q;
  }
  const gear = [...doc.build.gear, inst];
  return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Set how many of the gear item at `index` the character carries (issue #16).
 * Clamped to [0, 99999]; a value of exactly 1 (the implicit default) deletes
 * the key entirely so the doc stays minimal, matching the rest of this
 * module's "omit the default" convention. Out-of-range indices are silently
 * ignored.
 */
export function setGearQuantity(doc: CharacterDoc, index: number, quantity: number): CharacterDoc {
  if (index < 0 || index >= doc.build.gear.length) return doc;
  const q = clampInt(quantity, 0, 99999);
  const gear = doc.build.gear.map((inst, i) => {
    if (i !== index) return inst;
    const next = { ...inst };
    if (q === 1) delete next.quantity;
    else next.quantity = q;
    return next;
  });
  return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Set charges spent so far on the gear item at `index` (issue #16 — e.g. 3 of
 * a Staff of Healing's 10). Clamped to >= 0 only; the UI is responsible for
 * clamping against the item's actual max (looked up from
 * `RefData.items[itemId].uses.maxFormula`), since this module has no RefData
 * access. A value of exactly 0 deletes the key (full charges, the implicit
 * default). Out-of-range indices are silently ignored.
 */
export function setGearCharges(
  doc: CharacterDoc,
  index: number,
  chargesUsed: number,
): CharacterDoc {
  if (index < 0 || index >= doc.build.gear.length) return doc;
  const c = Math.max(0, Math.trunc(Number.isNaN(chargesUsed) ? 0 : chargesUsed));
  const gear = doc.build.gear.map((inst, i) => {
    if (i !== index) return inst;
    const next = { ...inst };
    if (c === 0) delete next.chargesUsed;
    else next.chargesUsed = c;
    return next;
  });
  return { ...doc, build: { ...doc.build, gear } };
}

/** Editable fields of a gear entry, as the gear editor collects them. */
export interface GearDetails {
  name: string;
  quantity: number;
  /** Unit weight in lb; 0 falls back to the vendored weight (or none). */
  weight: number;
  /** Unit price in gp; 0 falls back to the vendored price (or none). */
  price: number;
  /** Charge cap; 0 falls back to the item's `uses.maxFormula` (or untracked). */
  charges: number;
  chargesUsed: number;
}

/**
 * Rewrite the editable fields of the gear item at `index` — the "edit anything
 * after creation" path for every gear row that isn't worn armor (which has its
 * own richer editor via {@link updateGearItem}). Zero/blank values delete their
 * key rather than storing a 0, both to keep the doc minimal and because on a
 * RefData-linked entry an absent key means "use the vendored value" (see
 * `ItemInstance.weight`/`price`/`charges`). `chargesUsed` is clamped to the cap
 * when one is set. Out-of-range indices are silently ignored.
 */
export function setGearDetails(
  doc: CharacterDoc,
  index: number,
  details: GearDetails,
): CharacterDoc {
  if (index < 0 || index >= doc.build.gear.length) return doc;
  const int = (n: number, max: number) => clampInt(Number.isNaN(n) ? 0 : n, 0, max);
  const charges = int(details.charges, 99999);
  const gear = doc.build.gear.map((inst, i) => {
    if (i !== index) return inst;
    const next: ItemInstance = { ...inst };

    const name = details.name.trim();
    if (name) next.name = name;
    else delete next.name;

    const qty = int(details.quantity, 99999);
    if (qty === 1) delete next.quantity;
    else next.quantity = qty;

    const weight = Math.max(0, Number.isNaN(details.weight) ? 0 : details.weight);
    if (weight > 0) next.weight = weight;
    else delete next.weight;

    const price = Math.max(0, Number.isNaN(details.price) ? 0 : details.price);
    if (price > 0) next.price = price;
    else delete next.price;

    if (charges > 0) next.charges = charges;
    else delete next.charges;

    const used = int(details.chargesUsed, charges > 0 ? charges : 99999);
    if (used > 0) next.chargesUsed = used;
    else delete next.chargesUsed;

    return next;
  });
  return { ...doc, build: { ...doc.build, gear } };
}

/** Denomination keys for `live.money` (issue #16). */
export type MoneyField = "pp" | "gp" | "sp" | "cp";

/**
 * Set one coin denomination in the character's purse (issue #16). Negative or
 * NaN input clamps to 0; a 0 value deletes that denomination's key entirely
 * (and the whole `money` object once every denomination is 0), matching the
 * rest of this module's "omit the default" convention.
 */
export function setMoney(doc: CharacterDoc, field: MoneyField, value: number): CharacterDoc {
  const v = Math.max(0, Math.trunc(Number.isNaN(value) ? 0 : value));
  const money = { ...doc.live.money };
  if (v === 0) delete money[field];
  else money[field] = v;
  const cleaned = Object.keys(money).length === 0 ? undefined : money;
  return { ...doc, live: { ...doc.live, money: cleaned } };
}

/**
 * Set or clear the user's maximum-HP override (e.g. rolled HP).
 * When `value` is null, NaN, or <= 0, the override key is removed entirely so
 * the engine falls back to the rules-average. Otherwise the value is stored as a
 * clamped positive integer (1..100000).
 */
export function setMaxHpOverride(doc: CharacterDoc, value: number | null): CharacterDoc {
  if (value === null || Number.isNaN(value) || value <= 0) {
    const build = { ...doc.build };
    delete build.maxHpOverride;
    return { ...doc, build };
  }
  const clamped = clampInt(value, 1, 100000);
  return { ...doc, build: { ...doc.build, maxHpOverride: clamped } };
}

/**
 * Set the HP calculation mode. `"average"` (default) uses PF1 standard averages;
 * `"max"` maximises every die; `"rolled"` uses per-level rolls stored in `hpRolls`.
 */
export function setHpMode(doc: CharacterDoc, mode: "average" | "max" | "rolled"): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, hpMode: mode },
    },
  };
}

/**
 * Set the overnight rest-healing mode (issue #32). `"full"` (default, absent
 * = full) heals to max on Rest/New Day; `"natural"` uses the PF1 RAW rate of
 * 1 HP × character level per night, capped at max — see `model/hp.ts`'s
 * `restHp` doc comment for the full rule (and why full bed rest is out of
 * scope for v1).
 */
export function setRestMode(doc: CharacterDoc, mode: "full" | "natural"): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, restMode: mode },
    },
  };
}

/**
 * Store a rolled HP value for character level `charLevel` (1-based).
 * Level 1 is always maxed by the engine regardless of the stored value, but the
 * value is still recorded so the UI can display it.
 * `value` is clamped to 1..100.
 */
export function setHpRoll(doc: CharacterDoc, charLevel: number, value: number): CharacterDoc {
  if (charLevel < 1) return doc;
  const clamped = clampInt(value, 1, 100);
  const rolls = [...(doc.build.hpRolls ?? [])];
  rolls[charLevel - 1] = clamped;
  return { ...doc, build: { ...doc.build, hpRolls: rolls } };
}

/**
 * Toggle the FCB house-rule. When true, each favored-class level can grant
 * both +1 HP and +1 skill rank simultaneously via the `"both"` option.
 */
export function setFcbHouserule(doc: CharacterDoc, enabled: boolean): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, fcbHouserule: enabled },
    },
  };
}

/**
 * Toggle the Cleric Wisdom house-rule (issue #56). When true, cleric-tagged
 * class features (Channel Energy's uses/day and save DC) key off Wisdom
 * instead of Charisma. Default false = Standard PF1 (RAW).
 */
export function setClericWisdomHouserule(doc: CharacterDoc, enabled: boolean): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, clericWisdomHouserule: enabled },
    },
  };
}

/**
 * Toggle whether the character uses hero points at all. When disabled, the
 * tracker hides the hero-points panel and the cap override is ignored. The
 * live pool is left untouched so re-enabling restores the previous count.
 */
export function setHeroPointsEnabled(doc: CharacterDoc, enabled: boolean): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, heroPointsEnabled: enabled },
    },
  };
}

/**
 * Override the maximum number of hero points the character may hold.
 * `null` or <= 0 removes the override, falling back to the default (3).
 */
export function setHeroPointsCap(doc: CharacterDoc, cap: number | null): CharacterDoc {
  if (cap === null || Number.isNaN(cap) || cap <= 0) {
    const settings = { ...doc.build.settings };
    delete settings.heroPointsCap;
    return { ...doc, build: { ...doc.build, settings } };
  }
  const clamped = clampInt(cap, 1, 999);
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, heroPointsCap: clamped },
    },
  };
}

/**
 * Toggle whether the character tracks XP at all (issue #27). Off by default —
 * unlike hero points, the app's default posture is milestone leveling. The
 * live `xp` total is left untouched so re-enabling restores the prior count.
 */
export function setXpEnabled(doc: CharacterDoc, enabled: boolean): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, xpEnabled: enabled },
    },
  };
}

/**
 * Toggle the OPTIONAL PF1 carrying-capacity / encumbrance rule (issue #16).
 * Off by default (absent = false) — the owner's table doesn't use it, same
 * posture as `setXpEnabled`. When off, `compute()` applies zero load-based
 * penalties and produces no `DerivedSheet.encumbrance`, so existing documents
 * are completely unaffected by this feature's mere existence.
 */
export function setEncumbranceEnabled(doc: CharacterDoc, enabled: boolean): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, encumbranceEnabled: enabled },
    },
  };
}

/**
 * Force the Polymorph / Wild Shape panel on (`true`) or off (`false`), or pass
 * `null` to restore auto-detection from the character's own polymorph sources
 * (see `model/polymorph.ts`'s `polymorphPanelVisible`).
 */
export function setPolymorphEnabled(doc: CharacterDoc, enabled: boolean | null): CharacterDoc {
  if (enabled === null) {
    const settings = { ...doc.build.settings };
    delete settings.polymorphEnabled;
    return { ...doc, build: { ...doc.build, settings } };
  }
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, polymorphEnabled: enabled },
    },
  };
}

/**
 * Toggle the homebrew "unrestricted alignments" house rule (issue #53). When
 * true, `model/alignment.ts`'s `classAlignmentWarnings` returns no warnings
 * regardless of the character's alignment/class combination. Off by default
 * (absent = false) — PF1 RAW's class alignment restrictions are warned by
 * default, same posture as `setFcbHouserule`.
 */
export function setIgnoreClassAlignmentRestrictions(
  doc: CharacterDoc,
  enabled: boolean,
): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, ignoreClassAlignmentRestrictions: enabled },
    },
  };
}

/** Set the character's XP advancement track (slow/medium/fast). */
export function setXpTrack(doc: CharacterDoc, track: "slow" | "medium" | "fast"): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, xpTrack: track },
    },
  };
}

/**
 * Set the GM-grant skill-rank addend (homebrew). `null` deletes the sub-key,
 * falling back to a 0 addend. Clamped to [-999, 999] (negative allows a GM
 * to claw back ranks). Mirrors `setHeroPointsCap` for symmetry/clamp posture.
 */
export function setGmGrantSkillRanks(doc: CharacterDoc, n: number | null): CharacterDoc {
  return setGmGrant(doc, "skillRanks", n);
}

/**
 * Set the GM-grant feat-slot addend (homebrew). Same posture as
 * `setGmGrantSkillRanks`.
 */
export function setGmGrantFeatSlots(doc: CharacterDoc, n: number | null): CharacterDoc {
  return setGmGrant(doc, "featSlots", n);
}

function setGmGrant(
  doc: CharacterDoc,
  key: "skillRanks" | "featSlots",
  n: number | null,
): CharacterDoc {
  const current = doc.build.gmGrants ?? {};
  if (n === null || Number.isNaN(n)) {
    if (!(key in current)) {
      return { ...doc, build: { ...doc.build, gmGrants: current } };
    }
    const next = { ...current };
    delete next[key];
    const cleaned = Object.keys(next).length === 0 ? undefined : next;
    return { ...doc, build: { ...doc.build, gmGrants: cleaned } };
  }
  const clamped = clampInt(n, -999, 999);
  return {
    ...doc,
    build: {
      ...doc.build,
      gmGrants: { ...current, [key]: clamped },
    },
  };
}

/** Allowlisted keys for manual stat overrides. */
export const STAT_OVERRIDE_KEYS = [
  "hp.max",
  "ac.normal",
  "speeds.land",
  "initiative.total",
  "bab",
  "cmd",
  "cmb",
  "saves.fort.total",
  "saves.ref.total",
  "saves.will.total",
] as const;

export type StatOverrideKey = (typeof STAT_OVERRIDE_KEYS)[number];

/**
 * Set or clear a manual override for a derived stat. `key` must be in the
 * allowlist; `value` null removes the override. Values are stored as-is
 * (the engine applies the override and appends provenance in the breakdown).
 */
export function setStatOverride(
  doc: CharacterDoc,
  key: StatOverrideKey,
  value: number | null,
): CharacterDoc {
  const overrides = { ...doc.build.settings?.statOverrides };
  if (value === null || Number.isNaN(value)) {
    delete overrides[key];
  } else {
    overrides[key] = value;
  }
  return {
    ...doc,
    build: {
      ...doc.build,
      settings: { ...doc.build.settings, statOverrides: overrides },
    },
  };
}

/**
 * Set the favored-class bonus choice for a specific character-level slot (0-based
 * index). In Standard mode the valid choices are `"hp"`, `"skill"`, `"other"`;
 * in house-rule mode `"both"` and `"alternate"` are also available.
 * Out-of-range indices are silently ignored.
 */
export function setFavoredClassBonus(
  doc: CharacterDoc,
  levelIndex: number,
  choice: "hp" | "skill" | "other" | "both" | "alternate",
): CharacterDoc {
  if (levelIndex < 0) return doc;
  const arr = [...(doc.build.favoredClassBonus ?? [])];
  arr[levelIndex] = choice;
  return { ...doc, build: { ...doc.build, favoredClassBonus: arr } };
}

/** Total character level (sum of class levels). */
export function totalLevel(doc: CharacterDoc): number {
  return doc.identity.classes.reduce((sum, c) => sum + c.level, 0);
}

/**
 * Append `ability` to `build.abilityIncreases` if the current length is below
 * `floor(totalLevel / 4)`. Returns the doc unchanged when the budget is
 * exhausted (so callers can always call unconditionally).
 */
export function addAbilityIncrease(doc: CharacterDoc, ability: AbilityId): CharacterDoc {
  const allowed = Math.floor(totalLevel(doc) / 4);
  const current = doc.build.abilityIncreases ?? [];
  if (current.length >= allowed) return doc;
  return {
    ...doc,
    build: { ...doc.build, abilityIncreases: [...current, ability] },
  };
}

/**
 * Remove the LAST occurrence of `ability` from `build.abilityIncreases`.
 * No-op if that ability has no entries.
 */
export function removeAbilityIncrease(doc: CharacterDoc, ability: AbilityId): CharacterDoc {
  const current = doc.build.abilityIncreases ?? [];
  const lastIdx = current.lastIndexOf(ability);
  if (lastIdx === -1) return doc;
  const next = [...current.slice(0, lastIdx), ...current.slice(lastIdx + 1)];
  return { ...doc, build: { ...doc.build, abilityIncreases: next } };
}

/**
 * Set the number of `ability` entries in `build.abilityIncreases` to `count`,
 * preserving every other ability's assignments. `count` is clamped to
 * `[0, remainingBudget]` so the global `floor(totalLevel / 4)` cap can never be
 * exceeded. Used by the ability-increase stepper, which presents an absolute
 * count per ability.
 */
export function setAbilityIncreaseCount(
  doc: CharacterDoc,
  ability: AbilityId,
  count: number,
): CharacterDoc {
  const allowed = Math.floor(totalLevel(doc) / 4);
  const current = doc.build.abilityIncreases ?? [];
  const others = current.filter((a) => a !== ability);
  const room = Math.max(0, allowed - others.length);
  const target = clampInt(count, 0, room);
  const have = current.length - others.length;
  if (target === have) return doc;
  return {
    ...doc,
    build: {
      ...doc.build,
      abilityIncreases: [...others, ...Array(target).fill(ability)],
    },
  };
}

/**
 * Enforces PF1's magic weapon invariants on a `WeaponInstance`:
 *  - `enhancement` clamped to [0, 10].
 *  - `masterwork` dropped once `enhancement` is positive (a magic enhancement
 *    bonus already implies masterwork quality; the flag is only meaningful
 *    at +0).
 *  - `abilities` require `enhancement >= 1` (a mundane weapon can't carry a
 *    special ability) — cleared entirely otherwise.
 *  - `abilities` truncated (keeping earliest-selected first) so `enhancement`
 *    plus their combined bonus-equivalent never exceeds +10.
 */
function normalizeWeaponInstance(weapon: WeaponInstance): WeaponInstance {
  const next = { ...weapon };
  if (next.enhancement != null) {
    next.enhancement = clampInt(next.enhancement, 0, 10);
  }
  const enh = next.enhancement ?? 0;
  if (enh > 0) delete next.masterwork;
  if (enh < 1) {
    delete next.abilities;
  } else if (next.abilities && next.abilities.length > 0) {
    const kept = sanitizeAbilities(next.abilities, enh);
    if (kept.length > 0) next.abilities = kept;
    else delete next.abilities;
  }
  return next;
}

/**
 * Append a weapon to `build.weapons`. The new entry is always added at the end.
 * No deduplication — the same weapon template may be added multiple times.
 */
export function addWeapon(doc: CharacterDoc, weapon: WeaponInstance): CharacterDoc {
  const weapons = [...(doc.build.weapons ?? []), normalizeWeaponInstance(weapon)];
  return { ...doc, build: { ...doc.build, weapons } };
}

/**
 * Append a weapon selected from `RefData.weapons`, overlaying a user-chosen
 * enhancement bonus, optional masterwork flag, optional special material, and
 * optional magical abilities. Snapshots the ref's physical stats onto a
 * `WeaponInstance` (the engine reads those fields directly; `weaponId` is a
 * display + re-sync pointer only). The display name gets a "Masterwork"
 * prefix (only when non-magical — see {@link normalizeWeaponInstance}), a
 * material prefix ("Silver Longsword"), and a " +N" suffix when enhancement
 * is positive. Zero-value optionals (matching engine defaults) are omitted so
 * the doc stays minimal. Material is display-only for weapons. Keen (if
 * selected) doubles the crit range at pick-time; other abilities are
 * display-only. Abilities without `enhancement >= 1`, or beyond the +10
 * combined-bonus cap, are dropped by `normalizeWeaponInstance`. `ref.weaponGroups`
 * (Foundry's semantic weapon-category tags, e.g. `["bladesHeavy"]`) is
 * snapshotted normalized via `@pf1/engine`'s `normalizeWeaponGroup` (issue
 * #45) so `attack.weapon.<group>`/`damage.weapon.<group>` Changes authored
 * against the canonical `WEAPON_GROUPS` vocabulary match this weapon in
 * addition to its free-text `group` tag.
 */
export function addWeaponFromRef(
  doc: CharacterDoc,
  weapon: WeaponRef,
  enhancement: number = 0,
  material?: string,
  abilities?: string[],
  masterwork?: boolean,
): CharacterDoc {
  const enh = clampInt(enhancement, 0, 10);
  // Special abilities (including keen's crit-range doubling) require the
  // weapon to carry at least a +1 enhancement bonus — see normalizeWeaponInstance.
  const effectiveAbilities = enh >= 1 ? abilities : undefined;
  const ref = applyAbilitiesToWeapon(weapon, effectiveAbilities);
  const mw = enh === 0 && masterwork === true;
  const matName = material && material !== "steel" ? (MATERIALS[material]?.name ?? null) : null;
  const name = [mw ? "Masterwork" : null, matName, weapon.name, ...(enh > 0 ? [`+${enh}`] : [])]
    .filter(Boolean)
    .join(" ");
  const instance: WeaponInstance = normalizeWeaponInstance({
    name,
    attackAbility: ref.attackAbility,
    damageAbility: ref.damageAbility,
    category: ref.category,
    ...(enh > 0 ? { enhancement: enh } : {}),
    ...(mw ? { masterwork: true } : {}),
    ...(material && material !== "steel" ? { material } : {}),
    ...(effectiveAbilities && effectiveAbilities.length > 0
      ? { abilities: effectiveAbilities }
      : {}),
    ...(ref.damageDice ? { damageDice: ref.damageDice } : {}),
    ...(ref.critRange && ref.critRange !== 20 ? { critRange: ref.critRange } : {}),
    ...(ref.critMult && ref.critMult !== 2 ? { critMult: ref.critMult } : {}),
    ...(ref.damageMultiplier && ref.damageMultiplier !== 1
      ? { damageMultiplier: ref.damageMultiplier }
      : {}),
    ...(ref.group ? { group: ref.group } : {}),
    ...(ref.weaponGroups && ref.weaponGroups.length > 0
      ? { weaponGroups: ref.weaponGroups.map(normalizeWeaponGroup) }
      : {}),
    ...(ref.weight ? { weight: ref.weight } : {}),
    // The vendored proficiency tag is always one of the three RAW categories
    // (see data-pipeline's weapons.json) — WeaponRef types it as a plain
    // `string` only because Foundry's own field isn't a closed enum.
    proficiency: weapon.proficiency as WeaponInstance["proficiency"],
    weaponId: weapon.id,
  });
  const weapons = [...(doc.build.weapons ?? []), instance];
  return { ...doc, build: { ...doc.build, weapons } };
}

/**
 * Partially update the weapon at `index` with the given `patch` (fields
 * absent from `patch` are left unchanged — see {@link replaceWeapon} for the
 * "caller has a full replacement object" case), then re-apply
 * {@link normalizeWeaponInstance}. Out-of-range indices are silently ignored.
 */
export function updateWeapon(
  doc: CharacterDoc,
  index: number,
  patch: Partial<WeaponInstance>,
): CharacterDoc {
  const weapons = doc.build.weapons ?? [];
  if (index < 0 || index >= weapons.length) return doc;
  const merged = normalizeWeaponInstance({ ...weapons[index]!, ...patch });
  return {
    ...doc,
    build: {
      ...doc.build,
      weapons: weapons.map((w, i) => (i === index ? merged : w)),
    },
  };
}

/**
 * Replace the weapon at `index` wholesale with `weapon`. Use this (not
 * `updateWeapon`) when the caller already has a complete, edited
 * `WeaponInstance` — e.g. the edit form, which omits fields that match a
 * default (like `enhancement: 0`) for doc minimalism. `updateWeapon`'s merge
 * semantics would treat that omission as "leave unchanged" and silently keep
 * the stale value (so reverting a weapon from +1 back to +0 wouldn't stick).
 * Out-of-range indices are silently ignored.
 */
export function replaceWeapon(
  doc: CharacterDoc,
  index: number,
  weapon: WeaponInstance,
): CharacterDoc {
  const weapons = doc.build.weapons ?? [];
  if (index < 0 || index >= weapons.length) return doc;
  const next = normalizeWeaponInstance(weapon);
  return {
    ...doc,
    build: {
      ...doc.build,
      weapons: weapons.map((w, i) => (i === index ? next : w)),
    },
  };
}

/**
 * Remove the weapon at `index`. Out-of-range indices are silently ignored.
 */
export function removeWeapon(doc: CharacterDoc, index: number): CharacterDoc {
  const weapons = doc.build.weapons ?? [];
  if (index < 0 || index >= weapons.length) return doc;
  return {
    ...doc,
    build: {
      ...doc.build,
      weapons: weapons.filter((_, i) => i !== index),
    },
  };
}

function clampInt(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
