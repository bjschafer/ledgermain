/**
 * The hybrid-caster view (arcanist): a prepared spellbook that feeds a
 * spontaneous slot pool, so it needs both halves of the loop on one screen.
 */

import { useMemo, useState, type ReactNode } from "react";

import type { AppliedMetamagic } from "@pf1/schema";

import { casterLevelForClass, effectiveCasterClassLevel } from "../../../model/casterLevel.js";
import {
  clearPrepared,
  prepareSpell,
  preparedSpells,
  removePreparedAt,
  restPreparedSpells,
  spellLevelMap,
  unprepareSpell,
} from "../../../model/preparedSpells.js";
import { domainSecretMetamagicFor } from "../../../model/freeMetamagic.js";
import {
  metamagicDiscountFor,
  metamagicDiscountSources,
  metamagicEffectiveIncrease,
  metamagicSlotIncrease,
  ownedMetamagic,
  setMetamagicLevels,
  toggleMetamagic,
} from "../../../model/metamagic.js";
import {
  casterModelFor,
  castingDeltasFor,
  grantedCantrips,
  knownSpellsFor,
  preparedCapacityByLevel,
  spellSlotsByLevel,
  storedClassTag,
} from "../../../model/spellcasting.js";
import { newDaySummary } from "../../../model/rest.js";
import {
  castSpontaneousSlot,
  resetSpontaneousSlots,
  restoreSpontaneousSlot,
  spontaneousSlotStatus,
} from "../../../model/spontaneousSpells.js";
import { showToast } from "../../../state/toast.js";
import { Panel } from "../../builder/Panel.js";
import type { BuilderProps } from "../../builder/types.js";
import { Explainer } from "../../Explainer.js";
import { TipButton } from "../../InfoTip.js";
import { SparklesIcon } from "../../icons.js";
import { SpellDetail } from "../../SpellDetail.js";
import {
  ApplyBuffButton,
  MetamagicControl,
  metamagicChips,
  NO_GRANTED_METAMAGIC,
} from "./rowControls.js";

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
export function HybridView({
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
  // Advancement-aware effective class level (2) — arcanist (the only hybrid
  // caster modeled) has no class-feature bonus-spell-known mechanic keyed off
  // raw class level, so unlike PreparedView/SpontaneousView above, every
  // classLevel use in this view can safely be the effective one.
  const effectiveClassLevel = effectiveCasterClassLevel(doc, refData, casterTag);
  const casterLevel = casterLevelForClass(casterTag, effectiveClassLevel);
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();
  const earlyBonusSpells = doc.build.settings?.earlyBonusSpells;
  const slotDeltas = castingDeltasFor(sheet.castingAdjustments, casterTag, "slots");
  const preparedDeltas = castingDeltasFor(sheet.castingAdjustments, casterTag, "prepared");

  // Prepare: wizard-shaped daily readying cap (no ability bonus under RAW; the
  // early-bonus-spells homebrew is the one exception — see
  // `preparedCapacityByLevel`'s doc comment — so a level it unlocks early on
  // the Cast side below always has something preparable to fill it).
  const preparedCapacity = useMemo(
    () =>
      preparedCapacityByLevel(
        model,
        effectiveClassLevel,
        abilityMod,
        earlyBonusSpells,
        preparedDeltas,
      ),
    [model, effectiveClassLevel, abilityMod, earlyBonusSpells, preparedDeltas],
  );
  // Cast: sorcerer-shaped per-day slot pool (ability-bonus slots included).
  const castSlots = useMemo(
    () => spellSlotsByLevel(model, effectiveClassLevel, abilityMod, earlyBonusSpells, slotDeltas),
    [model, effectiveClassLevel, abilityMod, earlyBonusSpells, slotDeltas],
  );
  const castStatus = spontaneousSlotStatus(
    doc,
    model,
    effectiveClassLevel,
    abilityMod,
    classTag,
    earlyBonusSpells,
    slotDeltas,
  );
  const castStatusByLevel = new Map(castStatus.map((s) => [s.level, s]));
  const castBonusByLevel = new Map(castSlots.map((s) => [s.level, s.bonus]));
  const anyCastUsed = castStatus.some((s) => s.used > 0);

  // Cast-time metamagic: like a spontaneous caster, an arcanist applies
  // metamagic when casting, spending a higher slot — a transient, un-persisted
  // choice kept in component state keyed by spell id.
  const owned = useMemo(() => ownedMetamagic(doc, refData), [doc, refData]);
  const discountSources = useMemo(
    () => metamagicDiscountSources(doc, refData, casterTag),
    [doc, refData, casterTag],
  );
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

  const preparedCantrips = preparedByLevel.get(0) ?? [];

  // Cast vs. Prepare are two distinct MODES, not stacked sections: play at the
  // table lives in Cast (spend a slot on anything readied), daily readying in
  // Prepare (fill the spellbook slots). Only one shows at a time — this is what
  // kills the old double-nested "Prepare (from spellbook) › Prepare from
  // spellbook…" disclosure and most of the panel's scrolling. Default to
  // Prepare when nothing is readied yet (a fresh loadout), else Cast.
  const [mode, setMode] = useState<"cast" | "prepare">(totalPrepared === 0 ? "prepare" : "cast");

  return (
    <Panel
      title="Spells"
      step="ps"
      icon={<SparklesIcon />}
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
          Hybrid caster: in the <strong>Prepare</strong> tab, ready spells from your{" "}
          {model.knownLabel.toLowerCase()}; in the <strong>Cast</strong> tab, cast any of them by
          spending a slot; casting never uses up the prepared spell itself, only a slot.{" "}
          <strong>New day</strong> refreshes every slot without changing what's prepared.
        </p>
      </Explainer>

      {/* Cast vs. Prepare: two modes, one visible at a time (see the `mode`
          state's comment above). */}
      <div className="spell-mode-toggle" role="tablist" aria-label="Spell mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "cast"}
          className={`spell-mode-btn${mode === "cast" ? " is-active" : ""}`}
          onClick={() => setMode("cast")}
        >
          Cast
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "prepare"}
          className={`spell-mode-btn${mode === "prepare" ? " is-active" : ""}`}
          onClick={() => setMode("prepare")}
        >
          Prepare
          {totalPrepared > 0 && <span className="spell-mode-count">{totalPrepared}</span>}
        </button>
      </div>

      {mode === "cast" ? (
        <div className="spell-mode-panel is-cast">
          {totalPrepared === 0 && (
            <p className="hint spell-hint-line prep-empty">
              Nothing prepared yet. Switch to <strong>Prepare</strong> to ready spells from your{" "}
              {model.knownLabel.toLowerCase()}.
            </p>
          )}

          {/* Prepared cantrips cast at will (no slot); readied over in Prepare. */}
          {preparedCantrips.length > 0 && (
            <section className="prep-level">
              <header className="prep-head">
                <span className="prep-head-label">Cantrips</span>
                <span className="prep-count">at will</span>
              </header>
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
                          casterLevel={casterLevel}
                        />
                      )}
                    </div>
                    <span className="prep-atwill">at will</span>
                  </div>
                ))}
              </div>
            </section>
          )}

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
                        const discount = metamagicDiscountFor(discountSources, sp.id);
                        const castLevel = level + metamagicSlotIncrease(applied, discount.amount);
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
                                  casterLevel={casterLevel}
                                  metamagic={applied}
                                />
                              )}
                              <MetamagicControl
                                chips={metamagicChips(owned, NO_GRANTED_METAMAGIC, [])}
                                applied={applied}
                                baseLevel={level}
                                maxSlotLevel={maxSlotLevel}
                                discount={discount}
                                onToggle={(slug) => toggleCastMM(sp.id, slug)}
                                onSetLevels={(slug, n) => setCastMMLevels(sp.id, slug, n)}
                              />
                            </div>
                            {spellData && (
                              <ApplyBuffButton
                                spell={spellData}
                                refData={refData}
                                doc={doc}
                                update={update}
                                casterLevel={casterLevel}
                                castExhausted={castExhausted}
                                onCast={(d) =>
                                  castSpontaneousSlot(
                                    d,
                                    model,
                                    effectiveClassLevel,
                                    abilityMod,
                                    castLevel,
                                    classTag,
                                    earlyBonusSpells,
                                    slotDeltas,
                                  )
                                }
                              />
                            )}
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
                                    earlyBonusSpells,
                                    slotDeltas,
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
                      Nothing prepared at level {level} yet. Switch to <strong>Prepare</strong>.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="spell-mode-panel is-prepare">
          <p className="hint spell-hint-line">
            Ready spells from your {model.knownLabel.toLowerCase()} into the day's slots. What you
            prepare here is castable from the <strong>Cast</strong> tab.
          </p>

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
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setConfirmClear(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="btn-ghost" onClick={() => setConfirmClear(true)}>
                  Re-prepare from scratch
                </button>
              ))}
          </div>

          <div className="prep-levels">
            {preparedCapacity.map(({ level, limit }) => {
              const isCantrip = level === 0;
              const rows = preparedByLevel.get(level) ?? [];
              const usedCapacity = rows.length;
              const remaining = limit - usedCapacity;
              const over = usedCapacity > limit;
              const full = remaining <= 0;
              const knownHere =
                isCantrip && model.grantsAllCantrips
                  ? cantripList
                  : (knownByLevel.get(level) ?? []);

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
                            {refData.spells[r.spellId] && (
                              <SpellDetail
                                spell={refData.spells[r.spellId]!}
                                spellLevel={level}
                                abilityMod={abilityMod}
                                casterLevel={casterLevel}
                              />
                            )}
                          </div>
                          {isCantrip && <span className="prep-atwill">at will</span>}
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
                    <p className="prep-none">None prepared.</p>
                  )}

                  {knownHere.length > 0 ? (
                    <details className="prep-add">
                      <summary>
                        {isCantrip ? "Add a cantrip…" : "Add a spell…"}
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
                                    casterLevel={casterLevel}
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
                                    ? "Cantrips cast at will. No need to prepare more than one."
                                    : `All ${limit} level-${level} prepare slot${limit === 1 ? "" : "s"} are filled. Unprepare one first.`
                                }
                                onClick={() =>
                                  update((d) =>
                                    prepareSpell(
                                      d,
                                      sp.id,
                                      classTag,
                                      domainSecretMetamagicFor(d, sp.id),
                                    ),
                                  )
                                }
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
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Public component: branches on preparation type
// ---------------------------------------------------------------------------
