import { useMemo, useState, type ReactNode } from "react";

import type { RefData } from "@pf1/schema";

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
  spellLevelMap,
  unprepareSpell,
} from "../../model/preparedSpells.js";
import {
  bloodlineSpellsKnown,
  casterClassesOf,
  casterModelFor,
  curseSpellsKnown,
  grantedCantrips,
  knownSpellsFor,
  mysterySpellsKnown,
  preparedCapacityByLevel,
  SCHOOL_LABELS,
  spellSlotsByLevel,
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
                        <button
                          type="button"
                          className="pick-btn add"
                          aria-label={`prepare ${sp.name} in the domain slot`}
                          disabled={full}
                          title={
                            full
                              ? "Domain slot is filled — unprepare the current spell first."
                              : undefined
                          }
                          onClick={() => update((d) => prepareDomainSpell(d, sp.id, classTag))}
                        >
                          Prepare
                        </button>
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
 * Universalist — see the RAW correction in IMPLEMENTATION_PLAN.md Stage 2);
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
                        <button
                          type="button"
                          className="pick-btn add"
                          aria-label={`prepare ${sp.name} in the school slot`}
                          disabled={full}
                          title={
                            full
                              ? "School slot is filled — unprepare the current spell first."
                              : undefined
                          }
                          onClick={() => update((d) => prepareSchoolSpell(d, sp.id, classTag))}
                        >
                          Prepare
                        </button>
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

  // Stored class tag (see `model/spellcasting.ts` `storedClassTag`): undefined
  // for the primary caster class (the single-caster case, unchanged from
  // before), else `casterTag` — every prepared instance for THIS class
  // carries this exact value in its (possibly absent) `classTag`.
  const classTag = storedClassTag(doc, refData, casterTag);

  const levelMap = useMemo(() => spellLevelMap(refData, casterTag), [refData, casterTag]);
  const classLevel = doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 0;
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();
  const slots = spellSlotsByLevel(model, classLevel, abilityMod);

  const cantripList = useMemo(
    () => (model.grantsAllCantrips ? grantedCantrips(refData, casterTag) : []),
    [model, refData, casterTag],
  );

  const known = useMemo(() => knownSpellsFor(doc, refData, casterTag), [doc, refData, casterTag]);

  // Casters with no curated "known" list (cleric) prepare directly from the
  // full class spell list; everyone else prepares from their known list.
  const knownByLevel = useMemo(() => {
    if (model.preparesFromClassList) {
      return classSpellsByLevel(refData, casterTag, { excludeCantrips: model.grantsAllCantrips });
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
  }, [model, refData, casterTag, known, levelMap]);

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
    const lvl = levelMap.get(p.spellId);
    if (lvl === undefined) return;
    preparedCountBySpell.set(p.spellId, (preparedCountBySpell.get(p.spellId) ?? 0) + 1);
    const spellData = refData.spells[p.spellId];
    const row: PreparedRow = {
      index,
      spellId: p.spellId,
      name: spellData?.name ?? p.spellId,
      expended: p.expended,
      cost: spellData ? oppositionCost(spellData, doc) : 1,
    };
    (preparedByLevel.get(lvl) ?? preparedByLevel.set(lvl, []).get(lvl)!).push(row);
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
                    return (
                      <div key={r.index} className={`prep-row${r.expended ? " is-expended" : ""}`}>
                        <div className="prep-row-main">
                          <span className="prep-name">{r.name}</span>
                          {r.cost === 2 && (
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
                          <button
                            type="button"
                            className="pick-btn add"
                            aria-label={`prepare ${sp.name}`}
                            disabled={wontFit || cantripPrepared}
                            title={
                              cantripPrepared
                                ? "Cantrips cast at will — no need to prepare more than one."
                                : wontFit
                                  ? cost === 2
                                    ? `${sp.name} is an opposition-school spell and costs 2 slots — only ${remaining} remaining.`
                                    : `All ${total} level-${level} slot${total === 1 ? "" : "s"} are filled — unprepare one first.`
                                  : undefined
                            }
                            onClick={() => update((d) => prepareSpell(d, sp.id, classTag))}
                          >
                            Prepare
                          </button>
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
          classLevel={classLevel}
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
  const classLevel = doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 0;
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();

  // Full slot breakdown includes base + bonus per level; use for bonus display.
  const slotsPerLevel = useMemo(
    () => spellSlotsByLevel(model, classLevel, abilityMod),
    [model, classLevel, abilityMod],
  );
  const slotBonusByLevel = new Map(slotsPerLevel.map((s) => [s.level, s.bonus]));

  const status = spontaneousSlotStatus(doc, model, classLevel, abilityMod, classTag);
  const anyUsed = status.some((s) => s.used > 0);

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
                    return (
                      <div key={sp.id} className="prep-row">
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
                        <button
                          type="button"
                          className="pick-btn remove prep-cast"
                          disabled={isExhausted}
                          title={
                            isExhausted
                              ? `No level-${level} slots remaining`
                              : `Cast ${sp.name} (spend 1 level-${level} slot)`
                          }
                          onClick={() =>
                            update((d) =>
                              castSpontaneousSlot(
                                d,
                                model,
                                classLevel,
                                abilityMod,
                                level,
                                classTag,
                              ),
                            )
                          }
                        >
                          Cast
                        </button>
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
  const classLevel = doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 0;
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();

  // Prepare: wizard-shaped daily readying cap (no ability bonus).
  const preparedCapacity = useMemo(
    () => preparedCapacityByLevel(model, classLevel),
    [model, classLevel],
  );
  // Cast: sorcerer-shaped per-day slot pool (ability-bonus slots included).
  const castSlots = useMemo(
    () => spellSlotsByLevel(model, classLevel, abilityMod),
    [model, classLevel, abilityMod],
  );
  const castStatus = spontaneousSlotStatus(doc, model, classLevel, abilityMod, classTag);
  const castStatusByLevel = new Map(castStatus.map((s) => [s.level, s]));
  const castBonusByLevel = new Map(castSlots.map((s) => [s.level, s.bonus]));
  const anyCastUsed = castStatus.some((s) => s.used > 0);

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
                    return (
                      <div key={sp.id} className="prep-row">
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
                        <button
                          type="button"
                          className="pick-btn remove prep-cast"
                          disabled={isExhausted}
                          title={
                            isExhausted
                              ? `No level-${level} slots remaining`
                              : `Cast ${sp.name} (spend 1 level-${level} slot)`
                          }
                          onClick={() =>
                            update((d) =>
                              castSpontaneousSlot(
                                d,
                                model,
                                classLevel,
                                abilityMod,
                                level,
                                classTag,
                              ),
                            )
                          }
                        >
                          Cast
                        </button>
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
                            <button
                              type="button"
                              className="pick-btn add"
                              aria-label={`prepare ${sp.name}`}
                              disabled={wontFit || cantripPrepared}
                              title={
                                cantripPrepared
                                  ? "Cantrips cast at will — no need to prepare more than one."
                                  : wontFit
                                    ? `All ${limit} level-${level} prepare slot${limit === 1 ? "" : "s"} are filled — unprepare one first.`
                                    : undefined
                              }
                              onClick={() => update((d) => prepareSpell(d, sp.id, classTag))}
                            >
                              Prepare
                            </button>
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
