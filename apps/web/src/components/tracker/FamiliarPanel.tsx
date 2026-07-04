import { useState } from "react";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import {
  addFamiliarNonlethal,
  applyFamiliarDamage,
  deriveFamiliarSheet,
  healFamiliar,
  healFamiliarNonlethal,
  restFamiliar,
  setFamiliarInReach,
} from "../../model/familiar.js";
import { signed, skillName } from "../../model/names.js";
import type { BuilderProps } from "../builder/types.js";

/** The six PF1 "animal" universal-monster-rule class skills, always shown even at 0 ranks. */
const ALWAYS_SHOWN_SKILLS = ["ste", "per", "acr", "clm", "fly", "swm"];

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
      ...ALWAYS_SHOWN_SKILLS,
      ...Object.entries(doc.build.skillRanks ?? {})
        .filter(([, ranks]) => ranks > 0)
        .map(([id]) => id),
    ]),
  ).sort((a, b) => skillName(a).localeCompare(skillName(b)));

  return (
    <Panel title={`Familiar — ${familiar.name}`} step="fam" storageKey="panel:Familiar">
      <div className="familiar-summary hint">
        {familiar.speciesName}, {familiar.size}. Speed{" "}
        {Object.entries(familiar.speeds)
          .map(([mode, ft]) => (mode === "land" ? `${ft} ft.` : `${mode} ${ft} ft.`))
          .join(", ")}
        . {familiar.senses.join(", ")}.
      </div>

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
        <div className="hp-nl">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update((d) => addFamiliarNonlethal(d, amt))}
          >
            +{amt} nonlethal
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update((d) => healFamiliarNonlethal(d, amt))}
          >
            −{amt} nonlethal
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

      <div className="familiar-stats">
        <div>
          AC {familiar.ac.normal}, touch {familiar.ac.touch}, flat-footed {familiar.ac.flatFooted}
        </div>
        <div>
          Fort {signed(familiar.saves.fort)}, Ref {signed(familiar.saves.ref)}, Will{" "}
          {signed(familiar.saves.will)}
        </div>
        <div>
          BAB {signed(familiar.bab)}, CMB {signed(familiar.cmb)}, CMD {familiar.cmd}
        </div>
        {familiar.attacks.length > 0 ? (
          <div className="familiar-attacks">
            {familiar.attacks
              .map(
                (a) =>
                  `${a.count > 1 ? `${a.count} ${a.name.toLowerCase()}s` : a.name} ${signed(a.attack)} (${
                    a.damageDice
                  }${a.damageBonus !== 0 ? signed(a.damageBonus) : ""}${a.note ? ` ${a.note}` : ""})`,
              )
              .join(", ")}
          </div>
        ) : null}
      </div>

      <h4 className="tracker-sub">Skills</h4>
      <div className="familiar-skills num">
        {skillIds.map((id) => {
          const skill = familiar.skills[id];
          if (!skill) return null;
          return (
            <span key={id} className="familiar-skill">
              {skillName(id)} {signed(skill.total)}
            </span>
          );
        })}
      </div>

      {familiar.specialAbilities.length > 0 ? (
        <>
          <h4 className="tracker-sub">Special abilities</h4>
          <ul className="familiar-abilities hint">
            {familiar.specialAbilities.map((a) => (
              <li key={a.name} title={a.detail}>
                {a.name}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {familiar.spellResistance !== undefined ? (
        <div className="hint">Spell Resistance {familiar.spellResistance}</div>
      ) : null}
    </Panel>
  );
}
