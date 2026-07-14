import { useState } from "react";

import { CONDITIONS, CONDITION_IDS } from "@pf1/engine";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import {
  addEidolonNonlethal,
  applyEidolonDamage,
  deriveEidolonSheet,
  eidolonSupersedingCondition,
  hasEidolonCondition,
  healEidolon,
  healEidolonNonlethal,
  isEidolonSummoned,
  restEidolon,
  toggleEidolonCondition,
  toggleEidolonSummoned,
} from "../../model/eidolon.js";
import { creatureAbilityRows } from "../../model/creatureDisplay.js";
import {
  eidolonAttackInstanceCount,
  eidolonSkillRows,
  formatEidolonAttackDamage,
  formatEidolonAttackName,
  formatEidolonAttackRoll,
  formatEidolonAttackTypeSuffix,
  formatEidolonEvolutionBudget,
  formatEidolonSummary,
} from "../../model/eidolonDisplay.js";
import { signed } from "../../model/names.js";
import { InfoTip } from "../InfoTip.js";
import { StatSeal } from "../StatSeal.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Tracker panel for a tracked eidolon (`build.eidolon`) — HP tracker plus
 * AC/saves/attacks/skills/special-abilities, derived live from the character
 * document via `model/eidolon.ts`'s `deriveEidolonSheet`. Renders nothing
 * when there's no eidolon yet (mirrors `PhantomPanel`/`CompanionPanel`'s
 * collapsed-when-absent posture and StatSeal/stat-group vocabulary at
 * compact scale).
 */
export function EidolonPanel({ doc, refData, update }: BuilderProps) {
  const [amount, setAmount] = useState(3);
  const eidolon = deriveEidolonSheet(doc, refData);
  if (!eidolon) return null;
  const eidolonFeatIds = doc.build.eidolon?.feats ?? [];

  const summoned = isEidolonSummoned(doc);

  const amt = Number.isNaN(amount) ? 0 : amount;
  const { current, nonlethal } = eidolon.hp;
  const effective = current - nonlethal;
  const isLow = eidolon.hp.max > 0 && effective <= Math.floor(eidolon.hp.max / 4);

  const skillRows = eidolonSkillRows(eidolon);
  const attackInstanceCount = eidolonAttackInstanceCount(eidolon);
  const overAttackCap = attackInstanceCount > eidolon.maxAttacks;

  return (
    <Panel
      title={`Eidolon — ${eidolon.name}`}
      step="edln"
      storageKey="panel:Eidolon"
      defaultCollapsed
    >
      <div className="familiar-summary hint">{formatEidolonSummary(eidolon)}</div>

      <div className="hp-row">
        <span className="hp-inline-label">Status</span>
        <button
          type="button"
          className="chip"
          onClick={() => update((d) => toggleEidolonSummoned(d))}
          title="PF1 RAW: the summoner can summon/dismiss the eidolon as a standard action. Display-only — the stat block below is unaffected either way."
        >
          {summoned ? "Summoned" : "Dismissed"}
        </button>
      </div>

      <div className="hp-display">
        <div className="hp-big num" data-low={isLow}>
          {current}
          <span className="hp-slash">/</span>
          {eidolon.hp.max}
        </div>
        {nonlethal > 0 ? <span className="hp-chip nl num">{nonlethal} nonlethal</span> : null}
      </div>

      <div className="hp-controls">
        <NumberField
          className="hp-amt num"
          size={4}
          value={amount}
          min={0}
          commitOnChange
          onCommit={(n) => setAmount(n)}
          aria-label="Amount"
        />
        <button
          type="button"
          className="btn-act dmg"
          onClick={() => update((d) => applyEidolonDamage(d, amt))}
        >
          Damage
        </button>
        <button
          type="button"
          className="btn-act heal"
          onClick={() => update((d) => healEidolon(d, amt))}
        >
          Heal
        </button>
      </div>

      <div className="hp-row">
        <div className="hp-nl">
          <span className="hp-inline-label">Nonlethal</span>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update((d) => addEidolonNonlethal(d, amt))}
          >
            +{amt}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update((d) => healEidolonNonlethal(d, amt))}
          >
            −{amt}
          </button>
        </div>
        <button
          type="button"
          className="btn-ghost rest"
          onClick={() => update((d) => restEidolon(d))}
        >
          Rest ⤿
        </button>
      </div>

      <div className="eidolon-conditions">
        <h4 className="tracker-sub">Conditions</h4>
        <div className="chips">
          {CONDITION_IDS.map((id) => {
            const cond = CONDITIONS[id]!;
            const on = hasEidolonCondition(doc, id);
            const supersededBy = eidolonSupersedingCondition(doc, id);
            const implied = supersededBy !== undefined;
            const impliedName = supersededBy ? CONDITIONS[supersededBy]?.name : undefined;
            const tipContent = implied
              ? `Implied by ${impliedName} — turn ${impliedName} off to control ${cond.name} directly.`
              : cond.displayOnly
                ? `${cond.summary} (reference only — no numeric modifier applied)`
                : cond.summary;
            return (
              <button
                key={id}
                type="button"
                className={`chip cond${cond.displayOnly ? " display-only" : ""}${implied ? " implied" : ""}`}
                aria-pressed={on}
                disabled={implied}
                title={tipContent}
                onClick={() => update((d) => toggleEidolonCondition(d, id))}
              >
                {cond.name}
              </button>
            );
          })}
        </div>
      </div>

      <p
        className="hint"
        title="If Life Link is available, damage can be manually transferred from the eidolon to the summoner (1 hp per point, immediate action) — not modeled numerically here."
      >
        Evolution points: {formatEidolonEvolutionBudget(eidolon)}
      </p>

      <p className="hint eidolon-bookkeeping-hint">
        <span
          className={overAttackCap ? "warn-over" : undefined}
          title="The base-form progression table caps total natural-attack instances at each level (display-only — not enforced on the evolutions you pick)."
        >
          Natural attacks: {attackInstanceCount} / max {eidolon.maxAttacks}
        </span>
        {" · "}
        Skill points: {eidolon.skillPoints} (4 × HD; not itemized)
        {" · "}
        {eidolonFeatIds.length} / {eidolon.bonusFeats} bonus feat
        {eidolon.bonusFeats === 1 ? "" : "s"} picked
      </p>

      <div className="stat-group familiar-stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Abilities</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--3">
          {creatureAbilityRows(eidolon.abilities).map((a) => (
            <StatSeal
              key={a.id}
              label={a.label}
              value={`${a.score} (${a.mod})`}
              className="seal--compact"
            />
          ))}
        </div>
      </div>

      <div className="stat-group familiar-stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Defense</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--4">
          <StatSeal
            label="AC"
            value={eidolon.ac.normal}
            components={eidolon.ac.components}
            provTitle="Eidolon AC components"
            className="seal--compact"
          />
          <StatSeal label="Touch" value={eidolon.ac.touch} className="seal--compact" />
          <StatSeal label="Flat-Footed" value={eidolon.ac.flatFooted} className="seal--compact" />
          <StatSeal label="Init" value={signed(eidolon.init)} className="seal--compact" />
        </div>
      </div>

      <div className="stat-group familiar-stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Offense</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--2">
          <StatSeal label="BAB" value={signed(eidolon.bab)} className="seal--compact" />
          <StatSeal
            label="CMB / CMD"
            value={`${signed(eidolon.cmb)} / ${eidolon.cmd}`}
            className="seal--compact"
          />
        </div>
        {eidolon.attacks.length > 0 ? (
          <div className="weapon-attack-list familiar-attack-list">
            {eidolon.attacks.map((a, i) => (
              <div key={i} className="weapon-attack-row">
                <span className="weapon-attack-name">
                  {formatEidolonAttackName(a)}
                  {formatEidolonAttackTypeSuffix(a) ? (
                    <span className="hint"> {formatEidolonAttackTypeSuffix(a)}</span>
                  ) : null}
                </span>
                <div className="weapon-attack-stats familiar-attack-stats">
                  <StatSeal
                    label="Attack"
                    value={formatEidolonAttackRoll(a)}
                    className="seal--compact"
                  />
                  <StatSeal
                    label="Damage"
                    value={formatEidolonAttackDamage(a)}
                    className="seal--compact"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="stat-group familiar-stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Saves</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--3">
          <StatSeal label="Fort" value={signed(eidolon.saves.fort)} className="seal--compact" />
          <StatSeal label="Ref" value={signed(eidolon.saves.ref)} className="seal--compact" />
          <StatSeal label="Will" value={signed(eidolon.saves.will)} className="seal--compact" />
        </div>
      </div>

      <h4 className="tracker-sub">Skills</h4>
      <div className="familiar-skill-grid">
        {skillRows.map((s) => (
          <div key={s.id} className="familiar-skill familiar-skill--primary">
            <span className="fs-name">{s.name}</span>
            <span className="fs-val num">{signed(s.total)}</span>
          </div>
        ))}
      </div>

      {eidolon.specialAbilities.length > 0 && (
        <>
          <h4 className="tracker-sub">Special abilities</h4>
          <div className="chips familiar-abilities">
            {eidolon.specialAbilities.map((a) => (
              <InfoTip key={a.name} className="chip display-only" content={a.detail}>
                {a.name}
              </InfoTip>
            ))}
          </div>
        </>
      )}

      {eidolonFeatIds.length > 0 && (
        <>
          <h4 className="tracker-sub">Feats</h4>
          <div className="chips">
            {eidolonFeatIds.map((id) => (
              <span key={id} className="chip display-only">
                {refData.feats[id]?.name ?? id}
              </span>
            ))}
          </div>
        </>
      )}

      {eidolon.freeEvolutionNames.length > 0 && (
        <>
          <h4 className="tracker-sub">Free evolutions ({eidolon.baseFormName})</h4>
          <div className="chips familiar-abilities">
            {eidolon.freeEvolutionNames.map((name) => (
              <span key={name} className="chip display-only">
                {name}
              </span>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
