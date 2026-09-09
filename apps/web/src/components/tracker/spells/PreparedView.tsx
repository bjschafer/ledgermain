/**
 * The prepared-caster loadout loop (wizard, cleric, druid, ...): fill each
 * level's slots from the spellbook/list ahead of the day, expend them at the
 * table, recover on rest.
 */

import { useMemo, useState, type ReactNode } from "react";

import { deriveResourcePools } from "@pf1/engine";

import { casterLevelForClass, effectiveCasterClassLevel } from "../../../model/casterLevel.js";
import {
  classSpellsByLevel,
  clearPrepared,
  oppositionCost,
  prepareSpell,
  preparedSpells,
  removePreparedAt,
  resetSpiritMagicSlots,
  restPreparedSpells,
  setExpendedAt,
  setPreparedMetamagicLevels,
  shamanSpiritMagicSlotStatus,
  spellLevelMap,
  togglePreparedMetamagic,
  unprepareSpell,
} from "../../../model/preparedSpells.js";
import {
  domainSecretDefsFor,
  domainSecretMetamagicFor,
  domainSecretWaivers,
  freeMetamagicPlan,
  freeMetamagicSources,
  freeMetamagicSpendMessage,
  grantedMetamagicSlugs,
  paidMetamagicSlotIncrease,
  spendFreeMetamagic,
} from "../../../model/freeMetamagic.js";
import {
  metamagicDiscountFor,
  metamagicDiscountSources,
  metamagicEffectiveIncrease,
  ownedMetamagic,
} from "../../../model/metamagic.js";
import {
  casterModelFor,
  castingDeltasFor,
  grantedCantrips,
  knownSpellsFor,
  shamanSpiritSpellsKnown,
  spellSlotsByLevel,
  storedClassTag,
} from "../../../model/spellcasting.js";
import { newDaySummary } from "../../../model/rest.js";
import { showToast } from "../../../state/toast.js";
import { Panel } from "../../builder/Panel.js";
import type { BuilderProps } from "../../builder/types.js";
import { TipButton } from "../../InfoTip.js";
import { SparklesIcon } from "../../icons.js";
import { SpellDetail } from "../../SpellDetail.js";
import {
  ApplyBuffButton,
  ConversionCastMenu,
  freeMetamagicCastTitle,
  MetamagicControl,
  metamagicChips,
  type PreparedRow,
} from "./rowControls.js";
import { DomainSlotsSection } from "./DomainSlotsSection.js";
import { SchoolSlotsSection } from "./SchoolSlotsSection.js";
import { SpiritMagicSlotsSection } from "./SpiritMagicSlotsSection.js";

/**
 * The daily prepared-caster loop. Shows slot capacity, the prepared loadout
 * with Cast/Recover, a picker to prepare more spells, and actions to rest
 * (un-expend) or clear the loadout for re-preparation.
 */
export function PreparedView({
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
  // (prestige casting advancement grants table numbers only, never accelerates
  // a class feature — see model/casterLevel.ts's header comment).
  const classLevel = doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 0;
  // Advancement-aware effective class level — feeds the slot-table lookup
  // (spellSlotsByLevel) below.
  const effectiveClassLevel = effectiveCasterClassLevel(doc, refData, casterTag);
  const casterLevel = casterLevelForClass(casterTag, effectiveClassLevel);
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();
  const earlyBonusSpells = doc.build.settings?.earlyBonusSpells;
  const slotDeltas = castingDeltasFor(sheet.castingAdjustments, casterTag, "slots");
  const slots = spellSlotsByLevel(
    model,
    effectiveClassLevel,
    abilityMod,
    earlyBonusSpells,
    slotDeltas,
  );
  // Metamagic: owned feats + the highest slot the caster can fill (metamagic
  // can't push a spell past it) + this character's always-on cost discounts
  // (Magical Lineage and kin — see `metamagicDiscountSources`).
  const owned = useMemo(() => ownedMetamagic(doc, refData), [doc, refData]);
  const maxSlotLevel = slots.length > 0 ? slots[slots.length - 1]!.level : 0;
  const discountSources = useMemo(
    () => metamagicDiscountSources(doc, refData, casterTag),
    [doc, refData, casterTag],
  );
  // Resource-spend free metamagic (universalist Metamagic Mastery here): the
  // backing pool and the per-row offer state — see `model/freeMetamagic.ts`.
  // Arming is transient (the ability applies at CAST time, so it is never
  // part of the stored preparation): an armed row stays bucketed at its base
  // level and the pool is spent on the Cast click.
  const derivedPools = useMemo(
    () => deriveResourcePools(doc, refData, sheet.abilities, sheet.abilityDCs),
    [doc, refData, sheet.abilities, sheet.abilityDCs],
  );
  const freeSources = useMemo(
    () => freeMetamagicSources(doc, refData, casterTag, derivedPools),
    [doc, refData, casterTag, derivedPools],
  );
  const grantedSlugs = useMemo(() => grantedMetamagicSlugs(freeSources), [freeSources]);
  // Theologian Domain Secret's permanently modified domain spells — no pool
  // behind them, so they never appear as an armable offer.
  const permanentWaivers = useMemo(() => domainSecretWaivers(doc), [doc]);
  // Armed sources, keyed `<prepared index>:<source id>` (a magus can hold
  // several one-a-day arcana at once, each its own chip).
  const [freeArmed, setFreeArmed] = useState<Record<string, boolean>>({});

  const cantripList = useMemo(
    () => (model.grantsAllCantrips ? grantedCantrips(refData, casterTag) : []),
    [model, refData, casterTag],
  );

  const known = useMemo(() => knownSpellsFor(doc, refData, casterTag), [doc, refData, casterTag]);

  // Casters with no curated "known" list (cleric) prepare directly from the
  // full class spell list; everyone else prepares from their known list.
  const knownByLevel = useMemo(() => {
    // Archetype fixed bonus spells known (engine casting-economy tables):
    // preparable exactly like the shaman spirit-magic merge below — appended
    // to whichever base list this caster prepares from, deduped by spell id.
    const bonusKnown = (sheet.bonusKnownSpells?.spells ?? []).filter(
      (sp) => sp.classTag === casterTag && sp.spellId !== undefined,
    );
    const appendBonus = (map: Map<number, { id: string; name: string }[]>): typeof map => {
      if (bonusKnown.length === 0) return map;
      const present = new Set([...map.values()].flat().map((e) => e.id));
      for (const sp of bonusKnown) {
        if (present.has(sp.spellId!)) continue;
        (map.get(sp.level) ?? map.set(sp.level, []).get(sp.level)!).push({
          id: sp.spellId!,
          name: sp.name,
        });
      }
      for (const arr of map.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
      return map;
    };
    if (model.preparesFromClassList) {
      const base = classSpellsByLevel(refData, casterTag, {
        excludeCantrips: model.grantsAllCantrips,
      });
      const merged = new Map<number, { id: string; name: string }[]>();
      for (const [lvl, arr] of base) merged.set(lvl, [...arr]);
      // Shaman spirit magic bonus spells: merge in any that aren't already on
      // the base shaman list, so the chosen spirit's spell list is
      // preparable/castable here too, not just displayed in the builder's
      // Spells section — see model/spellcasting. shamanSpiritSpellsKnown.
      if (casterTag === "shaman") {
        const present = new Set([...merged.values()].flat().map((e) => e.id));
        for (const sp of shamanSpiritSpellsKnown(refData, doc.build.shamanSpirit, classLevel)) {
          if (present.has(sp.id)) continue;
          (merged.get(sp.level) ?? merged.set(sp.level, []).get(sp.level)!).push({
            id: sp.id,
            name: sp.name,
          });
        }
        for (const arr of merged.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
      }
      return appendBonus(merged);
    }
    const map = new Map<number, { id: string; name: string }[]>();
    for (const id of known) {
      const lvl = levelMap.get(id);
      const sp = refData.spells[id];
      if (lvl === undefined || !sp) continue;
      (map.get(lvl) ?? map.set(lvl, []).get(lvl)!).push({ id, name: sp.name });
    }
    for (const arr of map.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
    return appendBonus(map);
  }, [
    model,
    refData,
    casterTag,
    known,
    levelMap,
    doc.build.shamanSpirit,
    classLevel,
    sheet.bonusKnownSpells,
  ]);

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
    // Metamagic: a modified spell occupies — and is bucketed under — a higher
    // slot (base + Σ slot increases, less any always-on discount for this
    // spell), e.g. an Empowered Fireball (base 3rd) lands in the level-5
    // bucket and counts against its capacity — level 4 with Magical Lineage.
    // An engaged free application (Metamagic Mastery) keeps the row at its
    // base level: the spell is prepared plain and modified as it is cast.
    const discount = metamagicDiscountFor(discountSources, p.spellId);
    const freePlan = freeMetamagicPlan({
      doc,
      sources: freeSources,
      baseLevel,
      applied: p.metamagic ?? [],
      maxSlotLevel,
      armedIds: new Set(freeSources.filter((s) => freeArmed[`${index}:${s.id}`]).map((s) => s.id)),
      permanentlyWaived: permanentWaivers.get(p.spellId),
    });
    const slotLevel = baseLevel + paidMetamagicSlotIncrease(p.metamagic, discount.amount, freePlan);
    const row: PreparedRow = {
      index,
      spellId: p.spellId,
      name: spellData?.name ?? p.spellId,
      expended: p.expended,
      cost: spellData ? oppositionCost(spellData, doc, refData) : 1,
      baseLevel,
      metamagic: p.metamagic ?? [],
      discount,
      freePlan,
      permanentDefs: domainSecretDefsFor(doc, p.spellId),
    };
    (preparedByLevel.get(slotLevel) ?? preparedByLevel.set(slotLevel, []).get(slotLevel)!).push(
      row,
    );
  });
  for (const arr of preparedByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

  const anyExpended = classPrepared.some(({ p }) => p.expended);
  const totalPrepared = classPrepared.length;

  // Shaman Spirit Magic (ACG): a separate bonus spontaneous-slot pool, so its
  // own usage also has to enable this class's "New day" button and get reset
  // alongside the ordinary prepared loadout — see
  // `model/preparedSpells.ts`'s "Shaman Spirit Magic" section.
  const isShaman = casterTag === "shaman";
  const anySpiritMagicUsed =
    isShaman && shamanSpiritMagicSlotStatus(doc, effectiveClassLevel).some((s) => s.used > 0);

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
          disabled={!anyExpended && !anySpiritMagicUsed}
          title="Same as the global New day action, scoped to this class's spells"
          onClick={() => {
            let next = restPreparedSpells(doc, classTag);
            if (isShaman) next = resetSpiritMagicSlots(next);
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
          Nothing prepared yet. Open a level below and prepare from your{" "}
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
                              casterLevel={casterLevel}
                              metamagic={r.metamagic}
                            />
                          )}
                          {!isCantrip && (
                            <MetamagicControl
                              chips={metamagicChips(owned, grantedSlugs, r.permanentDefs)}
                              applied={r.metamagic}
                              baseLevel={r.baseLevel}
                              maxSlotLevel={maxSlotLevel}
                              discount={r.discount}
                              plan={r.freePlan}
                              onToggleFree={(sourceId) => {
                                const key = `${r.index}:${sourceId}`;
                                setFreeArmed((prev) => ({ ...prev, [key]: prev[key] !== true }));
                                flashRow(r.index);
                              }}
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
                        {spellData && (
                          <ApplyBuffButton
                            spell={spellData}
                            refData={refData}
                            doc={doc}
                            update={update}
                            casterLevel={casterLevel}
                            onCast={(d) =>
                              isCantrip
                                ? d
                                : spendFreeMetamagic(
                                    setExpendedAt(d, r.index, true),
                                    derivedPools,
                                    r.freePlan,
                                  )
                            }
                          />
                        )}
                        {!isCantrip && !r.expended && (
                          <ConversionCastMenu
                            doc={doc}
                            refData={refData}
                            update={update}
                            casterTag={casterTag}
                            index={r.index}
                            maxLevel={r.baseLevel}
                          />
                        )}
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
                            title={freeMetamagicCastTitle(r.name, r.freePlan, undefined)}
                            onClick={() => {
                              const msg = freeMetamagicSpendMessage(r.freePlan);
                              update((d) =>
                                spendFreeMetamagic(
                                  setExpendedAt(d, r.index, true),
                                  derivedPools,
                                  r.freePlan,
                                ),
                              );
                              if (msg) showToast({ message: msg });
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
                <p className="prep-none">None prepared.</p>
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
                      const cost = spellData ? oppositionCost(spellData, doc, refData) : 1;
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
                                : cost === 2
                                  ? `${sp.name} is an opposition-school spell and costs 2 slots: only ${remaining} remaining.`
                                  : `All ${total} level-${level} slot${total === 1 ? "" : "s"} are filled. Unprepare one first.`
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

      {/* Domain slots: one per accessible spell level total, not per chosen domain. */}
      {(doc.build.clericDomains ?? []).length > 0 && casterTag === "cleric" && (
        <DomainSlotsSection
          doc={doc}
          refData={refData}
          update={update}
          slots={slots}
          classLevel={effectiveClassLevel}
          abilityMod={abilityMod}
          casterLevel={casterLevel}
          classTag={classTag}
        />
      )}

      {/* Nature-bond domain slots: druid's single-domain analogue of the above. */}
      {doc.build.druidNatureBondDomain && casterTag === "druid" && (
        <DomainSlotsSection
          doc={doc}
          refData={refData}
          update={update}
          slots={slots}
          classLevel={effectiveClassLevel}
          abilityMod={abilityMod}
          casterLevel={casterLevel}
          classTag={classTag}
          variant="druid"
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
          casterLevel={casterLevel}
          classTag={classTag}
        />
      )}

      {/* Spirit Magic: one bonus spontaneous slot per level, shaman only. */}
      {isShaman && (
        <SpiritMagicSlotsSection
          doc={doc}
          refData={refData}
          update={update}
          shamanLevel={classLevel}
          effectiveClassLevel={effectiveClassLevel}
        />
      )}
    </Panel>
  );
}
