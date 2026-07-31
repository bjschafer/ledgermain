import { useState } from "react";

import { srCheckOutcome, srNeededRoll } from "../../model/srCheck.js";
import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import { ShieldIcon } from "../icons.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Adjudicates an incoming caster level check against the character's SR
 * (PF1: the effect affects the target only if 1d20 + caster level equals or
 * exceeds SR, with no natural-20/1 auto-success/failure the way attacks and
 * saves get). Self-hides when the character has no SR to check against.
 *
 * Both inputs are table scratch, not build state: the attacker's caster
 * level and check total change every incoming effect, so they live in local
 * component state and are never written to the `CharacterDoc` (this app has
 * no dice roller by design, see `SavedRollsPanel.tsx`'s header comment; the
 * GM rolls, this panel only compares).
 */
export function SpellResistancePanel({ sheet }: BuilderProps) {
  const [casterLevel, setCasterLevel] = useState<number | undefined>(undefined);
  const [checkTotal, setCheckTotal] = useState<number | undefined>(undefined);

  const sr = sheet.defenses?.sr;
  if (!sr || sr.total <= 0) return null;

  const needed = casterLevel == null ? undefined : srNeededRoll(sr.total, casterLevel);
  const outcome = checkTotal == null ? undefined : srCheckOutcome(sr.total, checkTotal);

  return (
    <Panel title="Spell Resistance" icon={<ShieldIcon />} storageKey="panel:SpellResistance">
      <p className="hint">
        Your SR is <span className="num">{sr.total}</span>. A spell's own Spell Resistance line says
        whether a check is even required; this only adjudicates the check once one applies. Caster
        level checks have no automatic success on a natural 20 or automatic failure on a natural 1,
        so only the total matters.
      </p>

      <label className="field">
        <span>Attacker's caster level</span>
        <NumberField
          value={casterLevel}
          allowEmpty
          min={0}
          stepper={false}
          size={3}
          placeholder="?"
          onCommit={setCasterLevel}
          aria-label="Attacker's caster level"
        />
      </label>
      {needed ? (
        <p className="hint">
          {needed.autoSucceeds
            ? "Any roll succeeds against your SR."
            : needed.impossible
              ? "No roll can succeed against your SR."
              : `Needs ${needed.neededRoll}+ on the die to beat your SR.`}
        </p>
      ) : null}

      <label className="field">
        <span>Attacker's check total (1d20 + caster level)</span>
        <NumberField
          value={checkTotal}
          allowEmpty
          min={0}
          stepper={false}
          size={3}
          placeholder="?"
          onCommit={setCheckTotal}
          aria-label="Attacker's check total"
        />
      </label>
      {outcome ? (
        <p className={outcome === "affects" ? "hint warn-over" : "hint"}>
          {outcome === "affects"
            ? "The check beats your SR: the effect gets through."
            : "The check falls short: your SR turns it aside."}
        </p>
      ) : null}
    </Panel>
  );
}
