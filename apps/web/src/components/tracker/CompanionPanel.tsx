import { useState } from "react";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import {
  addCompanionNonlethal,
  animalFocusBuffs,
  applyCompanionDamage,
  deriveCompanionSheet,
  healCompanion,
  healCompanionNonlethal,
  hunterLevel,
  restCompanion,
  setCompanionFocus,
} from "../../model/companion.js";
import {
  companionSkillRows,
  formatCompanionAttackDamage,
  formatCompanionAttackName,
  formatCompanionAttackRoll,
  formatCompanionAttackTypeSuffix,
  formatCompanionSummary,
} from "../../model/companionDisplay.js";
import { signed } from "../../model/names.js";
import { InfoTip } from "../InfoTip.js";
import { StatSeal } from "../StatSeal.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Tracker panel for a tracked animal companion (`build.animalCompanion`) —
 * HP tracker plus AC/saves/attacks/skills/special-abilities, derived live
 * from the character document via `model/companion.ts`'s
 * `deriveCompanionSheet`. Renders nothing when there's no companion yet (no
 * `build.animalCompanion`, or no companion-granting source chosen) — mirrors
 * `FamiliarPanel`'s collapsed-when-absent posture and StatSeal/stat-group
 * vocabulary at compact scale.
 */
export function CompanionPanel({ doc, refData, update }: BuilderProps) {
  const [amount, setAmount] = useState(3);
  const companion = deriveCompanionSheet(doc, refData);
  if (!companion) return null;

  // Hunter's Animal Focus applied to the companion (issue #65) — display-only
  // (see AnimalCompanionLiveState.focusBuffId's doc comment); only relevant
  // once the character has hunter levels at all.
  const isHunter = hunterLevel(doc) > 0;
  const foci = isHunter ? animalFocusBuffs(refData) : [];
  const focusBuffId = doc.live.animalCompanion?.focusBuffId ?? "";

  const amt = Number.isNaN(amount) ? 0 : amount;
  const { current, nonlethal } = companion.hp;
  const effective = current - nonlethal;
  const isLow = companion.hp.max > 0 && effective <= Math.floor(companion.hp.max / 4);

  const skillRows = companionSkillRows(companion);

  return (
    <Panel
      title={`Companion — ${companion.name}`}
      step="comp"
      storageKey="panel:Companion"
      defaultCollapsed
    >
      <div className="familiar-summary hint">{formatCompanionSummary(companion)}</div>

      <div className="hp-display">
        <div className="hp-big num" data-low={isLow}>
          {current}
          <span className="hp-slash">/</span>
          {companion.hp.max}
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
          onClick={() => update((d) => applyCompanionDamage(d, amt))}
        >
          Damage
        </button>
        <button
          type="button"
          className="btn-act heal"
          onClick={() => update((d) => healCompanion(d, amt))}
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
            onClick={() => update((d) => addCompanionNonlethal(d, amt))}
          >
            +{amt}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update((d) => healCompanionNonlethal(d, amt))}
          >
            −{amt}
          </button>
        </div>
        <button
          type="button"
          className="btn-ghost rest"
          onClick={() => update((d) => restCompanion(d))}
        >
          Rest ⤿
        </button>
      </div>

      {isHunter && (
        <div className="hp-row">
          <span className="hp-inline-label">Animal Focus</span>
          <select
            className="familiar-select"
            value={focusBuffId}
            onChange={(e) =>
              update((d) =>
                setCompanionFocus(d, e.target.value.length > 0 ? e.target.value : undefined),
              )
            }
            aria-label="Companion animal focus"
          >
            <option value="">— none —</option>
            {foci.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="stat-group familiar-stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Defense</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--3">
          <StatSeal
            label="AC"
            value={companion.ac.normal}
            components={companion.ac.components}
            provTitle="Companion AC components"
            className="seal--compact"
          />
          <StatSeal label="Touch" value={companion.ac.touch} className="seal--compact" />
          <StatSeal label="Flat-Footed" value={companion.ac.flatFooted} className="seal--compact" />
        </div>
      </div>

      <div className="stat-group familiar-stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Offense</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--2">
          <StatSeal label="BAB" value={signed(companion.bab)} className="seal--compact" />
          <StatSeal
            label="CMB / CMD"
            value={`${signed(companion.cmb)} / ${companion.cmd}`}
            className="seal--compact"
          />
        </div>
        {companion.attacks.length > 0 ? (
          <div className="weapon-attack-list familiar-attack-list">
            {companion.attacks.map((a, i) => (
              <div key={i} className="weapon-attack-row">
                <span className="weapon-attack-name">
                  {formatCompanionAttackName(a)}
                  {formatCompanionAttackTypeSuffix(a) ? (
                    <span className="hint"> {formatCompanionAttackTypeSuffix(a)}</span>
                  ) : null}
                </span>
                <div className="weapon-attack-stats familiar-attack-stats">
                  <StatSeal
                    label="Attack"
                    value={formatCompanionAttackRoll(a)}
                    className="seal--compact"
                  />
                  <StatSeal
                    label="Damage"
                    value={formatCompanionAttackDamage(a)}
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
          <StatSeal label="Fort" value={signed(companion.saves.fort)} className="seal--compact" />
          <StatSeal label="Ref" value={signed(companion.saves.ref)} className="seal--compact" />
          <StatSeal label="Will" value={signed(companion.saves.will)} className="seal--compact" />
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

      {(companion.specialAbilities.length > 0 || companion.specialNotes.length > 0) && (
        <>
          <h4 className="tracker-sub">Special abilities</h4>
          <div className="chips familiar-abilities">
            {companion.specialAbilities.map((a) => (
              <InfoTip key={a.name} className="chip display-only" content={a.detail}>
                {a.name}
              </InfoTip>
            ))}
            {companion.specialNotes.map((note) => (
              <span key={note} className="chip display-only">
                {note}
              </span>
            ))}
          </div>
        </>
      )}

      <p className="hint companion-tricks-hint">
        {companion.bonusTricks} bonus trick{companion.bonusTricks === 1 ? "" : "s"} ·{" "}
        {companion.bonusFeats} bonus feat{companion.bonusFeats === 1 ? "" : "s"} (not separately
        tracked)
      </p>
    </Panel>
  );
}
