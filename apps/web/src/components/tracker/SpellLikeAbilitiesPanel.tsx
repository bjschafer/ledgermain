import { useMemo } from "react";

import { deriveResourcePools } from "@pf1/engine";

import { AbilityTypeTag } from "../builder/ClassFeaturesList.js";
import { Panel } from "../builder/Panel.js";
import { SparklesIcon } from "../icons.js";
import { drainResource, restoreResource, syncDerivedPools } from "../../model/resources.js";
import { slaFrequencyLabel } from "../../model/spellLikeAbilities.js";
import { SpellDetail } from "../SpellDetail.js";
import { SpellBonusesExclusion } from "../../state/spellBonuses.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Castable spell-like abilities (`DerivedSheet.spellLikeAbilities`) — racial
 * innates, heritage traits, class features, and feats that grant a specific
 * named spell N/day, at will, or constantly. Self-hides when the character
 * has none.
 *
 * Each metered row's uses counter drains the same `live.resources` pool the
 * engine derived for it (a synthetic `sla:*` pool, or the granting trait/
 * feature's own vendored pool) — `ResourcesPanel` hides those pool rows so
 * one budget never shows two counters. The spell strip renders inside
 * `SpellBonusesExclusion`: SLAs are not spells being cast, so Spell Focus /
 * Spell Penetration bonuses deliberately do not fold in.
 */
export function SpellLikeAbilitiesPanel({ doc, sheet, refData, update }: BuilderProps) {
  const pools = useMemo(
    () => deriveResourcePools(doc, refData, sheet.abilities, sheet.abilityDCs),
    [doc, refData, sheet.abilities, sheet.abilityDCs],
  );

  const slas = sheet.spellLikeAbilities;
  if (!slas || slas.length === 0) return null;

  const poolById = new Map(pools.map((p) => [p.id, p]));
  const drain = (id: string) => update((d) => drainResource(syncDerivedPools(d, pools), id, 1));
  const restore = (id: string) => update((d) => restoreResource(syncDerivedPools(d, pools), id, 1));

  return (
    <Panel
      title="Spell-Like Abilities"
      icon={<SparklesIcon />}
      storageKey="panel:SpellLikeAbilities"
    >
      <div className="res-list">
        {slas.map((sla) => {
          const pool = sla.poolId !== undefined ? poolById.get(sla.poolId) : undefined;
          const used = sla.poolId !== undefined ? (doc.live.resources[sla.poolId]?.used ?? 0) : 0;
          const left = pool ? Math.max(0, pool.max - used) : 0;
          const spell = sla.spellId !== undefined ? refData.spells[sla.spellId] : undefined;
          return (
            <div key={sla.id} className="res-row">
              <div className="res-main">
                <div className="res-head">
                  <span className="res-name">
                    {sla.name}
                    <AbilityTypeTag abilityType="sp" />
                  </span>
                  <span className="res-sub">{slaFrequencyLabel(sla, pool?.max)}</span>
                  <span className="res-sub">CL {sla.casterLevel}</span>
                </div>
                <div className="res-detail">
                  {sla.source}
                  {sla.note ? ` · ${sla.note}` : null}
                </div>
                {spell ? (
                  <SpellBonusesExclusion>
                    <SpellDetail
                      spell={spell}
                      spellLevel={sla.spellLevel}
                      abilityMod={sla.abilityMod}
                      casterLevel={sla.casterLevel}
                    />
                  </SpellBonusesExclusion>
                ) : null}
              </div>
              {pool ? (
                <>
                  <div className="res-count num">
                    {left}
                    <span className="res-slash">/</span>
                    {pool.max}
                  </div>
                  <div className="res-btns">
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => drain(sla.poolId!)}
                      disabled={left <= 0}
                      aria-label={`spend ${sla.name}`}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => restore(sla.poolId!)}
                      disabled={left >= pool.max}
                      aria-label={`restore ${sla.name}`}
                    >
                      +
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
