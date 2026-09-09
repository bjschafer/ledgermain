/**
 * The spontaneous-caster slot-pool view (sorcerer, bard, oracle, ...): a pool
 * of slots per level spent against a fixed known list, with no preparation
 * step to model.
 */

import { useMemo, useState, type ReactNode } from "react";

import { deriveResourcePools } from "@pf1/engine";
import type { AppliedMetamagic, CharacterDoc } from "@pf1/schema";

import { casterLevelForClass, effectiveCasterClassLevel } from "../../../model/casterLevel.js";
import { spellLevelMap } from "../../../model/preparedSpells.js";
import {
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
  setMetamagicLevels,
  toggleMetamagic,
} from "../../../model/metamagic.js";
import {
  casterModelFor,
  castingDeltasFor,
  grantedCantrips,
  knownSpellsFor,
  spellSlotsByLevel,
  storedClassTag,
} from "../../../model/spellcasting.js";
import { newDaySummary } from "../../../model/rest.js";
import { bonusKnownSpellsFor } from "../../../model/knownSpells.js";
import {
  castSpontaneousSlot,
  resetSpontaneousSlots,
  restoreSpontaneousSlot,
  spontaneousSlotStatus,
} from "../../../model/spontaneousSpells.js";
import { showToast } from "../../../state/toast.js";
import { Panel } from "../../builder/Panel.js";
import type { BuilderProps } from "../../builder/types.js";
import { TipButton } from "../../InfoTip.js";
import { SparklesIcon } from "../../icons.js";
import { SpellDetail } from "../../SpellDetail.js";
import {
  ApplyBuffButton,
  freeMetamagicCastTitle,
  MetamagicControl,
  metamagicChips,
} from "./rowControls.js";

/**
 * Spontaneous caster daily tracking. Shows per-level slot pools (used/total)
 * with the list of known spells at each level and a "Cast" button that spends
 * one slot. No preparation needed — any known spell can be cast at any level
 * slot for which it qualifies.
 */
export function SpontaneousView({
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
  // spell-known merges below (prestige casting advancement grants table
  // numbers only, never accelerates a class feature — see
  // model/casterLevel.ts's header comment).
  const classLevel = doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 0;
  // Advancement-aware effective class level — feeds the slot-table lookups
  // (spellSlotsByLevel/spontaneousSlotStatus/castSpontaneousSlot) below.
  const effectiveClassLevel = effectiveCasterClassLevel(doc, refData, casterTag);
  const casterLevel = casterLevelForClass(casterTag, effectiveClassLevel);
  const abilityMod = sheet.abilities[model.ability].mod;
  const abilityLabel = model.ability.toUpperCase();
  const earlyBonusSpells = doc.build.settings?.earlyBonusSpells;

  const slotDeltas = castingDeltasFor(sheet.castingAdjustments, casterTag, "slots");

  // Full slot breakdown includes base + bonus per level; use for bonus display.
  const slotsPerLevel = useMemo(
    () => spellSlotsByLevel(model, effectiveClassLevel, abilityMod, earlyBonusSpells, slotDeltas),
    [model, effectiveClassLevel, abilityMod, earlyBonusSpells, slotDeltas],
  );
  const slotBonusByLevel = new Map(slotsPerLevel.map((s) => [s.level, s.bonus]));

  const status = spontaneousSlotStatus(
    doc,
    model,
    effectiveClassLevel,
    abilityMod,
    classTag,
    earlyBonusSpells,
    slotDeltas,
  );
  const anyUsed = status.some((s) => s.used > 0);

  // Metamagic: a spontaneous caster applies metamagic AT CAST time — the
  // choice is transient (nothing is stored on the doc; casting just spends a
  // higher slot), so it lives in component state keyed by spell id.
  const owned = useMemo(() => ownedMetamagic(doc, refData), [doc, refData]);
  const discountSources = useMemo(
    () => metamagicDiscountSources(doc, refData, casterTag),
    [doc, refData, casterTag],
  );
  const [castMetamagic, setCastMetamagic] = useState<Record<string, AppliedMetamagic[]>>({});
  const maxSlotLevel = status.length > 0 ? status[status.length - 1]!.level : 0;
  const remainingByLevel = new Map(status.map((s) => [s.level, s.remaining]));
  // Resource-spend free metamagic (Meta-Rage here): a transient per-spell
  // "cast this one free" arm, spending the backing pool on the Cast click —
  // see `model/freeMetamagic.ts`.
  const derivedPools = useMemo(
    () => deriveResourcePools(doc, refData, sheet.abilities, sheet.abilityDCs),
    [doc, refData, sheet.abilities, sheet.abilityDCs],
  );
  const freeSources = useMemo(
    () => freeMetamagicSources(doc, refData, casterTag, derivedPools),
    [doc, refData, casterTag, derivedPools],
  );
  const grantedSlugs = useMemo(() => grantedMetamagicSlugs(freeSources), [freeSources]);
  // Armed sources, keyed `<spell id>:<source id>` — a magus can hold several
  // one-a-day arcana at once, each its own chip on the row.
  const [freeArmed, setFreeArmed] = useState<Record<string, boolean>>({});
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
  type KnownSpellEntry = { id: string; name: string; undercastOf?: string };
  const knownByLevel = new Map<number, KnownSpellEntry[]>();
  for (const id of knownList) {
    const lvl = levelMap.get(id);
    const sp = refData.spells[id];
    if (lvl === undefined || !sp) continue;
    (knownByLevel.get(lvl) ?? knownByLevel.set(lvl, []).get(lvl)!).push({ id, name: sp.name });
  }
  // Bonus spells known (bloodline, mystery/curse/channel, discipline, patron,
  // archetype grants) plus undercastable chain versions: all auto-granted and
  // castable at the table, exempt only from the spells-known cap, and assembled
  // in `model/knownSpells.ts` so the crafting picker sees the same set.
  for (const sp of bonusKnownSpellsFor(doc, refData, sheet, casterTag, classLevel, levelMap)) {
    (knownByLevel.get(sp.level) ?? knownByLevel.set(sp.level, []).get(sp.level)!).push(
      sp.undercastOf
        ? { id: sp.id, name: sp.name, undercastOf: sp.undercastOf }
        : { id: sp.id, name: sp.name },
    );
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
      icon={<SparklesIcon />}
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
                      <SpellDetail
                        spell={spellData}
                        spellLevel={0}
                        abilityMod={abilityMod}
                        casterLevel={casterLevel}
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
                    // Cast-time metamagic: the chosen feats bump the slot the
                    // Cast button spends (less any always-on discount for this
                    // spell); only Heighten also raises the effective level
                    // (and thus DC), driven by the chosen levels, never by the
                    // discounted slot. An engaged free application (Meta-Rage)
                    // keeps the cast at the base slot and spends the pool
                    // instead — the Heighten DC bump still applies.
                    const applied = castMetamagic[sp.id] ?? [];
                    const discount = metamagicDiscountFor(discountSources, sp.id);
                    const freePlan = freeMetamagicPlan({
                      doc,
                      sources: freeSources,
                      baseLevel: level,
                      applied,
                      maxSlotLevel,
                      armedIds: new Set(
                        freeSources.filter((s) => freeArmed[`${sp.id}:${s.id}`]).map((s) => s.id),
                      ),
                    });
                    const castLevel =
                      level + paidMetamagicSlotIncrease(applied, discount.amount, freePlan);
                    const effectiveLevel = level + metamagicEffectiveIncrease(applied);
                    const castRemaining = remainingByLevel.get(castLevel) ?? 0;
                    const castExhausted = castRemaining <= 0;
                    const castSpend = (d: CharacterDoc) =>
                      spendFreeMetamagic(
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
                        derivedPools,
                        freePlan,
                      );
                    return (
                      <div key={sp.id} className="prep-row">
                        <div className="prep-row-main">
                          <span className="prep-name">{sp.name}</span>
                          {sp.undercastOf && (
                            <span
                              className="tag-mystery"
                              title={`Undercast from your known ${sp.undercastOf}`}
                            >
                              undercast
                            </span>
                          )}
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
                            chips={metamagicChips(owned, grantedSlugs, [])}
                            applied={applied}
                            baseLevel={level}
                            maxSlotLevel={maxSlotLevel}
                            discount={discount}
                            plan={freePlan}
                            onToggleFree={(sourceId) => {
                              const key = `${sp.id}:${sourceId}`;
                              setFreeArmed((prev) => ({ ...prev, [key]: prev[key] !== true }));
                            }}
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
                            onCast={castSpend}
                          />
                        )}
                        <TipButton
                          className="pick-btn remove prep-cast"
                          disabled={castExhausted}
                          disabledReason={`No level-${castLevel} slots remaining`}
                          title={freeMetamagicCastTitle(
                            sp.name,
                            freePlan,
                            castLevel === level
                              ? `Cast ${sp.name} (spend 1 level-${level} slot)`
                              : `Cast ${sp.name} with metamagic (spend 1 level-${castLevel} slot)`,
                            `1 level-${castLevel} slot`,
                          )}
                          onClick={() => {
                            const msg = freeMetamagicSpendMessage(freePlan);
                            update(castSpend);
                            if (msg) showToast({ message: msg });
                          }}
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
