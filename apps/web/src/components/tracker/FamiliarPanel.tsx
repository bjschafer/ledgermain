import { useState } from "react";

import { CONDITIONS, CONDITION_IDS, effectiveSpellLevel, spellIdByName } from "@pf1/engine";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import { BirdIcon } from "../icons.js";
import {
  addFamiliarNonlethal,
  applyFamiliarDamage,
  deriveFamiliarSheet,
  familiarSupersedingCondition,
  hasFamiliarCondition,
  healFamiliar,
  healFamiliarNonlethal,
  restFamiliar,
  restoreFamiliarSla,
  setFamiliarInReach,
  spendFamiliarSla,
  toggleFamiliarCondition,
} from "../../model/familiar.js";
import { creatureAbilityRows } from "../../model/creatureDisplay.js";
import {
  familiarSlaDc,
  formatCreatureDefenses,
  formatFamiliarAttackDamage,
  formatFamiliarAttackName,
  formatFamiliarAttackRoll,
  formatFamiliarSummary,
  formatSlaFrequency,
  partitionFamiliarSkills,
  PRIMARY_FAMILIAR_SKILLS,
} from "../../model/familiarDisplay.js";
import { signed } from "../../model/names.js";
import { SpellBonusesExclusion } from "../../state/spellBonuses.js";
import { InfoTip } from "../InfoTip.js";
import { SpellDetail } from "../SpellDetail.js";
import { StatSeal } from "../StatSeal.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Tracker panel for a tracked familiar (`build.familiar`) — HP tracker plus
 * AC/saves/attacks/skills/special-abilities, derived live from the master's
 * computed sheet via `model/familiar.ts`'s `deriveFamiliarSheet`. Renders
 * nothing when the character has no familiar (matches the collapsed-when-
 * absent posture other conditional panels use, e.g. `HeroPointsPanel`).
 */
export function FamiliarPanel({ doc, sheet, refData, update }: BuilderProps) {
  const [amount, setAmount] = useState(3);
  const familiar = deriveFamiliarSheet(doc, refData, sheet);
  if (!familiar) return null;

  const amt = Number.isNaN(amount) ? 0 : amount;
  const { current, nonlethal } = familiar.hp;
  const effective = current - nonlethal;
  const isLow = familiar.hp.max > 0 && effective <= Math.floor(familiar.hp.max / 4);
  const inReach = doc.live.familiarInReach ?? true;

  const skillIds = Array.from(
    new Set([
      ...PRIMARY_FAMILIAR_SKILLS,
      ...Object.entries(doc.build.skillRanks ?? {})
        .filter(([, ranks]) => ranks > 0)
        .map(([id]) => id),
    ]),
  );
  const { primary: primarySkills, secondary: secondarySkills } = partitionFamiliarSkills(
    skillIds,
    familiar,
  );

  return (
    <Panel
      title={`Familiar: ${familiar.name}`}
      step="fam"
      icon={<BirdIcon />}
      storageKey="panel:Familiar"
      defaultCollapsed
    >
      <div className="familiar-summary hint">{formatFamiliarSummary(familiar)}</div>
      {(familiar.creatureType !== undefined || familiar.hd !== undefined) && (
        <div className="familiar-summary hint">
          {[familiar.creatureType, familiar.hd !== undefined ? `${familiar.hd} HD` : null]
            .filter((part): part is string => part != null)
            .join(" · ")}
        </div>
      )}
      {familiar.languages && familiar.languages.length > 0 && (
        <div className="familiar-summary hint">Languages: {familiar.languages.join(", ")}</div>
      )}

      <label className="hp-inline familiar-in-reach">
        <input
          type="checkbox"
          checked={inReach}
          onChange={(e) => update((d) => setFamiliarInReach(d, e.target.checked))}
        />
        <span>Within arm's reach (grants you Alertness)</span>
      </label>

      <div className="hp-display">
        <div className="hp-big num" data-low={isLow}>
          {current}
          <span className="hp-slash">/</span>
          {familiar.hp.max}
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
          onClick={() => update((d) => applyFamiliarDamage(d, amt))}
        >
          Damage
        </button>
        <button
          type="button"
          className="btn-act heal"
          onClick={() => update((d) => healFamiliar(d, amt))}
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
            onClick={() => update((d) => addFamiliarNonlethal(d, amt))}
          >
            +{amt}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update((d) => healFamiliarNonlethal(d, amt))}
          >
            −{amt}
          </button>
        </div>
        <button
          type="button"
          className="btn-ghost rest"
          onClick={() => update((d) => restFamiliar(d))}
        >
          Rest ⤿
        </button>
      </div>

      <div className="familiar-conditions">
        <h4 className="tracker-sub">Conditions</h4>
        <div className="chips">
          {CONDITION_IDS.map((id) => {
            const cond = CONDITIONS[id]!;
            const on = hasFamiliarCondition(doc, id);
            const supersededBy = familiarSupersedingCondition(doc, id);
            const implied = supersededBy !== undefined;
            const impliedName = supersededBy ? CONDITIONS[supersededBy]?.name : undefined;
            const tipContent = implied
              ? `Implied by ${impliedName}. Turn ${impliedName} off to control ${cond.name} directly.`
              : cond.displayOnly
                ? `${cond.summary} (reference only, no numeric modifier applied)`
                : cond.summary;
            return (
              <button
                key={id}
                type="button"
                className={`chip cond${cond.displayOnly ? " display-only" : ""}${implied ? " implied" : ""}`}
                aria-pressed={on}
                disabled={implied}
                title={tipContent}
                onClick={() => update((d) => toggleFamiliarCondition(d, id))}
              >
                {cond.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="stat-group familiar-stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Abilities</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--3">
          {creatureAbilityRows(familiar.abilities).map((a) => (
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
            value={familiar.ac.normal}
            components={familiar.ac.components}
            provTitle="Familiar AC components"
            className="seal--compact"
          />
          <StatSeal label="Touch" value={familiar.ac.touch} className="seal--compact" />
          <StatSeal label="Flat-Footed" value={familiar.ac.flatFooted} className="seal--compact" />
          <StatSeal label="CMD" value={familiar.cmd} className="seal--compact" />
          <StatSeal label="Init" value={signed(familiar.init)} className="seal--compact" />
          {familiar.spellResistance !== undefined ? (
            <StatSeal label="SR" value={familiar.spellResistance} className="seal--compact" />
          ) : null}
        </div>
        {familiar.defenses && (
          <div className="familiar-defenses-line hint">
            {formatCreatureDefenses(familiar.defenses)}
          </div>
        )}
      </div>

      <div className="stat-group familiar-stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Offense</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--2">
          <StatSeal label="BAB" value={signed(familiar.bab)} className="seal--compact" />
          <StatSeal label="CMB" value={signed(familiar.cmb)} className="seal--compact" />
        </div>
        {familiar.attacks.length > 0 ? (
          <div className="weapon-attack-list familiar-attack-list">
            {familiar.attacks.map((a, i) => (
              <div key={i} className="weapon-attack-row">
                <span className="weapon-attack-name">{formatFamiliarAttackName(a)}</span>
                <div className="weapon-attack-stats familiar-attack-stats">
                  <StatSeal
                    label="Attack"
                    value={formatFamiliarAttackRoll(a)}
                    className="seal--compact"
                  />
                  <StatSeal
                    label="Damage"
                    value={formatFamiliarAttackDamage(a)}
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
          <StatSeal
            label="Fort"
            value={signed(familiar.saves.fort)}
            conditionals={familiar.saveConditionals?.fort}
            className="seal--compact"
          />
          <StatSeal
            label="Ref"
            value={signed(familiar.saves.ref)}
            conditionals={familiar.saveConditionals?.ref}
            className="seal--compact"
          />
          <StatSeal
            label="Will"
            value={signed(familiar.saves.will)}
            conditionals={familiar.saveConditionals?.will}
            className="seal--compact"
          />
        </div>
      </div>

      {familiar.slas && familiar.slas.length > 0 ? (
        <>
          <h4 className="tracker-sub">Spell-like abilities</h4>
          <div className="res-list familiar-sla-list">
            {familiar.slas.map((sla) => {
              const spellId = spellIdByName(refData, sla.spell);
              const spell = spellId ? refData.spells[spellId] : undefined;
              const dc = familiarSlaDc(sla, refData);
              const metered = sla.usesMax !== undefined;
              const remaining = sla.usesRemaining ?? 0;
              return (
                <div key={sla.slug} className="res-row">
                  <div className="res-main">
                    <div className="res-head">
                      <span className="res-name">{sla.name}</span>
                      <span className="res-sub">{formatSlaFrequency(sla.frequency)}</span>
                      <span className="res-sub">CL {sla.cl}</span>
                      {dc !== undefined ? <span className="res-sub">DC {dc}</span> : null}
                    </div>
                    {sla.note ? <div className="res-detail">{sla.note}</div> : null}
                    {spell ? (
                      <SpellBonusesExclusion>
                        <SpellDetail
                          spell={spell}
                          spellLevel={effectiveSpellLevel(spell)}
                          abilityMod={sla.dcMod}
                          casterLevel={sla.cl}
                        />
                      </SpellBonusesExclusion>
                    ) : null}
                  </div>
                  {metered ? (
                    <>
                      <div className="res-count num">
                        {remaining}
                        <span className="res-slash">/</span>
                        {sla.usesMax}
                      </div>
                      <div className="res-btns">
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => update((d) => spendFamiliarSla(d, sla.slug))}
                          disabled={remaining <= 0}
                          aria-label={`spend ${sla.name}`}
                        >
                          −
                        </button>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => update((d) => restoreFamiliarSla(d, sla.slug))}
                          disabled={remaining >= (sla.usesMax ?? 0)}
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
        </>
      ) : null}

      <h4 className="tracker-sub">Skills</h4>
      <div className="familiar-skill-grid">
        {primarySkills.map((s) => (
          <div key={s.id} className="familiar-skill familiar-skill--primary">
            <span className="fs-name">{s.name}</span>
            <span className="fs-val num">{signed(s.total)}</span>
          </div>
        ))}
      </div>

      {secondarySkills.length > 0 ? (
        <details className="spell-detail familiar-skills-more">
          <summary className="spell-detail-summary">
            Show {secondarySkills.length} more skill{secondarySkills.length === 1 ? "" : "s"}
          </summary>
          <div className="familiar-skill-grid">
            {secondarySkills.map((s) => (
              <div key={s.id} className="familiar-skill">
                <span className="fs-name">{s.name}</span>
                <span className="fs-val num">{signed(s.total)}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {familiar.specialAbilities.length > 0 ? (
        <>
          <h4 className="tracker-sub">Special abilities</h4>
          <div className="chips familiar-abilities">
            {familiar.specialAbilities.map((a) => (
              <InfoTip key={a.name} className="chip display-only" content={a.detail}>
                {a.name}
              </InfoTip>
            ))}
          </div>
        </>
      ) : null}

      {familiar.specialNotes && familiar.specialNotes.length > 0 ? (
        <div className="familiar-special-notes">
          {familiar.specialNotes.map((note, i) => (
            <p key={i} className="hint familiar-special-note">
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
