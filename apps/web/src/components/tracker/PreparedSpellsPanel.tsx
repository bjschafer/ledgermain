import { useMemo, useState } from "react";

import {
  prepareSpell,
  preparedSpells,
  removePreparedAt,
  restPreparedSpells,
  setExpendedAt,
  spellLevelMap,
  unprepareSpell,
} from "../../model/preparedSpells.js";
import { casterModelFor, spellSlotsByLevel } from "../../model/spellcasting.js";
import { Panel } from "../builder/Panel.js";
import type { BuilderProps } from "../builder/types.js";

interface PreparedRow {
  /** Index into `doc.live.spells.prepared` (stable within this render). */
  index: number;
  spellId: string;
  name: string;
  expended: boolean;
}

/**
 * The daily prepared-caster loop — the second half of the spell pipeline whose
 * first half (the spellbook) lives in the builder. For each accessible spell
 * level it shows slot capacity, the prepared loadout (with Cast/undo), and a
 * picker to prepare more spells from the spellbook. "New day" un-expends the
 * whole loadout without disturbing what is prepared. Wizard-only today, gated on
 * a registered caster model.
 */
export function PreparedSpellsPanel({ doc, sheet, refData, update }: BuilderProps) {
  const casterTag = useMemo(
    () => doc.identity.classes.map((c) => c.tag).find((t) => refData.spellLists[t]),
    [doc.identity.classes, refData.spellLists],
  );
  const model = casterTag ? casterModelFor(casterTag) : undefined;
  // Index of the prepared instance whose "Recover" is armed (awaiting a second
  // confirming click), or null. Recovering an expended spell mid-session is rare
  // and easy to fumble, so it takes two taps.
  const [confirmRecover, setConfirmRecover] = useState<number | null>(null);
  const levelMap = useMemo(
    () => (casterTag ? spellLevelMap(refData, casterTag) : new Map<string, number>()),
    [refData, casterTag],
  );

  if (!casterTag || !model) {
    return (
      <Panel title="Prepared Spells" step="ps" storageKey="panel:Prepared">
        <p className="empty">
          {casterTag
            ? "Spell preparation isn’t modelled for this class yet."
            : "No spellcasting class selected."}
        </p>
      </Panel>
    );
  }

  const classLevel = doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 0;
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();
  const slots = spellSlotsByLevel(model, classLevel, abilityMod);

  // Known spells (the spellbook) bucketed by this class's spell level.
  const knownByLevel = new Map<number, { id: string; name: string }[]>();
  for (const id of doc.build.spells.known) {
    const lvl = levelMap.get(id);
    const sp = refData.spells[id];
    if (lvl === undefined || !sp) continue;
    (knownByLevel.get(lvl) ?? knownByLevel.set(lvl, []).get(lvl)!).push({
      id,
      name: sp.name,
    });
  }
  for (const arr of knownByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

  // Prepared instances bucketed by level, retaining their original index.
  const prepared = preparedSpells(doc);
  const preparedByLevel = new Map<number, PreparedRow[]>();
  const preparedCountBySpell = new Map<string, number>();
  prepared.forEach((p, index) => {
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
    <Panel
      title="Prepared Spells"
      step="ps"
      storageKey="panel:Prepared"
      right={
        <button
          type="button"
          className="btn-ghost rest"
          disabled={!anyExpended}
          onClick={() => update((d) => restPreparedSpells(d))}
        >
          New day
        </button>
      }
    >
      <div className="spell-hints">
        <p className="hint spell-hint-line">
          Prepare spells from your {model.knownLabel.toLowerCase()} into the day’s
          slots, then <strong>Cast</strong> to expend them. <strong>New day</strong>{" "}
          refreshes every slot without changing what’s prepared.
        </p>
      </div>

      {totalPrepared === 0 && (
        <p className="hint spell-hint-line prep-empty">
          Nothing prepared yet — open a level below and prepare from your{" "}
          {model.knownLabel.toLowerCase()}.
        </p>
      )}

      <div className="prep-levels">
        {slots.map(({ level, total, bonus }) => {
          const rows = preparedByLevel.get(level) ?? [];
          const isCantrip = level === 0;
          const ready = isCantrip ? rows.length : rows.filter((r) => !r.expended).length;
          const over = rows.length > total;
          const full = rows.length >= total;
          const knownHere = knownByLevel.get(level) ?? [];

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
                  {rows.map((r) => (
                    <div
                      key={r.index}
                      className={`prep-row${r.expended ? " is-expended" : ""}`}
                    >
                      <span className="prep-name">{r.name}</span>
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
                  ))}
                </div>
              ) : (
                <p className="prep-none">— none prepared —</p>
              )}

              {knownHere.length > 0 ? (
                <details className="prep-add">
                  <summary>
                    Prepare from {model.knownLabel.toLowerCase()}…
                    {full && <span className="prep-full"> all slots filled</span>}
                  </summary>
                  <div className="prep-add-list">
                    {knownHere.map((sp) => {
                      const count = preparedCountBySpell.get(sp.id) ?? 0;
                      return (
                        <div key={sp.id} className="prep-add-row">
                          <span className="prep-name">{sp.name}</span>
                          {count > 0 && <span className="prep-have">×{count}</span>}
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
                            disabled={full}
                            title={
                              full
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
    </Panel>
  );
}
