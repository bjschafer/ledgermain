import { useMemo, useState, type ReactNode } from "react";

import type { MetamagicDef } from "@pf1/engine";
import type { AppliedMetamagic, RefData } from "@pf1/schema";

import { effectiveCasterClassLevel } from "../../model/casterLevel.js";
import {
  classSpellsByLevel,
  clearPrepared,
  domainSpellLevelMap,
  isSchoolSlotEligible,
  oppositionCost,
  prepareDomainSpell,
  prepareSchoolSpell,
  prepareSpell,
  preparedSpells,
  removePreparedAt,
  restPreparedSpells,
  schoolSlotCapacity,
  setExpendedAt,
  setPreparedMetamagicLevels,
  spellLevelMap,
  togglePreparedMetamagic,
  unprepareSpell,
} from "../../model/preparedSpells.js";
import {
  appliedMetamagicIncrease,
  metamagicEffectiveIncrease,
  metamagicSlotIncrease,
  ownedMetamagic,
  resolveAppliedMetamagic,
  setMetamagicLevels,
  toggleMetamagic,
} from "../../model/metamagic.js";
import {
  bloodlineSpellsKnown,
  casterClassesOf,
  casterModelFor,
  curseSpellsKnown,
  disciplineSpellsKnown,
  grantedCantrips,
  knownSpellsFor,
  mysterySpellsKnown,
  patronSpellsKnown,
  preparedCapacityByLevel,
  SCHOOL_LABELS,
  shamanSpiritSpellsKnown,
  spellSlotsByLevel,
  spellsPanelVisible,
  storedClassTag,
} from "../../model/spellcasting.js";
import { newDaySummary } from "../../model/rest.js";
import {
  castSpontaneousSlot,
  resetSpontaneousSlots,
  restoreSpontaneousSlot,
  spontaneousSlotStatus,
} from "../../model/spontaneousSpells.js";
import { showToast } from "../../state/toast.js";
import { Panel } from "../builder/Panel.js";
import type { BuilderProps } from "../builder/types.js";
import { Explainer } from "../Explainer.js";
import { TipButton } from "../InfoTip.js";
import { SpellDetail } from "../SpellDetail.js";

interface PreparedRow {
  /** Index into `doc.live.spells.prepared` (stable within this render). */
  index: number;
  spellId: string;
  name: string;
  expended: boolean;
  /**
   * Normal-slot cost of this instance: 1 normally, 2 when the spell is one of
   * the wizard's chosen opposition schools (see `oppositionCost`). 1 for every
   * non-wizard caster (no `wizardOppositionSchools` set).
   */
  cost: number;
  /** The spell's own (base) level, before any metamagic slot bump. */
  baseLevel: number;
  /** Metamagic applied to this instance (issue #71); empty for an unmodified spell. */
  metamagic: AppliedMetamagic[];
}

// ---------------------------------------------------------------------------
// Metamagic attach control (issue #71).
// ---------------------------------------------------------------------------

/**
 * The per-prepared-instance metamagic picker: a collapsible chip list of the
 * owned metamagic feats, each toggling on/off for this instance. Variable
 * feats (Reach/Heighten) expose a small level selector when active. A feat is
 * disabled when applying it (or raising a variable feat's level) would push
 * the spell's slot level past `maxSlotLevel` (the caster's highest slot). Only
 * rendered when the character owns at least one metamagic feat.
 */
function MetamagicControl({
  owned,
  applied,
  baseLevel,
  maxSlotLevel,
  onToggle,
  onSetLevels,
}: {
  owned: MetamagicDef[];
  applied: AppliedMetamagic[];
  baseLevel: number;
  maxSlotLevel: number;
  onToggle: (slug: string) => void;
  onSetLevels: (slug: string, levels: number) => void;
}) {
  if (owned.length === 0) return null;
  const appliedBySlug = new Map(applied.map((a) => [a.slug, a]));
  const currentIncrease = metamagicSlotIncrease(applied);
  const activeCount = applied.length;

  return (
    <details className="prep-metamagic">
      <summary className="prep-metamagic-summary">
        Metamagic{activeCount > 0 ? ` (${activeCount})` : ""}
      </summary>
      <div className="prep-metamagic-list">
        {owned.map((def) => {
          const active = appliedBySlug.get(def.slug);
          const isActive = active !== undefined;
          const thisIncrease = isActive ? appliedMetamagicIncrease(active) : def.slotIncrease;
          const otherIncrease = currentIncrease - (isActive ? thisIncrease : 0);
          // Adding a (default) increment must keep the slot level within reach.
          const wouldExceed =
            !isActive && baseLevel + otherIncrease + def.slotIncrease > maxSlotLevel;
          // For a variable feat, how high its own level may go before the slot
          // would overflow (also capped by the feat's own `maxIncrease`).
          const roomForVariable = maxSlotLevel - baseLevel - otherIncrease;
          const variableMax = Math.min(def.maxIncrease ?? roomForVariable, roomForVariable);

          return (
            <div key={def.slug} className="prep-metamagic-item">
              <button
                type="button"
                className={`mm-chip${isActive ? " is-active" : ""}`}
                aria-pressed={isActive}
                disabled={wouldExceed}
                title={
                  wouldExceed
                    ? `Applying ${def.name} would need a level-${baseLevel + otherIncrease + def.slotIncrease} slot — beyond your highest (level ${maxSlotLevel}).`
                    : def.note
                }
                onClick={() => onToggle(def.slug)}
              >
                {def.name}
                {def.variable ? "" : ` +${def.slotIncrease}`}
              </button>
              {isActive && def.variable && variableMax >= 1 && (
                <label className="mm-levels">
                  <span className="mm-levels-label">+</span>
                  <select
                    className="mm-levels-select"
                    value={appliedMetamagicIncrease(active)}
                    aria-label={`${def.name} level increase`}
                    onChange={(e) => onSetLevels(def.slug, Number(e.currentTarget.value))}
                  >
                    {Array.from({ length: variableMax }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Domain slots — bonus prepared slots for a cleric with chosen domains.
// ---------------------------------------------------------------------------

/**
 * The bonus domain-slot grid for a cleric with chosen domains. PF1 grants ONE
 * domain spell slot per accessible cleric spell level (1–9); the chosen domains
 * determine which spells SOURCED the prepare-from picker offers (union, deduped
 * by id across the chosen domains at each level). Each domain-prepare instance
 * stores `kind: "domain"` on the doc, keeping it out of the class-slot capacity
 * check in {@link PreparedView}.
 */
function DomainSlotsSection({
  doc,
  refData,
  update,
  slots,
  abilityMod,
  classTag,
}: {
  doc: BuilderProps["doc"];
  refData: RefData;
  update: BuilderProps["update"];
  slots: ReturnType<typeof spellSlotsByLevel>;
  classLevel: number;
  abilityMod: number;
  /** Stored class tag (see `model/spellcasting.ts` `storedClassTag`) — cleric's domain slots are always its own, but this scopes the bucketing correctly for a cleric that isn't the document's primary caster class. */
  classTag?: string;
}) {
  const domains = useMemo(() => doc.build.clericDomains ?? [], [doc]);
  const domainMap = useMemo(() => domainSpellLevelMap(refData, domains), [refData, domains]);

  // Bucket domain-kind prepared instances by their domain spell level.
  type Row = { index: number; spellId: string; name: string; expended: boolean };
  const preparedByLevel = new Map<number, Row[]>();
  const prepared = preparedSpells(doc);
  prepared.forEach((p, index) => {
    if ((p.classTag ?? undefined) !== classTag) return;
    if ((p.kind ?? "normal") !== "domain") return;
    const lvl = domainMap.get(p.spellId);
    if (lvl === undefined) return;
    const row: Row = {
      index,
      spellId: p.spellId,
      name: refData.spells[p.spellId]?.name ?? p.spellId,
      expended: p.expended,
    };
    (preparedByLevel.get(lvl) ?? preparedByLevel.set(lvl, []).get(lvl)!).push(row);
  });
  for (const arr of preparedByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

  // Per accessible spell level (1–9), build the union of domain spells the
  // chosen domains offer at that level (deduped by spell id).
  const pickableByLevel = useMemo(() => {
    const out = new Map<number, { id: string; name: string }[]>();
    for (const slot of slots) {
      if (slot.level < 1 || slot.base === null) continue;
      const ids = new Set<string>();
      for (const tag of domains) {
        const list = refData.domainSpellLists[tag];
        if (!list) continue;
        for (const id of list[slot.level] ?? []) ids.add(id);
      }
      const entries: { id: string; name: string }[] = [];
      for (const id of ids) {
        const sp = refData.spells[id];
        if (sp) entries.push({ id, name: sp.name });
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      out.set(slot.level, entries);
    }
    return out;
  }, [slots, domains, refData]);

  const accessibleLevels = [...pickableByLevel.keys()].sort((a, b) => a - b);
  if (accessibleLevels.length === 0) return null;

  return (
    <div className="domain-slots">
      <header className="domain-slots-head">
        <h4 className="domain-slots-title">Domain Slots ({domains.join(", ")})</h4>
        <p className="hint domain-slots-hint">
          One bonus prepare-slot per accessible cleric spell level. Fill it from the chosen domains'
          spell list (a domain-only spell not on the cleric list may only be prepared here).
        </p>
      </header>

      {accessibleLevels.map((level) => {
        const rows = preparedByLevel.get(level) ?? [];
        const total = 1; // PF1: one domain slot per accessible level
        const full = rows.length >= total;
        const pickable = pickableByLevel.get(level) ?? [];

        return (
          <section key={level} className="prep-level is-domain">
            <header className="prep-head">
              <span className="prep-head-label">Domain L{level}</span>
              <span className={`prep-count${rows.length > total ? " is-over" : ""}`}>
                {rows.length}/{total} prepared
                {rows.length > 0 && ` · ${rows.filter((r) => !r.expended).length} ready`}
              </span>
            </header>

            {rows.length > 0 ? (
              <div className="prep-rows">
                {rows.map((r) => {
                  const spellData = refData.spells[r.spellId];
                  return (
                    <div key={r.index} className={`prep-row${r.expended ? " is-expended" : ""}`}>
                      <div className="prep-row-main">
                        <span className="prep-name">{r.name}</span>
                        {spellData && (
                          <SpellDetail
                            spell={spellData}
                            spellLevel={level}
                            abilityMod={abilityMod}
                          />
                        )}
                      </div>
                      {r.expended ? (
                        <button
                          type="button"
                          className="pick-btn add prep-cast"
                          onClick={() => update((d) => setExpendedAt(d, r.index, false))}
                        >
                          Recover
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="pick-btn remove prep-cast"
                          onClick={() => update((d) => setExpendedAt(d, r.index, true))}
                        >
                          Cast
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-ghost prep-x"
                        aria-label={`unprepare ${r.name}`}
                        onClick={() => update((d) => removePreparedAt(d, r.index))}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="prep-none">— domain slot empty —</p>
            )}

            {pickable.length > 0 ? (
              <details className="prep-add">
                <summary>
                  Prepare from {domains.join(", ")} level-{level} list…
                  {full && <span className="prep-full"> domain slot filled</span>}
                </summary>
                <div className="prep-add-list">
                  {pickable.map((sp) => {
                    const count = rows.filter((r) => r.spellId === sp.id && !r.expended).length;
                    const spellData = refData.spells[sp.id];
                    return (
                      <div key={sp.id} className="prep-add-row">
                        <div className="prep-row-main">
                          <span className="prep-name">{sp.name}</span>
                          {spellData && (
                            <SpellDetail
                              spell={spellData}
                              spellLevel={level}
                              abilityMod={abilityMod}
                            />
                          )}
                        </div>
                        {count > 0 && <span className="prep-have">prepared</span>}
                        <TipButton
                          className="pick-btn add"
                          aria-label={`prepare ${sp.name} in the domain slot`}
                          disabled={full}
                          disabledReason="Domain slot is filled — unprepare the current spell first."
                          onClick={() => update((d) => prepareDomainSpell(d, sp.id, classTag))}
                        >
                          Prepare
                        </TipButton>
                      </div>
                    );
                  })}
                </div>
              </details>
            ) : (
              <p className="prep-none">No level-{level} spells in the chosen domains.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// School slots — bonus prepared slots for a specialist wizard.
// ---------------------------------------------------------------------------

/**
 * The bonus school-slot grid for a specialist wizard. PF1 grants ONE school
 * spell slot per accessible spell level 1–9 (never cantrips, never a
 * Universalist);
 * the picker is filtered to spells whose `Spell.school` matches the chosen
 * specialization. Each school-prepare instance stores `kind: "school"` on the
 * doc, keeping it out of the class-slot capacity check in {@link PreparedView}
 * (mirrors {@link DomainSlotsSection}).
 */
function SchoolSlotsSection({
  doc,
  refData,
  update,
  slots,
  abilityMod,
  classTag,
}: {
  doc: BuilderProps["doc"];
  refData: RefData;
  update: BuilderProps["update"];
  slots: ReturnType<typeof spellSlotsByLevel>;
  abilityMod: number;
  /** Stored class tag (see `model/spellcasting.ts` `storedClassTag`) — wizard school slots are always the wizard's own, but this scopes the bucketing correctly for a wizard that isn't the document's primary caster class. */
  classTag?: string;
}) {
  const school = doc.build.wizardSchool;
  const levelMap = useMemo(() => spellLevelMap(refData, "wizard"), [refData]);

  // Bucket school-kind prepared instances by their wizard spell level.
  type Row = { index: number; spellId: string; name: string; expended: boolean };
  const preparedByLevel = new Map<number, Row[]>();
  const prepared = preparedSpells(doc);
  prepared.forEach((p, index) => {
    if ((p.classTag ?? undefined) !== classTag) return;
    if ((p.kind ?? "normal") !== "school") return;
    const lvl = levelMap.get(p.spellId);
    if (lvl === undefined) return;
    const row: Row = {
      index,
      spellId: p.spellId,
      name: refData.spells[p.spellId]?.name ?? p.spellId,
      expended: p.expended,
    };
    (preparedByLevel.get(lvl) ?? preparedByLevel.set(lvl, []).get(lvl)!).push(row);
  });
  for (const arr of preparedByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

  // Per accessible spell level (1–9), the wizard's spellbook spells of the
  // chosen school (in-school AND already known — PF1 RAW requires the bonus
  // slot to be filled from the spellbook, not any spell of that school).
  const pickableByLevel = useMemo(() => {
    const out = new Map<number, { id: string; name: string }[]>();
    if (!school || school === "uni") return out;
    for (const slot of slots) {
      if (slot.level < 1 || slot.base === null) continue;
      const ids = refData.spellLists["wizard"]?.[slot.level] ?? [];
      const entries: { id: string; name: string }[] = [];
      for (const id of ids) {
        const sp = refData.spells[id];
        if (sp && isSchoolSlotEligible(sp, doc, refData)) entries.push({ id, name: sp.name });
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      out.set(slot.level, entries);
    }
    return out;
  }, [slots, school, refData, doc]);

  const accessibleLevels = [...pickableByLevel.keys()].sort((a, b) => a - b);
  if (!school || school === "uni" || accessibleLevels.length === 0) return null;

  const schoolLabel = SCHOOL_LABELS[school] ?? school;

  return (
    <div className="school-slots">
      <header className="school-slots-head">
        <h4 className="school-slots-title">School Slots ({schoolLabel})</h4>
        <p className="hint school-slots-hint">
          One bonus prepare-slot per accessible spell level, exclusive to {schoolLabel} spells (a
          Universalist gets none).
        </p>
      </header>

      {accessibleLevels.map((level) => {
        const rows = preparedByLevel.get(level) ?? [];
        const total = schoolSlotCapacity(level);
        const full = rows.length >= total;
        const pickable = pickableByLevel.get(level) ?? [];

        return (
          <section key={level} className="prep-level is-school">
            <header className="prep-head">
              <span className="prep-head-label">School L{level}</span>
              <span className={`prep-count${rows.length > total ? " is-over" : ""}`}>
                {rows.length}/{total} prepared
                {rows.length > 0 && ` · ${rows.filter((r) => !r.expended).length} ready`}
              </span>
            </header>

            {rows.length > 0 ? (
              <div className="prep-rows">
                {rows.map((r) => {
                  const spellData = refData.spells[r.spellId];
                  return (
                    <div key={r.index} className={`prep-row${r.expended ? " is-expended" : ""}`}>
                      <div className="prep-row-main">
                        <span className="prep-name">{r.name}</span>
                        {spellData && (
                          <SpellDetail
                            spell={spellData}
                            spellLevel={level}
                            abilityMod={abilityMod}
                          />
                        )}
                      </div>
                      {r.expended ? (
                        <button
                          type="button"
                          className="pick-btn add prep-cast"
                          onClick={() => update((d) => setExpendedAt(d, r.index, false))}
                        >
                          Recover
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="pick-btn remove prep-cast"
                          onClick={() => update((d) => setExpendedAt(d, r.index, true))}
                        >
                          Cast
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-ghost prep-x"
                        aria-label={`unprepare ${r.name}`}
                        onClick={() => update((d) => removePreparedAt(d, r.index))}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="prep-none">— school slot empty —</p>
            )}

            {pickable.length > 0 ? (
              <details className="prep-add">
                <summary>
                  Prepare from {schoolLabel} level-{level} list…
                  {full && <span className="prep-full"> school slot filled</span>}
                </summary>
                <div className="prep-add-list">
                  {pickable.map((sp) => {
                    const count = rows.filter((r) => r.spellId === sp.id && !r.expended).length;
                    const spellData = refData.spells[sp.id];
                    return (
                      <div key={sp.id} className="prep-add-row">
                        <div className="prep-row-main">
                          <span className="prep-name">{sp.name}</span>
                          {spellData && (
                            <SpellDetail
                              spell={spellData}
                              spellLevel={level}
                              abilityMod={abilityMod}
                            />
                          )}
                        </div>
                        {count > 0 && <span className="prep-have">prepared</span>}
                        <TipButton
                          className="pick-btn add"
                          aria-label={`prepare ${sp.name} in the school slot`}
                          disabled={full}
                          disabledReason="School slot is filled — unprepare the current spell first."
                          onClick={() => update((d) => prepareSchoolSpell(d, sp.id, classTag))}
                        >
                          Prepare
                        </TipButton>
                      </div>
                    );
                  })}
                </div>
              </details>
            ) : (
              <p className="prep-none">
                No level-{level} {schoolLabel} spells on the wizard list.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prepared-caster (wizard) view
// ---------------------------------------------------------------------------

/**
 * The daily prepared-caster loop. Shows slot capacity, the prepared loadout
 * with Cast/Recover, a picker to prepare more spells, and actions to rest
 * (un-expend) or clear the loadout for re-preparation.
 */
function PreparedView({
  doc,
  sheet,
  refData,
  update,
  undoLast,
  casterTag,
  model,
  classSwitcher,
}: BuilderProps & {
  casterTag: string;
  model: ReturnType<typeof casterModelFor> & {};
  classSwitcher?: ReactNode;
}) {
  const [confirmRecover, setConfirmRecover] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // Applying/removing metamagic re-buckets a prepared row into a different
  // slot level — it visibly jumps between sections. Flash the row on arrival
  // so the move reads as a deliberate change, not a spell vanishing (mirrors
  // the seal recompute-shimmer). The row remounts when it moves, so the cue is
  // driven from here (by prepared-instance index) rather than a per-row hook.
  const [flashInstance, setFlashInstance] = useState<{ index: number; token: number } | null>(null);
  const flashRow = (index: number) =>
    setFlashInstance((prev) => ({ index, token: (prev?.token ?? 0) + 1 }));

  // Stored class tag (see `model/spellcasting.ts` `storedClassTag`): undefined
  // for the primary caster class (the single-caster case, unchanged from
  // before), else `casterTag` — every prepared instance for THIS class
  // carries this exact value in its (possibly absent) `classTag`.
  const classTag = storedClassTag(doc, refData, casterTag);

  const levelMap = useMemo(() => spellLevelMap(refData, casterTag), [refData, casterTag]);
  // RAW class level — feeds the class-FEATURE shaman spirit-magic merge below
  // (issue #66 chunk 2: prestige casting advancement grants table numbers
  // only, never accelerates a class feature — see model/casterLevel.ts's
  // header comment).
  const classLevel = doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 0;
  // Advancement-aware effective class level — feeds the slot-table lookup
  // (spellSlotsByLevel) below.
  const effectiveClassLevel = effectiveCasterClassLevel(doc, refData, casterTag);
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();
  const slots = spellSlotsByLevel(model, effectiveClassLevel, abilityMod);
  // Metamagic (issue #71): owned feats + the highest slot the caster can fill
  // (metamagic can't push a spell past it).
  const owned = useMemo(() => ownedMetamagic(doc, refData), [doc, refData]);
  const maxSlotLevel = slots.length > 0 ? slots[slots.length - 1]!.level : 0;

  const cantripList = useMemo(
    () => (model.grantsAllCantrips ? grantedCantrips(refData, casterTag) : []),
    [model, refData, casterTag],
  );

  const known = useMemo(() => knownSpellsFor(doc, refData, casterTag), [doc, refData, casterTag]);

  // Casters with no curated "known" list (cleric) prepare directly from the
  // full class spell list; everyone else prepares from their known list.
  const knownByLevel = useMemo(() => {
    if (model.preparesFromClassList) {
      const base = classSpellsByLevel(refData, casterTag, {
        excludeCantrips: model.grantsAllCantrips,
      });
      // Shaman spirit magic bonus spells (issue #65): merge in any that
      // aren't already on the base shaman list, so the chosen spirit's
      // spell list is preparable/castable here too, not just displayed in
      // the builder's Spells section — see model/spellcasting.
      // shamanSpiritSpellsKnown.
      if (casterTag !== "shaman") return base;
      const merged = new Map<number, { id: string; name: string }[]>();
      for (const [lvl, arr] of base) merged.set(lvl, [...arr]);
      const present = new Set([...merged.values()].flat().map((e) => e.id));
      for (const sp of shamanSpiritSpellsKnown(refData, doc.build.shamanSpirit, classLevel)) {
        if (present.has(sp.id)) continue;
        (merged.get(sp.level) ?? merged.set(sp.level, []).get(sp.level)!).push({
          id: sp.id,
          name: sp.name,
        });
      }
      for (const arr of merged.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
      return merged;
    }
    const map = new Map<number, { id: string; name: string }[]>();
    for (const id of known) {
      const lvl = levelMap.get(id);
      const sp = refData.spells[id];
      if (lvl === undefined || !sp) continue;
      (map.get(lvl) ?? map.set(lvl, []).get(lvl)!).push({ id, name: sp.name });
    }
    for (const arr of map.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [model, refData, casterTag, known, levelMap, doc.build.shamanSpirit, classLevel]);

  // Only this class's prepared instances (a multiclass character's other
  // caster class(es) are bucketed/rendered by their own PreparedView), kept
  // paired with their ORIGINAL array index — `removePreparedAt`/`setExpendedAt`
  // index into the full `live.spells.prepared` array, not this filtered view.
  const allPrepared = preparedSpells(doc);
  const classPrepared: { p: (typeof allPrepared)[number]; index: number }[] = [];
  allPrepared.forEach((p, index) => {
    if ((p.classTag ?? undefined) === classTag) classPrepared.push({ p, index });
  });

  const preparedByLevel = new Map<number, PreparedRow[]>();
  const preparedCountBySpell = new Map<string, number>();
  classPrepared.forEach(({ p, index }) => {
    // Exclude domain- and school-slot instances — they are bucketed/rendered
    // separately to keep the class slots capacity check honest.
    const kind = p.kind ?? "normal";
    if (kind === "domain" || kind === "school") return;
    const baseLevel = levelMap.get(p.spellId);
    if (baseLevel === undefined) return;
    preparedCountBySpell.set(p.spellId, (preparedCountBySpell.get(p.spellId) ?? 0) + 1);
    const spellData = refData.spells[p.spellId];
    // Metamagic (issue #71): a modified spell occupies — and is bucketed under
    // — a higher slot (base + Σ slot increases), e.g. an Empowered Fireball
    // (base 3rd) lands in the level-5 bucket and counts against its capacity.
    const slotLevel = baseLevel + metamagicSlotIncrease(p.metamagic);
    const row: PreparedRow = {
      index,
      spellId: p.spellId,
      name: spellData?.name ?? p.spellId,
      expended: p.expended,
      cost: spellData ? oppositionCost(spellData, doc) : 1,
      baseLevel,
      metamagic: p.metamagic ?? [],
    };
    (preparedByLevel.get(slotLevel) ?? preparedByLevel.set(slotLevel, []).get(slotLevel)!).push(
      row,
    );
  });
  for (const arr of preparedByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

  const anyExpended = classPrepared.some(({ p }) => p.expended);
  const totalPrepared = classPrepared.length;

  return (
    <Panel
      title="Spells"
      step="ps"
      storageKey="panel:Prepared"
      right={
        <button
          type="button"
          className="btn-ghost rest"
          disabled={!anyExpended}
          title="Same as the global New day action, scoped to this class's spells"
          onClick={() => {
            const next = restPreparedSpells(doc, classTag);
            update(() => next);
            setConfirmClear(false);
            showToast({
              message: newDaySummary(doc, next) || "Spells refreshed",
              action: undoLast ? { label: "Undo", onAction: undoLast } : undefined,
            });
          }}
        >
          New day
        </button>
      }
    >
      {classSwitcher}
      <div className="spell-hints">
        <p className="hint spell-hint-line">
          Prepare spells from your {model.knownLabel.toLowerCase()} into the day's slots, then{" "}
          <strong>Cast</strong> to expend them. <strong>New day</strong> refreshes every slot
          without changing what's prepared.
        </p>
      </div>

      {/* Wipe the loadout to re-prepare from scratch */}
      <div className="prep-actions">
        {totalPrepared > 0 &&
          (confirmClear ? (
            <>
              <span className="prep-clear-confirm-label">Clear all prepared spells?</span>
              <button
                type="button"
                className="pick-btn remove"
                onClick={() => {
                  update((d) => clearPrepared(d, classTag));
                  setConfirmClear(false);
                }}
              >
                Clear all
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn-ghost" onClick={() => setConfirmClear(true)}>
              Re-prepare from scratch
            </button>
          ))}
      </div>

      {totalPrepared === 0 && (
        <p className="hint spell-hint-line prep-empty">
          Nothing prepared yet — open a level below and prepare from your{" "}
          {model.knownLabel.toLowerCase()}.
        </p>
      )}

      <div className="prep-levels">
        {slots.map(({ level, total, bonus }) => {
          const isCantrip = level === 0;
          const rows = preparedByLevel.get(level) ?? [];
          const ready = isCantrip ? rows.length : rows.filter((r) => !r.expended).length;
          // Slot capacity is cost-weighted: an opposition-school spell prepared
          // into a normal slot occupies 2 (PF1 RAW), not 1.
          const usedCapacity = rows.reduce((s, r) => s + r.cost, 0);
          const remaining = total - usedCapacity;
          const over = usedCapacity > total;
          const full = remaining <= 0;
          const knownHere =
            isCantrip && model.grantsAllCantrips ? cantripList : (knownByLevel.get(level) ?? []);

          return (
            <section key={level} className="prep-level">
              <header className="prep-head">
                <span className="prep-head-label">{isCantrip ? "Cantrips" : `Level ${level}`}</span>
                <span className={`prep-count${over ? " is-over" : ""}`}>
                  {usedCapacity}/{total} prepared
                  {!isCantrip && ` · ${ready} ready`}
                  {bonus > 0 && (
                    <span className="prep-bonus">
                      {" "}
                      (+{bonus} {abilityLabel})
                    </span>
                  )}
                </span>
              </header>

              {rows.length > 0 ? (
                <div className="prep-rows">
                  {rows.map((r) => {
                    const spellData = refData.spells[r.spellId];
                    // DC/concentration use the EFFECTIVE level (base + Heighten
                    // only); `level` here is the metamagic-adjusted slot level.
                    const effectiveLevel = r.baseLevel + metamagicEffectiveIncrease(r.metamagic);
                    return (
                      <div key={r.index} className={`prep-row${r.expended ? " is-expended" : ""}`}>
                        {flashInstance?.index === r.index && (
                          <span
                            key={flashInstance.token}
                            className="prep-row-flash"
                            aria-hidden="true"
                          />
                        )}
                        <div className="prep-row-main">
                          <span className="prep-name">{r.name}</span>
                          {r.cost === 2 && (
                            <span className="prep-opposition-badge">costs 2 slots</span>
                          )}
                          {r.metamagic.length > 0 && (
                            <span className="prep-mm-badge" title="Metamagic applied">
                              base L{r.baseLevel}
                            </span>
                          )}
                          {spellData && (
                            <SpellDetail
                              spell={spellData}
                              spellLevel={effectiveLevel}
                              slotLevel={level}
                              abilityMod={abilityMod}
                              metamagic={resolveAppliedMetamagic(r.metamagic)}
                            />
                          )}
                          {!isCantrip && (
                            <MetamagicControl
                              owned={owned}
                              applied={r.metamagic}
                              baseLevel={r.baseLevel}
                              maxSlotLevel={maxSlotLevel}
                              onToggle={(slug) => {
                                update((d) => togglePreparedMetamagic(d, r.index, slug));
                                flashRow(r.index);
                              }}
                              onSetLevels={(slug, n) => {
                                update((d) => setPreparedMetamagicLevels(d, r.index, slug, n));
                                flashRow(r.index);
                              }}
                            />
                          )}
                        </div>
                        {isCantrip ? (
                          <span className="prep-atwill">at will</span>
                        ) : r.expended ? (
                          <button
                            type="button"
                            className={`pick-btn add prep-cast${
                              confirmRecover === r.index ? " prep-confirm" : ""
                            }`}
                            onClick={() => {
                              if (confirmRecover === r.index) {
                                update((d) => setExpendedAt(d, r.index, false));
                                setConfirmRecover(null);
                              } else {
                                setConfirmRecover(r.index);
                              }
                            }}
                            onBlur={() => setConfirmRecover((i) => (i === r.index ? null : i))}
                          >
                            {confirmRecover === r.index ? "Confirm?" : "Recover"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="pick-btn remove prep-cast"
                            onClick={() => {
                              update((d) => setExpendedAt(d, r.index, true));
                              setConfirmRecover(null);
                            }}
                          >
                            Cast
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-ghost prep-x"
                          aria-label={`unprepare ${r.name}`}
                          onClick={() => update((d) => removePreparedAt(d, r.index))}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="prep-none">— none prepared —</p>
              )}

              {knownHere.length > 0 ? (
                <details className="prep-add">
                  <summary>
                    {isCantrip && model.grantsAllCantrips
                      ? "Prepare from granted cantrips…"
                      : `Prepare from ${model.knownLabel.toLowerCase()}…`}
                    {full && <span className="prep-full"> all slots filled</span>}
                  </summary>
                  <div className="prep-add-list">
                    {knownHere.map((sp) => {
                      const count = preparedCountBySpell.get(sp.id) ?? 0;
                      const cantripPrepared = isCantrip && count > 0;
                      const spellData = refData.spells[sp.id];
                      const cost = spellData ? oppositionCost(spellData, doc) : 1;
                      const wontFit = remaining < cost;
                      return (
                        <div key={sp.id} className="prep-add-row">
                          <div className="prep-row-main">
                            <span className="prep-name">{sp.name}</span>
                            {cost === 2 && (
                              <span className="prep-opposition-badge">costs 2 slots</span>
                            )}
                            {spellData && (
                              <SpellDetail
                                spell={spellData}
                                spellLevel={level}
                                abilityMod={abilityMod}
                              />
                            )}
                          </div>
                          {count > 0 && (
                            <span className="prep-have">
                              {isCantrip ? "prepared" : `×${count}`}
                            </span>
                          )}
                          {count > 0 && (
                            <button
                              type="button"
                              className="pick-btn remove"
                              aria-label={`unprepare one ${sp.name}`}
                              onClick={() =>
                                update((d) => unprepareSpell(d, sp.id, undefined, classTag))
                              }
                            >
                              −
                            </button>
                          )}
                          <TipButton
                            className="pick-btn add"
                            aria-label={`prepare ${sp.name}`}
                            disabled={wontFit || cantripPrepared}
                            disabledReason={
                              cantripPrepared
                                ? "Cantrips cast at will — no need to prepare more than one."
                                : cost === 2
                                  ? `${sp.name} is an opposition-school spell and costs 2 slots — only ${remaining} remaining.`
                                  : `All ${total} level-${level} slot${total === 1 ? "" : "s"} are filled — unprepare one first.`
                            }
                            onClick={() => update((d) => prepareSpell(d, sp.id, classTag))}
                          >
                            Prepare
                          </TipButton>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ) : (
                <p className="prep-none prep-nobook">
                  No level-{level} spells in your {model.knownLabel.toLowerCase()}.
                </p>
              )}
            </section>
          );
        })}
      </div>

      {/* Domain slots: one per accessible spell level per chosen domain. */}
      {(doc.build.clericDomains ?? []).length > 0 && casterTag === "cleric" && (
        <DomainSlotsSection
          doc={doc}
          refData={refData}
          update={update}
          slots={slots}
          classLevel={effectiveClassLevel}
          abilityMod={abilityMod}
          classTag={classTag}
        />
      )}

      {/* School slots: one per accessible spell level, specialist wizard only. */}
      {casterTag === "wizard" && doc.build.wizardSchool && doc.build.wizardSchool !== "uni" && (
        <SchoolSlotsSection
          doc={doc}
          refData={refData}
          update={update}
          slots={slots}
          abilityMod={abilityMod}
          classTag={classTag}
        />
      )}
    </Panel>
  );
}

/**
 * Spontaneous caster daily tracking. Shows per-level slot pools (used/total)
 * with the list of known spells at each level and a "Cast" button that spends
 * one slot. No preparation needed — any known spell can be cast at any level
 * slot for which it qualifies.
 */
function SpontaneousView({
  doc,
  sheet,
  refData,
  update,
  undoLast,
  casterTag,
  model,
  classSwitcher,
}: BuilderProps & {
  casterTag: string;
  model: ReturnType<typeof casterModelFor> & {};
  classSwitcher?: ReactNode;
}) {
  // Stored class tag (see `model/spellcasting.ts` `storedClassTag`): undefined
  // for the primary caster class, else `casterTag` — scopes slotsUsed(ByClass)
  // to this class only.
  const classTag = storedClassTag(doc, refData, casterTag);

  const levelMap = useMemo(() => spellLevelMap(refData, casterTag), [refData, casterTag]);
  // RAW class level — feeds the bloodline/mystery/discipline/patron bonus-
  // spell-known merges below (issue #66 chunk 2: prestige casting advancement
  // grants table numbers only, never accelerates a class feature — see
  // model/casterLevel.ts's header comment).
  const classLevel = doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 0;
  // Advancement-aware effective class level — feeds the slot-table lookups
  // (spellSlotsByLevel/spontaneousSlotStatus/castSpontaneousSlot) below.
  const effectiveClassLevel = effectiveCasterClassLevel(doc, refData, casterTag);
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();

  // Full slot breakdown includes base + bonus per level; use for bonus display.
  const slotsPerLevel = useMemo(
    () => spellSlotsByLevel(model, effectiveClassLevel, abilityMod),
    [model, effectiveClassLevel, abilityMod],
  );
  const slotBonusByLevel = new Map(slotsPerLevel.map((s) => [s.level, s.bonus]));

  const status = spontaneousSlotStatus(doc, model, effectiveClassLevel, abilityMod, classTag);
  const anyUsed = status.some((s) => s.used > 0);

  // Metamagic (issue #71): a spontaneous caster applies metamagic AT CAST time
  // — the choice is transient (nothing is stored on the doc; casting just
  // spends a higher slot), so it lives in component state keyed by spell id.
  const owned = useMemo(() => ownedMetamagic(doc, refData), [doc, refData]);
  const [castMetamagic, setCastMetamagic] = useState<Record<string, AppliedMetamagic[]>>({});
  const maxSlotLevel = status.length > 0 ? status[status.length - 1]!.level : 0;
  const remainingByLevel = new Map(status.map((s) => [s.level, s.remaining]));
  const toggleCastMM = (spellId: string, slug: string) =>
    setCastMetamagic((prev) => ({
      ...prev,
      [spellId]: toggleMetamagic(prev[spellId] ?? [], slug),
    }));
  const setCastMMLevels = (spellId: string, slug: string, n: number) =>
    setCastMetamagic((prev) => ({
      ...prev,
      [spellId]: setMetamagicLevels(prev[spellId] ?? [], slug, n),
    }));

  const knownList = useMemo(
    () => knownSpellsFor(doc, refData, casterTag),
    [doc, refData, casterTag],
  );

  // Known spells by spell level (cantrips land in level 0 here too, unless
  // grantsAllCantrips sources them from the whole class list below instead).
  const knownByLevel = new Map<number, { id: string; name: string }[]>();
  for (const id of knownList) {
    const lvl = levelMap.get(id);
    const sp = refData.spells[id];
    if (lvl === undefined || !sp) continue;
    (knownByLevel.get(lvl) ?? knownByLevel.set(lvl, []).get(lvl)!).push({ id, name: sp.name });
  }
  // Bloodline bonus spells known: auto-granted, castable at the table just like
  // chosen known spells (they still consume a slot of the matching level — only
  // the spells-known *cap* exempts them, not slot spending). Merge in, skipping
  // ids already present (e.g. also separately added to `known`) to avoid dupes.
  if (casterTag === "sorcerer") {
    const known = new Set(knownList);
    for (const sp of bloodlineSpellsKnown(refData, doc.build.sorcererBloodline, classLevel)) {
      if (known.has(sp.id)) continue;
      (knownByLevel.get(sp.level) ?? knownByLevel.set(sp.level, []).get(sp.level)!).push({
        id: sp.id,
        name: sp.name,
      });
    }
  }
  // Oracle mystery + curse bonus spells known: same treatment as sorcerer
  // bloodline spells above — castable at the table, only exempt from the cap.
  if (casterTag === "oracle") {
    const known = new Set(knownList);
    const bonus = [
      ...mysterySpellsKnown(refData, doc.build.oracleMystery, classLevel),
      ...curseSpellsKnown(refData, doc.build.oracleCurse, classLevel),
    ];
    for (const sp of bonus) {
      if (known.has(sp.id)) continue;
      (knownByLevel.get(sp.level) ?? knownByLevel.set(sp.level, []).get(sp.level)!).push({
        id: sp.id,
        name: sp.name,
      });
    }
  }
  // Psychic discipline bonus spells known: same treatment as sorcerer
  // bloodline spells above — castable at the table, only exempt from the
  // known cap. Unlike the oracle branch, entries are filed under the spell's
  // own castable spell level (via `levelMap`, falling back to the spell's
  // nominal level) — `disciplineSpellsKnown`'s `level` field is the psychic
  // CLASS level that unlocked the spell (1, 4, 6, ..., 18), not a slot level.
  if (casterTag === "psychic") {
    const known = new Set(knownList);
    for (const sp of disciplineSpellsKnown(refData, doc.build.psychicDiscipline, classLevel)) {
      if (known.has(sp.id)) continue;
      const lvl = levelMap.get(sp.id) ?? refData.spells[sp.id]?.level;
      if (lvl === undefined) continue;
      (knownByLevel.get(lvl) ?? knownByLevel.set(lvl, []).get(lvl)!).push({
        id: sp.id,
        name: sp.name,
      });
    }
  }
  // Witch patron bonus spells known (added to the familiar's spells): same
  // treatment as sorcerer bloodline spells above — castable at the table,
  // only exempt from the known cap. Like the psychic branch above (and
  // unlike the oracle branch), entries are filed under the spell's own
  // castable spell level via `levelMap` — `patronSpellsKnown`'s `level`
  // field is the WITCH class level that unlocked the spell (2, 4, ..., 18),
  // not a slot level. A patron spell that doesn't resolve against the
  // vendored spell slice at all (see `patronSpellsKnown`'s doc comment) has
  // no `levelMap` entry either, so it's silently skipped here — same
  // "unresolvable, never thrown" tolerance every other bonus-spell merge
  // above uses.
  if (casterTag === "witch") {
    const known = new Set(knownList);
    for (const sp of patronSpellsKnown(refData, doc.build.witchPatron, classLevel)) {
      if (known.has(sp.id)) continue;
      const lvl = levelMap.get(sp.id) ?? refData.spells[sp.id]?.level;
      if (lvl === undefined) continue;
      (knownByLevel.get(lvl) ?? knownByLevel.set(lvl, []).get(lvl)!).push({
        id: sp.id,
        name: sp.name,
      });
    }
  }
  for (const arr of knownByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

  // Cantrips: at-will, no slots tracked. Either the whole class list (when
  // grantsAllCantrips) or the caster's limited known cantrips (level 0).
  const cantripList = model.grantsAllCantrips
    ? grantedCantrips(refData, casterTag)
    : (knownByLevel.get(0) ?? []);

  return (
    <Panel
      title="Spells"
      step="ps"
      storageKey="panel:Prepared"
      right={
        <button
          type="button"
          className="btn-ghost rest"
          disabled={!anyUsed}
          title="Same as the global New day action, scoped to this class's spells"
          onClick={() => {
            const next = resetSpontaneousSlots(doc, classTag);
            update(() => next);
            showToast({
              message: newDaySummary(doc, next) || "Spells refreshed",
              action: undoLast ? { label: "Undo", onAction: undoLast } : undefined,
            });
          }}
        >
          New day
        </button>
      }
    >
      {classSwitcher}
      <div className="spell-hints">
        <p className="hint spell-hint-line">
          Spontaneous caster: spend a slot of the required level to cast any spell you know.{" "}
          <strong>New day</strong> restores all slots.
        </p>
      </div>

      {/* Cantrips: at-will, no slot tracking */}
      {cantripList.length > 0 && (
        <section className="prep-level">
          <header className="prep-head">
            <span className="prep-head-label">Cantrips</span>
            <span className="prep-count">at will</span>
          </header>
          <div className="prep-rows">
            {cantripList.map((c) => {
              const spellData = refData.spells[c.id];
              return (
                <div key={c.id} className="prep-row">
                  <div className="prep-row-main">
                    <span className="prep-name">{c.name}</span>
                    {spellData && (
                      <SpellDetail spell={spellData} spellLevel={0} abilityMod={abilityMod} />
                    )}
                  </div>
                  <span className="prep-atwill">at will</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Spell levels 1–9: slot pools + known spells */}
      <div className="prep-levels">
        {status.map(({ level, used, total, remaining }) => {
          const bonus = slotBonusByLevel.get(level) ?? 0;
          const knownHere = knownByLevel.get(level) ?? [];
          const isExhausted = remaining === 0;

          return (
            <section key={level} className="prep-level">
              <header className="prep-head">
                <span className="prep-head-label">Level {level}</span>
                <span className={`prep-count${isExhausted ? " is-over" : ""}`}>
                  {remaining}/{total} remaining
                  {bonus > 0 && (
                    <span className="prep-bonus">
                      {" "}
                      (+{bonus} {abilityLabel})
                    </span>
                  )}
                </span>
              </header>

              {/* Slot pips */}
              <div className="spontaneous-pips">
                {Array.from({ length: total }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`spontaneous-pip${i < used ? " is-used" : ""}`}
                    aria-label={i < used ? `restore slot ${i + 1}` : `slot ${i + 1} available`}
                    title={i < used ? "Click to restore slot (undo cast)" : "Slot available"}
                    onClick={() => {
                      if (i < used) {
                        update((d) => restoreSpontaneousSlot(d, level, classTag));
                      }
                    }}
                  />
                ))}
              </div>

              {knownHere.length > 0 ? (
                <div className="prep-rows">
                  {knownHere.map((sp) => {
                    const spellData = refData.spells[sp.id];
                    // Cast-time metamagic (issue #71): the chosen feats bump the
                    // slot the Cast button spends; only Heighten also raises the
                    // effective level (and thus DC).
                    const applied = castMetamagic[sp.id] ?? [];
                    const castLevel = level + metamagicSlotIncrease(applied);
                    const effectiveLevel = level + metamagicEffectiveIncrease(applied);
                    const castRemaining = remainingByLevel.get(castLevel) ?? 0;
                    const castExhausted = castRemaining <= 0;
                    return (
                      <div key={sp.id} className="prep-row">
                        <div className="prep-row-main">
                          <span className="prep-name">{sp.name}</span>
                          {spellData && (
                            <SpellDetail
                              spell={spellData}
                              spellLevel={effectiveLevel}
                              slotLevel={castLevel}
                              abilityMod={abilityMod}
                              metamagic={resolveAppliedMetamagic(applied)}
                            />
                          )}
                          <MetamagicControl
                            owned={owned}
                            applied={applied}
                            baseLevel={level}
                            maxSlotLevel={maxSlotLevel}
                            onToggle={(slug) => toggleCastMM(sp.id, slug)}
                            onSetLevels={(slug, n) => setCastMMLevels(sp.id, slug, n)}
                          />
                        </div>
                        <TipButton
                          className="pick-btn remove prep-cast"
                          disabled={castExhausted}
                          disabledReason={`No level-${castLevel} slots remaining`}
                          title={
                            castLevel === level
                              ? `Cast ${sp.name} (spend 1 level-${level} slot)`
                              : `Cast ${sp.name} with metamagic (spend 1 level-${castLevel} slot)`
                          }
                          onClick={() =>
                            update((d) =>
                              castSpontaneousSlot(
                                d,
                                model,
                                effectiveClassLevel,
                                abilityMod,
                                castLevel,
                                classTag,
                              ),
                            )
                          }
                        >
                          Cast
                        </TipButton>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="prep-none prep-nobook">
                  No level-{level} spells in your {model.knownLabel.toLowerCase()}.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Hybrid caster (arcanist) view — prepare from spellbook, cast from a slot pool
// ---------------------------------------------------------------------------

/**
 * The arcanist's daily loop, combining pieces of {@link PreparedView} and
 * {@link SpontaneousView} rather than inventing new machinery: a **Prepare**
 * section (wizard-shaped — ready spells from the spellbook, capped by
 * `preparedCapacityByLevel`/`preparedProgression`, no ability bonus) feeds a
 * separate **Cast** section (sorcerer-shaped — spend a per-level slot from
 * `spellSlotsByLevel`/`progression`, ability-bonus slots included) that offers
 * whatever is CURRENTLY prepared at that level. Casting never expends the
 * specific prepared instance — unlike {@link PreparedView}, prepared rows here
 * have no Cast/Recover button, only Prepare/Unprepare; "New day" only needs to
 * reset the slot pool (`resetSpontaneousSlots`) since nothing in the prepared
 * loadout is ever marked expended, but `restPreparedSpells` is called too for
 * defense-in-depth (a harmless no-op today, matching `model/rest.ts`'s global
 * "new day" action).
 */
function HybridView({
  doc,
  sheet,
  refData,
  update,
  undoLast,
  casterTag,
  model,
  classSwitcher,
}: BuilderProps & {
  casterTag: string;
  model: ReturnType<typeof casterModelFor> & {};
  classSwitcher?: ReactNode;
}) {
  const [confirmClear, setConfirmClear] = useState(false);

  const classTag = storedClassTag(doc, refData, casterTag);
  const levelMap = useMemo(() => spellLevelMap(refData, casterTag), [refData, casterTag]);
  // Advancement-aware effective class level (issue #66 chunk 2) — arcanist
  // (the only hybrid caster modeled) has no class-feature bonus-spell-known
  // mechanic keyed off raw class level, so unlike PreparedView/SpontaneousView
  // above, every classLevel use in this view can safely be the effective one.
  const effectiveClassLevel = effectiveCasterClassLevel(doc, refData, casterTag);
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();

  // Prepare: wizard-shaped daily readying cap (no ability bonus).
  const preparedCapacity = useMemo(
    () => preparedCapacityByLevel(model, effectiveClassLevel),
    [model, effectiveClassLevel],
  );
  // Cast: sorcerer-shaped per-day slot pool (ability-bonus slots included).
  const castSlots = useMemo(
    () => spellSlotsByLevel(model, effectiveClassLevel, abilityMod),
    [model, effectiveClassLevel, abilityMod],
  );
  const castStatus = spontaneousSlotStatus(doc, model, effectiveClassLevel, abilityMod, classTag);
  const castStatusByLevel = new Map(castStatus.map((s) => [s.level, s]));
  const castBonusByLevel = new Map(castSlots.map((s) => [s.level, s.bonus]));
  const anyCastUsed = castStatus.some((s) => s.used > 0);

  // Cast-time metamagic (issue #71): like a spontaneous caster, an arcanist
  // applies metamagic when casting, spending a higher slot — a transient,
  // un-persisted choice kept in component state keyed by spell id.
  const owned = useMemo(() => ownedMetamagic(doc, refData), [doc, refData]);
  const [castMetamagic, setCastMetamagic] = useState<Record<string, AppliedMetamagic[]>>({});
  const maxSlotLevel = castStatus.length > 0 ? castStatus[castStatus.length - 1]!.level : 0;
  const toggleCastMM = (spellId: string, slug: string) =>
    setCastMetamagic((prev) => ({
      ...prev,
      [spellId]: toggleMetamagic(prev[spellId] ?? [], slug),
    }));
  const setCastMMLevels = (spellId: string, slug: string, n: number) =>
    setCastMetamagic((prev) => ({
      ...prev,
      [spellId]: setMetamagicLevels(prev[spellId] ?? [], slug, n),
    }));

  const cantripList = useMemo(
    () => (model.grantsAllCantrips ? grantedCantrips(refData, casterTag) : []),
    [model, refData, casterTag],
  );
  const known = useMemo(() => knownSpellsFor(doc, refData, casterTag), [doc, refData, casterTag]);

  const knownByLevel = useMemo(() => {
    const map = new Map<number, { id: string; name: string }[]>();
    for (const id of known) {
      const lvl = levelMap.get(id);
      const sp = refData.spells[id];
      if (lvl === undefined || !sp) continue;
      (map.get(lvl) ?? map.set(lvl, []).get(lvl)!).push({ id, name: sp.name });
    }
    for (const arr of map.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [known, levelMap, refData]);

  // This class's prepared instances (arcanist has no domain/school bonus
  // slots, so every instance is `kind: "normal"`), paired with their original
  // index into `live.spells.prepared` for `removePreparedAt`.
  type PrepRow = { index: number; spellId: string; name: string };
  const allPrepared = preparedSpells(doc);
  const preparedByLevel = new Map<number, PrepRow[]>();
  const preparedCountBySpell = new Map<string, number>();
  allPrepared.forEach((p, index) => {
    if ((p.classTag ?? undefined) !== classTag) return;
    if ((p.kind ?? "normal") !== "normal") return;
    const lvl = levelMap.get(p.spellId);
    if (lvl === undefined) return;
    preparedCountBySpell.set(p.spellId, (preparedCountBySpell.get(p.spellId) ?? 0) + 1);
    const spellData = refData.spells[p.spellId];
    const row: PrepRow = { index, spellId: p.spellId, name: spellData?.name ?? p.spellId };
    (preparedByLevel.get(lvl) ?? preparedByLevel.set(lvl, []).get(lvl)!).push(row);
  });
  for (const arr of preparedByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

  // Distinct prepared spell ids per level — what the Cast section offers.
  const preparedIdsByLevel = new Map<number, { id: string; name: string }[]>();
  for (const [lvl, rows] of preparedByLevel) {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    for (const r of rows) {
      if (seen.has(r.spellId)) continue;
      seen.add(r.spellId);
      list.push({ id: r.spellId, name: r.name });
    }
    preparedIdsByLevel.set(lvl, list);
  }

  const totalPrepared = allPrepared.filter(
    (p) => (p.classTag ?? undefined) === classTag && (p.kind ?? "normal") === "normal",
  ).length;

  const cantripCapacity = preparedCapacity.find((c) => c.level === 0)?.limit;
  const preparedCantrips = preparedByLevel.get(0) ?? [];

  // "Prepare" auto-collapses once every level's daily prepare capacity is
  // filled, since at-the-table play mostly lives in "Cast" below; it reopens
  // automatically the moment a level has room again, but a manual toggle
  // (tracked here once the player uses it) always wins over that default.
  const allLevelsFull = preparedCapacity.every(
    ({ level, limit }) => (preparedByLevel.get(level)?.length ?? 0) >= limit,
  );
  const [prepareManualOpen, setPrepareManualOpen] = useState<boolean | null>(null);
  const prepareOpen = prepareManualOpen ?? !allLevelsFull;

  return (
    <Panel
      title="Spells"
      step="ps"
      storageKey="panel:Prepared"
      right={
        <button
          type="button"
          className="btn-ghost rest"
          disabled={!anyCastUsed}
          title="Same as the global New day action, scoped to this class's spells"
          onClick={() => {
            const next = resetSpontaneousSlots(restPreparedSpells(doc, classTag), classTag);
            update(() => next);
            setConfirmClear(false);
            showToast({
              message: newDaySummary(doc, next) || "Spells refreshed",
              action: undoLast ? { label: "Undo", onAction: undoLast } : undefined,
            });
          }}
        >
          New day
        </button>
      }
    >
      {classSwitcher}
      <Explainer title="How hybrid casting works">
        <p className="hint">
          Hybrid caster: <strong>prepare</strong> spells from your {model.knownLabel.toLowerCase()}{" "}
          below, then <strong>cast</strong> any of them by spending a slot in the Cast section —
          casting never uses up the prepared spell itself, only a slot. <strong>New day</strong>{" "}
          refreshes every slot without changing what's prepared.
        </p>
      </Explainer>

      <div className="prep-actions">
        {totalPrepared > 0 &&
          (confirmClear ? (
            <>
              <span className="prep-clear-confirm-label">Clear all prepared spells?</span>
              <button
                type="button"
                className="pick-btn remove"
                onClick={() => {
                  update((d) => clearPrepared(d, classTag));
                  setConfirmClear(false);
                }}
              >
                Clear all
              </button>
              <button type="button" className="btn-ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="btn-ghost" onClick={() => setConfirmClear(true)}>
              Re-prepare from scratch
            </button>
          ))}
      </div>

      {totalPrepared === 0 && (
        <p className="hint spell-hint-line prep-empty">
          Nothing prepared yet — open a level below and prepare from your{" "}
          {model.knownLabel.toLowerCase()}.
        </p>
      )}

      {/* Cantrips are readied in Prepare below but never cast from a slot (the
          spells-per-day table has no level-0 column), so they'd otherwise only
          exist inside a section that auto-collapses once prepping is done. */}
      {cantripCapacity !== undefined && (
        <section className="prep-level">
          <header className="prep-head">
            <span className="prep-head-label">Cantrips</span>
            <span
              className={`prep-count${preparedCantrips.length > cantripCapacity ? " is-over" : ""}`}
            >
              {preparedCantrips.length}/{cantripCapacity} prepared · at will
            </span>
          </header>
          {preparedCantrips.length > 0 ? (
            <div className="prep-rows">
              {preparedCantrips.map((r) => (
                <div key={r.index} className="prep-row">
                  <div className="prep-row-main">
                    <span className="prep-name">{r.name}</span>
                    {refData.spells[r.spellId] && (
                      <SpellDetail
                        spell={refData.spells[r.spellId]!}
                        spellLevel={0}
                        abilityMod={abilityMod}
                      />
                    )}
                  </div>
                  <span className="prep-atwill">at will</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="prep-none prep-nobook">
              No cantrips prepared — ready up to {cantripCapacity} in <strong>Prepare</strong>{" "}
              below; they then cast at will.
            </p>
          )}
        </section>
      )}

      <h4 className="hybrid-section-title">Cast (spend a slot)</h4>
      <div className="prep-levels">
        {castSlots.map(({ level, total }) => {
          const status = castStatusByLevel.get(level);
          const used = status?.used ?? 0;
          const remaining = status?.remaining ?? total;
          const bonus = castBonusByLevel.get(level) ?? 0;
          const isExhausted = remaining === 0;
          const preparedHere = preparedIdsByLevel.get(level) ?? [];

          return (
            <section key={level} className="prep-level">
              <header className="prep-head">
                <span className="prep-head-label">Level {level}</span>
                <span className={`prep-count${isExhausted ? " is-over" : ""}`}>
                  {remaining}/{total} remaining
                  {bonus > 0 && (
                    <span className="prep-bonus">
                      {" "}
                      (+{bonus} {abilityLabel})
                    </span>
                  )}
                </span>
              </header>

              <div className="spontaneous-pips">
                {Array.from({ length: total }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`spontaneous-pip${i < used ? " is-used" : ""}`}
                    aria-label={i < used ? `restore slot ${i + 1}` : `slot ${i + 1} available`}
                    title={i < used ? "Click to restore slot (undo cast)" : "Slot available"}
                    onClick={() => {
                      if (i < used) {
                        update((d) => restoreSpontaneousSlot(d, level, classTag));
                      }
                    }}
                  />
                ))}
              </div>

              {preparedHere.length > 0 ? (
                <div className="prep-rows">
                  {preparedHere.map((sp) => {
                    const spellData = refData.spells[sp.id];
                    const applied = castMetamagic[sp.id] ?? [];
                    const castLevel = level + metamagicSlotIncrease(applied);
                    const effectiveLevel = level + metamagicEffectiveIncrease(applied);
                    const castRemaining = castStatusByLevel.get(castLevel)?.remaining ?? 0;
                    const castExhausted = castRemaining <= 0;
                    return (
                      <div key={sp.id} className="prep-row">
                        <div className="prep-row-main">
                          <span className="prep-name">{sp.name}</span>
                          {spellData && (
                            <SpellDetail
                              spell={spellData}
                              spellLevel={effectiveLevel}
                              slotLevel={castLevel}
                              abilityMod={abilityMod}
                              metamagic={resolveAppliedMetamagic(applied)}
                            />
                          )}
                          <MetamagicControl
                            owned={owned}
                            applied={applied}
                            baseLevel={level}
                            maxSlotLevel={maxSlotLevel}
                            onToggle={(slug) => toggleCastMM(sp.id, slug)}
                            onSetLevels={(slug, n) => setCastMMLevels(sp.id, slug, n)}
                          />
                        </div>
                        <TipButton
                          className="pick-btn remove prep-cast"
                          disabled={castExhausted}
                          disabledReason={`No level-${castLevel} slots remaining`}
                          title={
                            castLevel === level
                              ? `Cast ${sp.name} (spend 1 level-${level} slot)`
                              : `Cast ${sp.name} with metamagic (spend 1 level-${castLevel} slot)`
                          }
                          onClick={() =>
                            update((d) =>
                              castSpontaneousSlot(
                                d,
                                model,
                                effectiveClassLevel,
                                abilityMod,
                                castLevel,
                                classTag,
                              ),
                            )
                          }
                        >
                          Cast
                        </TipButton>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="prep-none prep-nobook">
                  Nothing prepared at level {level} yet — prepare a spell above.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <details
        className="hybrid-prepare"
        open={prepareOpen}
        onToggle={(e) => setPrepareManualOpen(e.currentTarget.open)}
      >
        <summary className="hybrid-section-title hybrid-prepare-summary">
          Prepare (from {model.knownLabel.toLowerCase()})
        </summary>
        <div className="prep-levels">
          {preparedCapacity.map(({ level, limit }) => {
            const isCantrip = level === 0;
            const rows = preparedByLevel.get(level) ?? [];
            const usedCapacity = rows.length;
            const remaining = limit - usedCapacity;
            const over = usedCapacity > limit;
            const full = remaining <= 0;
            const knownHere =
              isCantrip && model.grantsAllCantrips ? cantripList : (knownByLevel.get(level) ?? []);

            return (
              <section key={level} className="prep-level">
                <header className="prep-head">
                  <span className="prep-head-label">
                    {isCantrip ? "Cantrips" : `Level ${level}`}
                  </span>
                  <span className={`prep-count${over ? " is-over" : ""}`}>
                    {usedCapacity}/{limit} prepared
                  </span>
                </header>

                {rows.length > 0 ? (
                  <div className="prep-rows">
                    {rows.map((r) => (
                      <div key={r.index} className="prep-row">
                        <div className="prep-row-main">
                          <span className="prep-name">{r.name}</span>
                          {isCantrip && <span className="prep-atwill">at will</span>}
                          {refData.spells[r.spellId] && (
                            <SpellDetail
                              spell={refData.spells[r.spellId]!}
                              spellLevel={level}
                              abilityMod={abilityMod}
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn-ghost prep-x"
                          aria-label={`unprepare ${r.name}`}
                          onClick={() => update((d) => removePreparedAt(d, r.index))}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="prep-none">— none prepared —</p>
                )}

                {knownHere.length > 0 ? (
                  <details className="prep-add">
                    <summary>
                      {isCantrip && model.grantsAllCantrips
                        ? "Prepare from granted cantrips…"
                        : `Prepare from ${model.knownLabel.toLowerCase()}…`}
                      {full && <span className="prep-full"> all slots filled</span>}
                    </summary>
                    <div className="prep-add-list">
                      {knownHere.map((sp) => {
                        const count = preparedCountBySpell.get(sp.id) ?? 0;
                        const cantripPrepared = isCantrip && count > 0;
                        const spellData = refData.spells[sp.id];
                        const wontFit = remaining < 1;
                        return (
                          <div key={sp.id} className="prep-add-row">
                            <div className="prep-row-main">
                              <span className="prep-name">{sp.name}</span>
                              {spellData && (
                                <SpellDetail
                                  spell={spellData}
                                  spellLevel={level}
                                  abilityMod={abilityMod}
                                />
                              )}
                            </div>
                            {count > 0 && (
                              <span className="prep-have">
                                {isCantrip ? "prepared" : `×${count}`}
                              </span>
                            )}
                            {count > 0 && (
                              <button
                                type="button"
                                className="pick-btn remove"
                                aria-label={`unprepare one ${sp.name}`}
                                onClick={() =>
                                  update((d) => unprepareSpell(d, sp.id, undefined, classTag))
                                }
                              >
                                −
                              </button>
                            )}
                            <TipButton
                              className="pick-btn add"
                              aria-label={`prepare ${sp.name}`}
                              disabled={wontFit || cantripPrepared}
                              disabledReason={
                                cantripPrepared
                                  ? "Cantrips cast at will — no need to prepare more than one."
                                  : `All ${limit} level-${level} prepare slot${limit === 1 ? "" : "s"} are filled — unprepare one first.`
                              }
                              onClick={() => update((d) => prepareSpell(d, sp.id, classTag))}
                            >
                              Prepare
                            </TipButton>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ) : (
                  <p className="prep-none prep-nobook">
                    No level-{level} spells in your {model.knownLabel.toLowerCase()}.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </details>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Public component: branches on preparation type
// ---------------------------------------------------------------------------

/**
 * The daily spell tracking panel. For prepared casters (wizard) this is the
 * loadout loop; for spontaneous casters (sorcerer) it is the slot-pool view.
 *
 * Multiclass support (issue #22): with 2+ caster classes on the document, a
 * class switcher lets the player pick which class's spells this panel shows
 * — including which preparation MODE applies, since a cleric/sorcerer
 * multiclass needs the prepared loop for one class's tab and the spontaneous
 * slot-pool view for the other. A single-caster document never renders the
 * switcher, so its behavior is unchanged from before multiclass support.
 */
export function PreparedSpellsPanel({ doc, sheet, refData, update }: BuilderProps) {
  const casters = useMemo(() => casterClassesOf(doc, refData), [doc, refData]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const casterTag =
    (selectedTag && casters.some((c) => c.tag === selectedTag) ? selectedTag : casters[0]?.tag) ??
    undefined;
  const model = casterTag ? casterModelFor(casterTag) : undefined;

  if (!casterTag || !model) {
    // No caster class and no spell state to strand: show nothing rather than an
    // empty panel. An actual caster whose class isn't modelled yet keeps the
    // message — that's a gap worth surfacing, not an absent feature.
    if (!casterTag && !spellsPanelVisible(doc, refData)) return null;
    return (
      <Panel title="Spells" step="ps" storageKey="panel:Prepared">
        <p className="empty">
          {casterTag
            ? "Spell tracking isn't modelled for this class yet."
            : "No spellcasting class selected."}
        </p>
      </Panel>
    );
  }

  const classSwitcher =
    casters.length > 1 ? (
      <div className="chips spell-class-switcher" role="tablist" aria-label="Caster class">
        {casters.map((c) => (
          <button
            key={c.tag}
            type="button"
            className="chip"
            role="tab"
            aria-selected={casterTag === c.tag}
            aria-pressed={casterTag === c.tag}
            onClick={() => setSelectedTag(c.tag)}
          >
            {refData.classes[c.tag]?.name ?? c.tag} {c.level}
          </button>
        ))}
      </div>
    ) : null;

  if (model.preparation === "spontaneous") {
    return (
      <SpontaneousView
        doc={doc}
        sheet={sheet}
        refData={refData}
        update={update}
        casterTag={casterTag}
        model={model}
        classSwitcher={classSwitcher}
      />
    );
  }

  if (model.preparation === "hybrid") {
    return (
      <HybridView
        doc={doc}
        sheet={sheet}
        refData={refData}
        update={update}
        casterTag={casterTag}
        model={model}
        classSwitcher={classSwitcher}
      />
    );
  }

  return (
    <PreparedView
      doc={doc}
      sheet={sheet}
      refData={refData}
      update={update}
      casterTag={casterTag}
      model={model}
      classSwitcher={classSwitcher}
    />
  );
}
