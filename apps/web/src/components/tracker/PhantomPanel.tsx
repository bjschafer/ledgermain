import { useState } from "react";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import {
  addPhantomNonlethal,
  applyPhantomDamage,
  derivePhantomSheet,
  healPhantom,
  healPhantomNonlethal,
  restPhantom,
  setPhantomManifestation,
} from "../../model/phantom.js";
import {
  formatPhantomAttackDamage,
  formatPhantomAttackName,
  formatPhantomAttackRoll,
  formatPhantomSummary,
  phantomSkillRows,
} from "../../model/phantomDisplay.js";
import { signed } from "../../model/names.js";
import { InfoTip } from "../InfoTip.js";
import { StatSeal } from "../StatSeal.js";
import type { BuilderProps } from "../builder/types.js";

const MANIFESTATION_OPTIONS: { id: "ectoplasmic" | "incorporeal" | "confined"; label: string }[] = [
  { id: "ectoplasmic", label: "Ectoplasmic" },
  { id: "incorporeal", label: "Incorporeal" },
  { id: "confined", label: "Confined (in consciousness)" },
];

/**
 * Tracker panel for a tracked phantom (`build.phantom`) — HP tracker plus
 * AC/saves/attacks/skills/special-abilities, derived live from the character
 * document via `model/phantom.ts`'s `derivePhantomSheet`. Renders nothing
 * when there's no phantom yet (mirrors `CompanionPanel`'s collapsed-when-
 * absent posture and StatSeal/stat-group vocabulary at compact scale).
 */
export function PhantomPanel({ doc, refData, update }: BuilderProps) {
  const [amount, setAmount] = useState(3);
  const phantom = derivePhantomSheet(doc, refData);
  if (!phantom) return null;

  const manifestation = doc.live.phantom?.manifestation ?? "ectoplasmic";

  const amt = Number.isNaN(amount) ? 0 : amount;
  const { current, nonlethal } = phantom.hp;
  const effective = current - nonlethal;
  const isLow = phantom.hp.max > 0 && effective <= Math.floor(phantom.hp.max / 4);

  const skillRows = phantomSkillRows(phantom);

  return (
    <Panel
      title={`Phantom — ${phantom.name}`}
      step="phtm"
      storageKey="panel:Phantom"
      defaultCollapsed
    >
      <div className="familiar-summary hint">{formatPhantomSummary(phantom)}</div>

      <div className="hp-row">
        <span className="hp-inline-label">Manifestation</span>
        <select
          className="familiar-select"
          value={manifestation}
          onChange={(e) =>
            update((d) =>
              setPhantomManifestation(
                d,
                e.target.value as "ectoplasmic" | "incorporeal" | "confined",
              ),
            )
          }
          aria-label="Phantom manifestation"
        >
          {MANIFESTATION_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="hp-display">
        <div className="hp-big num" data-low={isLow}>
          {current}
          <span className="hp-slash">/</span>
          {phantom.hp.max}
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
          onClick={() => update((d) => applyPhantomDamage(d, amt))}
        >
          Damage
        </button>
        <button
          type="button"
          className="btn-act heal"
          onClick={() => update((d) => healPhantom(d, amt))}
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
            onClick={() => update((d) => addPhantomNonlethal(d, amt))}
          >
            +{amt}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update((d) => healPhantomNonlethal(d, amt))}
          >
            −{amt}
          </button>
        </div>
        <button
          type="button"
          className="btn-ghost rest"
          onClick={() => update((d) => restPhantom(d))}
        >
          Rest ⤿
        </button>
      </div>

      <div className="stat-group familiar-stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Defense</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--3">
          <StatSeal
            label="AC"
            value={phantom.ac.normal}
            components={phantom.ac.components}
            provTitle="Phantom AC components"
            className="seal--compact"
          />
          <StatSeal label="Touch" value={phantom.ac.touch} className="seal--compact" />
          <StatSeal label="Flat-Footed" value={phantom.ac.flatFooted} className="seal--compact" />
        </div>
      </div>

      <div className="stat-group familiar-stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Offense</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--2">
          <StatSeal label="BAB" value={signed(phantom.bab)} className="seal--compact" />
          <StatSeal
            label="CMB / CMD"
            value={`${signed(phantom.cmb)} / ${phantom.cmd}`}
            className="seal--compact"
          />
        </div>
        {phantom.attacks.length > 0 ? (
          <div className="weapon-attack-list familiar-attack-list">
            {phantom.attacks.map((a, i) => (
              <div key={i} className="weapon-attack-row">
                <span className="weapon-attack-name">{formatPhantomAttackName(a)}</span>
                <div className="weapon-attack-stats familiar-attack-stats">
                  <StatSeal
                    label="Attack"
                    value={formatPhantomAttackRoll(a)}
                    className="seal--compact"
                  />
                  <StatSeal
                    label="Damage"
                    value={formatPhantomAttackDamage(a)}
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
          <StatSeal label="Fort" value={signed(phantom.saves.fort)} className="seal--compact" />
          <StatSeal label="Ref" value={signed(phantom.saves.ref)} className="seal--compact" />
          <StatSeal label="Will" value={signed(phantom.saves.will)} className="seal--compact" />
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

      {phantom.specialAbilities.length > 0 && (
        <>
          <h4 className="tracker-sub">Special abilities</h4>
          <div className="chips familiar-abilities">
            {phantom.specialAbilities.map((a) => (
              <InfoTip key={a.name} className="chip display-only" content={a.detail}>
                {a.name}
              </InfoTip>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
