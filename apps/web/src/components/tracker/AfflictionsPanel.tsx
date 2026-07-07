import { useState } from "react";

import type { AbilityId } from "@pf1/schema";
import { ABILITY_IDS } from "@pf1/schema";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import { Explainer } from "../Explainer.js";
import {
  abilityZeroWarnings,
  activeAbilityAfflictions,
  disabledByDamageLabel,
  getNegativeLevels,
  isDisabledByDamage,
  negLevelDeathWarning,
  setAbilityAffliction,
  setNegativeLevels,
  totalNegativeLevels,
  type AbilityAfflictionKind,
} from "../../model/afflictions.js";
import { ABILITY_NAMES, signed } from "../../model/names.js";
import type { BuilderProps } from "../builder/types.js";

const KIND_LABELS: Record<AbilityAfflictionKind, string> = {
  damage: "damage",
  drain: "drain",
  penalty: "penalty",
};

/**
 * Ability damage/drain/penalty (issue #18) + negative levels (issue #19).
 * Numbers themselves are computed by the engine (`@pf1/engine` collect.ts);
 * this panel only edits `doc.live.*` and surfaces the RAW thresholds the
 * engine deliberately doesn't model as warnings: ability damage reaching the
 * current score (unconsciousness), negative levels reaching Hit Dice (death),
 * and — issue #31 — any derived ability total dropping to 0 or below (its own
 * per-ability RAW effect; Con's is death, enforced separately by `hpState` in
 * `model/hp.ts`).
 *
 * No auto-decrement on rest: the app's "rest" action is fragmented across
 * three independent panel buttons (HP/Resources/Prepared Spells) with no
 * single new-day event — see model/afflictions.ts's doc comment. Players heal
 * 1 point/ability/day of natural ability-damage recovery by hand, via the
 * same − stepper used to clear it entirely.
 */
export function AfflictionsPanel({ doc, sheet, update }: BuilderProps) {
  const active = activeAbilityAfflictions(doc);
  const negLevels = getNegativeLevels(doc);
  const totalNeg = totalNegativeLevels(doc);
  const anyActive = active.length > 0 || totalNeg > 0;

  const disabledAbilities = ABILITY_IDS.filter((id) => isDisabledByDamage(doc, sheet, id));
  const dying = negLevelDeathWarning(doc, sheet);
  const zeroAbilities = abilityZeroWarnings(sheet);

  const [addAbility, setAddAbility] = useState<AbilityId>("str");
  const [addKind, setAddKind] = useState<AbilityAfflictionKind>("damage");
  const [addPoints, setAddPoints] = useState(1);

  const alreadyAdded = active.some((a) => a.ability === addAbility && a.kind === addKind);

  return (
    <Panel
      title="Afflictions"
      step="af"
      storageKey="panel:Afflictions"
      right={
        anyActive ? (
          <span className="hint">{active.length + (totalNeg > 0 ? 1 : 0)} active</span>
        ) : undefined
      }
    >
      {!anyActive ? (
        <div className="empty">
          No ability damage/drain/penalty or negative levels. Add one below.
        </div>
      ) : (
        <div className="res-list">
          {active.map((a) => (
            <AfflictionRow
              key={`${a.kind}-${a.ability}`}
              ability={a.ability}
              kind={a.kind}
              points={a.points}
              onChange={(n) => update((d) => setAbilityAffliction(d, a.kind, a.ability, n))}
            />
          ))}
        </div>
      )}

      {(disabledAbilities.length > 0 || zeroAbilities.length > 0 || dying) && (
        <ul className="cond-notes affliction-warnings">
          {disabledAbilities.map((id) => (
            <li key={id} className="affliction-warn">
              <b>{ABILITY_NAMES[id]} damage</b> has reached the current score —{" "}
              {disabledByDamageLabel(id)}.
            </li>
          ))}
          {zeroAbilities.map(({ ability, effect }) => (
            <li key={`zero-${ability}`} className="affliction-warn">
              <b>{ABILITY_NAMES[ability]}</b> has dropped to 0 or below — the character is {effect}{" "}
              (PF1 RAW).
            </li>
          ))}
          {dying ? (
            <li className="affliction-warn">
              <b>Negative levels</b> ({totalNeg}) have reached the character's Hit Dice — the
              character dies (PF1 RAW).
            </li>
          ) : null}
        </ul>
      )}

      <h4 className="tracker-sub">Negative levels</h4>
      <div className="res-row affliction-neglevels">
        <label className="hp-inline">
          <span>Temporary</span>
          <NumberField
            className="num"
            size={3}
            value={negLevels.temporary}
            min={0}
            onCommit={(n) => update((d) => setNegativeLevels(d, "temporary", n))}
            aria-label="Temporary negative levels"
          />
        </label>
        <label className="hp-inline">
          <span>Permanent</span>
          <NumberField
            className="num"
            size={3}
            value={negLevels.permanent}
            min={0}
            onCommit={(n) => update((d) => setNegativeLevels(d, "permanent", n))}
            aria-label="Permanent negative levels"
          />
        </label>
        {totalNeg > 0 ? (
          <span className="hint">
            {signed(-totalNeg)} attack/saves/skills, {signed(-5 * totalNeg)} max HP
          </span>
        ) : null}
      </div>
      <Explainer title="How temporary negative levels clear">
        <p className="hint">
          Temporary negative levels allow a Fortitude save to remove each one 24h after being gained
          (no timer is tracked here — remove them yourself once saved off).
        </p>
      </Explainer>

      <h4 className="tracker-sub">Add an ability affliction</h4>
      <div className="res-add">
        <select
          value={addAbility}
          onChange={(e) => setAddAbility(e.target.value as AbilityId)}
          aria-label="Ability"
        >
          {ABILITY_IDS.map((id) => (
            <option key={id} value={id}>
              {ABILITY_NAMES[id]}
            </option>
          ))}
        </select>
        <select
          value={addKind}
          onChange={(e) => setAddKind(e.target.value as AbilityAfflictionKind)}
          aria-label="Kind"
        >
          {(Object.keys(KIND_LABELS) as AbilityAfflictionKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <NumberField
          className="num"
          size={3}
          value={addPoints}
          min={1}
          commitOnChange
          onCommit={(n) => setAddPoints(n)}
          aria-label="Points"
        />
        <button
          type="button"
          className="pick-btn add"
          disabled={alreadyAdded}
          title={alreadyAdded ? "Already tracked — adjust it in the list above" : undefined}
          onClick={() => {
            update((d) =>
              setAbilityAffliction(d, addKind, addAbility, Number.isNaN(addPoints) ? 1 : addPoints),
            );
            setAddPoints(1);
          }}
        >
          Add
        </button>
      </div>
    </Panel>
  );
}

function AfflictionRow({
  ability,
  kind,
  points,
  onChange,
}: {
  ability: AbilityId;
  kind: AbilityAfflictionKind;
  points: number;
  onChange: (n: number) => void;
}) {
  const modDelta = Math.floor(points / 2);
  const sub =
    kind === "drain" ? `drain · score ${signed(-points)}` : `${kind} · ${signed(-modDelta)} mod`;

  return (
    <div className="res-row">
      <div className="res-main">
        <div className="res-name">{ABILITY_NAMES[ability]}</div>
        <div className="res-sub">{sub}</div>
      </div>
      <NumberField
        className="num"
        size={3}
        value={points}
        min={0}
        onCommit={onChange}
        aria-label={`${ABILITY_NAMES[ability]} ${kind}`}
      />
      <button
        type="button"
        className="btn-ghost"
        onClick={() => onChange(0)}
        aria-label={`remove ${ABILITY_NAMES[ability]} ${kind}`}
      >
        ✕
      </button>
    </div>
  );
}
