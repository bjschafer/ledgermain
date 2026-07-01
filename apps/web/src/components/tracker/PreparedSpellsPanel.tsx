import { useMemo, useState } from "react";

import type { RefData } from "@pf1/schema";

import {
  classSpellsByLevel,
  clearPrepared,
  domainSpellLevelMap,
  prepareDomainSpell,
  prepareSpell,
  preparedSpells,
  removePreparedAt,
  restPreparedSpells,
  setExpendedAt,
  spellLevelMap,
  unprepareSpell,
} from "../../model/preparedSpells.js";
import {
  casterModelFor,
  grantedCantrips,
  spellSlotsByLevel,
} from "../../model/spellcasting.js";
import {
  castSpontaneousSlot,
  resetSpontaneousSlots,
  restoreSpontaneousSlot,
  spontaneousSlotStatus,
} from "../../model/spontaneousSpells.js";
import { Panel } from "../builder/Panel.js";
import type { BuilderProps } from "../builder/types.js";
import { SpellDetail } from "../SpellDetail.js";

interface PreparedRow {
  /** Index into `doc.live.spells.prepared` (stable within this render). */
  index: number;
  spellId: string;
  name: string;
  expended: boolean;
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
}: {
  doc: BuilderProps["doc"];
  refData: RefData;
  update: BuilderProps["update"];
  slots: ReturnType<typeof spellSlotsByLevel>;
  classLevel: number;
  abilityMod: number;
}) {
  const domains = doc.build.clericDomains ?? [];
  const domainMap = useMemo(
    () => domainSpellLevelMap(refData, domains),
    [refData, domains],
  );

  // Bucket domain-kind prepared instances by their domain spell level.
  type Row = { index: number; spellId: string; name: string; expended: boolean };
  const preparedByLevel = new Map<number, Row[]>();
  const prepared = preparedSpells(doc);
  prepared.forEach((p, index) => {
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
          One bonus prepare-slot per accessible cleric spell level. Fill it from
          the chosen domains' spell list (a domain-only spell not on the cleric
          list may only be prepared here).
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
                    <div
                      key={r.index}
                      className={`prep-row${r.expended ? " is-expended" : ""}`}
                    >
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
                  Prepare from {" "}{domains.join(", ")} level-{level} list…
                  {full && <span className="prep-full"> domain slot filled</span>}
                </summary>
                <div className="prep-add-list">
                  {pickable.map((sp) => {
                    const count = rows.filter((r) => r.spellId === sp.id && !r.expended).length;
                    return (
                      <div key={sp.id} className="prep-add-row">
                        <span className="prep-name">{sp.name}</span>
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
                          onClick={() => update((d) => prepareDomainSpell(d, sp.id))}
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
// Prepared-caster (wizard) view
// ---------------------------------------------------------------------------

/**
 * The daily prepared-caster loop. Shows slot capacity, the prepared loadout
 * with Cast/Recover, a picker to prepare more spells, and actions to rest
 * (un-expend) or clear the loadout for re-preparation.
 */
function PreparedView({ doc, sheet, refData, update, casterTag, model }: BuilderProps & {
  casterTag: string;
  model: ReturnType<typeof casterModelFor> & {};
}) {
  const [confirmRecover, setConfirmRecover] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const levelMap = useMemo(
    () => spellLevelMap(refData, casterTag),
    [refData, casterTag],
  );
  const classLevel = doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 0;
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();
  const slots = spellSlotsByLevel(model, classLevel, abilityMod);

  const cantripList = useMemo(
    () => model.grantsAllCantrips ? grantedCantrips(refData, casterTag) : [],
    [model, refData, casterTag],
  );

  // Casters with no curated "known" list (cleric) prepare directly from the
  // full class spell list; everyone else prepares from `build.spells.known`.
  const knownByLevel = useMemo(() => {
    if (model.preparesFromClassList) {
      return classSpellsByLevel(refData, casterTag, { excludeCantrips: model.grantsAllCantrips });
    }
    const map = new Map<number, { id: string; name: string }[]>();
    for (const id of doc.build.spells.known) {
      const lvl = levelMap.get(id);
      const sp = refData.spells[id];
      if (lvl === undefined || !sp) continue;
      (map.get(lvl) ?? map.set(lvl, []).get(lvl)!).push({ id, name: sp.name });
    }
    for (const arr of map.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [model, refData, casterTag, doc.build.spells.known, levelMap]);

  const prepared = preparedSpells(doc);
  const preparedByLevel = new Map<number, PreparedRow[]>();
  const preparedCountBySpell = new Map<string, number>();
  prepared.forEach((p, index) => {
    // Exclude domain-slot instances — they are bucketed/rendered separately to
    // keep the class slots capacity check honest.
    if ((p.kind ?? "normal") === "domain") return;
    const lvl = levelMap.get(p.spellId);
    if (lvl === undefined) return;
    preparedCountBySpell.set(p.spellId, (preparedCountBySpell.get(p.spellId) ?? 0) + 1);
    const row: PreparedRow = {
      index,
      spellId: p.spellId,
      name: refData.spells[p.spellId]?.name ?? p.spellId,
      expended: p.expended,
    };
    (preparedByLevel.get(lvl) ?? preparedByLevel.set(lvl, []).get(lvl)!).push(row);
  });
  for (const arr of preparedByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

  const anyExpended = prepared.some((p) => p.expended);
  const totalPrepared = prepared.length;

  return (
    <Panel title="Prepared Spells" step="ps" storageKey="panel:Prepared">
      <div className="spell-hints">
        <p className="hint spell-hint-line">
          Prepare spells from your {model.knownLabel.toLowerCase()} into the day's
          slots, then <strong>Cast</strong> to expend them. <strong>New day</strong>{" "}
          refreshes every slot without changing what's prepared.
        </p>
      </div>

      {/* Day actions: refresh slots vs. wipe the loadout to re-prepare */}
      <div className="prep-actions">
        <button
          type="button"
          className="btn-ghost rest"
          disabled={!anyExpended}
          onClick={() => {
            update((d) => restPreparedSpells(d));
            setConfirmClear(false);
          }}
        >
          New day
        </button>
        {totalPrepared > 0 &&
          (confirmClear ? (
            <>
              <span className="prep-clear-confirm-label">Clear all prepared spells?</span>
              <button
                type="button"
                className="pick-btn remove"
                onClick={() => {
                  update((d) => clearPrepared(d));
                  setConfirmClear(false);
                }}
              >
                Clear all
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setConfirmClear(true)}
            >
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
          const over = rows.length > total;
          const full = rows.length >= total;
          const knownHere =
            isCantrip && model.grantsAllCantrips
              ? cantripList
              : knownByLevel.get(level) ?? [];

          return (
            <section key={level} className="prep-level">
              <header className="prep-head">
                <span className="prep-head-label">
                  {isCantrip ? "Cantrips" : `Level ${level}`}
                </span>
                <span className={`prep-count${over ? " is-over" : ""}`}>
                  {rows.length}/{total} prepared
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
                      <div
                        key={r.index}
                        className={`prep-row${r.expended ? " is-expended" : ""}`}
                      >
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
                            onBlur={() =>
                              setConfirmRecover((i) => (i === r.index ? null : i))
                            }
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
                      return (
                        <div key={sp.id} className="prep-add-row">
                          <span className="prep-name">{sp.name}</span>
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
                              onClick={() => update((d) => unprepareSpell(d, sp.id))}
                            >
                              −
                            </button>
                          )}
                          <button
                            type="button"
                            className="pick-btn add"
                            aria-label={`prepare ${sp.name}`}
                            disabled={full || cantripPrepared}
                            title={
                              cantripPrepared
                                ? "Cantrips cast at will — no need to prepare more than one."
                                : full
                                  ? `All ${total} level-${level} slot${total === 1 ? "" : "s"} are filled — unprepare one first.`
                                  : undefined
                            }
                            onClick={() => update((d) => prepareSpell(d, sp.id))}
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
function SpontaneousView({ doc, sheet, refData, update, casterTag, model }: BuilderProps & {
  casterTag: string;
  model: ReturnType<typeof casterModelFor> & {};
}) {
  const levelMap = useMemo(
    () => spellLevelMap(refData, casterTag),
    [refData, casterTag],
  );
  const classLevel = doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 0;
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();

  // Full slot breakdown includes base + bonus per level; use for bonus display.
  const slotsPerLevel = useMemo(
    () => spellSlotsByLevel(model, classLevel, abilityMod),
    [model, classLevel, abilityMod],
  );
  const slotBonusByLevel = new Map(slotsPerLevel.map((s) => [s.level, s.bonus]));

  const status = spontaneousSlotStatus(doc, model, classLevel, abilityMod);
  const anyUsed = status.some((s) => s.used > 0);

  // Cantrips: granted from the class list (at-will, no slots tracked).
  const cantripList = useMemo(
    () => model.grantsAllCantrips ? grantedCantrips(refData, casterTag) : [],
    [model, refData, casterTag],
  );

  // Known spells by spell level (excluding cantrips when grantsAllCantrips).
  const knownByLevel = new Map<number, { id: string; name: string }[]>();
  for (const id of doc.build.spells.known) {
    const lvl = levelMap.get(id);
    const sp = refData.spells[id];
    if (lvl === undefined || !sp) continue;
    (knownByLevel.get(lvl) ?? knownByLevel.set(lvl, []).get(lvl)!).push({ id, name: sp.name });
  }
  for (const arr of knownByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

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
          onClick={() => update((d) => resetSpontaneousSlots(d))}
        >
          New day
        </button>
      }
    >
      <div className="spell-hints">
        <p className="hint spell-hint-line">
          Spontaneous caster: spend a slot of the required level to cast any
          spell you know. <strong>New day</strong> restores all slots.
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
                      <SpellDetail
                        spell={spellData}
                        spellLevel={0}
                        abilityMod={abilityMod}
                      />
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
                        update((d) => restoreSpontaneousSlot(d, level));
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
                              castSpontaneousSlot(d, model, classLevel, abilityMod, level),
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
// Public component: branches on preparation type
// ---------------------------------------------------------------------------

/**
 * The daily spell tracking panel. For prepared casters (wizard) this is the
 * loadout loop; for spontaneous casters (sorcerer) it is the slot-pool view.
 * Wizard-only until Task 1d; extended here to branch on model.preparation.
 */
export function PreparedSpellsPanel({ doc, sheet, refData, update }: BuilderProps) {
  const casterTag = useMemo(
    () => doc.identity.classes.map((c) => c.tag).find((t) => refData.spellLists[t]),
    [doc.identity.classes, refData.spellLists],
  );
  const model = casterTag ? casterModelFor(casterTag) : undefined;

  if (!casterTag || !model) {
    return (
      <Panel title="Prepared Spells" step="ps" storageKey="panel:Prepared">
        <p className="empty">
          {casterTag
            ? "Spell tracking isn't modelled for this class yet."
            : "No spellcasting class selected."}
        </p>
      </Panel>
    );
  }

  if (model.preparation === "spontaneous") {
    return (
      <SpontaneousView
        doc={doc}
        sheet={sheet}
        refData={refData}
        update={update}
        casterTag={casterTag}
        model={model}
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
    />
  );
}
