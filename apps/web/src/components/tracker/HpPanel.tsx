import { useState } from "react";

import { qualifierLabel } from "@pf1/engine";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import { consumePools, livePools } from "../../model/ablative.js";
import { damagePreview } from "../../model/damagePreview.js";
import {
  addNonlethal,
  applyDamage,
  applyHealing,
  healNonlethal,
  hpState,
  restHp,
  setStable,
  setTempHp,
  type HpState,
} from "../../model/hp.js";
import { showToast } from "../../state/toast.js";
import { InfoTip } from "../InfoTip.js";
import { HeartIcon } from "../icons.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Toast threshold for Damage/Heal (UX audit: "feedback: toasts + undo").
 * Routine ±5 clicks at the table shouldn't interrupt play with a toast every
 * time — but a big hit (>= this) or one that lands the character at 0 HP or
 * below is exactly the kind of "wait, did I mean to do that?" moment an
 * Undo action is worth surfacing for.
 */
const HP_TOAST_THRESHOLD = 10;

/** Human-readable status line for each `hpState` result; empty for `ok` (no noise on a healthy character). */
function statusLabel(state: HpState): string {
  switch (state.status) {
    case "ok":
      return "";
    case "no-hp":
      return "No HP yet — add a class in the Build tab.";
    case "disabled":
      return "Disabled (0 HP) — staggered: one move or standard action per round; a strenuous act deals 1 more damage.";
    case "dying":
      return `Dying — losing 1 HP/round while unconscious. Dies at ${state.diesAt} HP.`;
    case "stable":
      return `Stable — unconscious, no longer losing HP. Dies at ${state.diesAt} HP if bleeding resumes.`;
    case "dead":
      return `Dead — HP at or below ${state.diesAt}.`;
    case "staggered-nonlethal":
      return "Staggered — nonlethal damage equals current HP.";
    case "unconscious-nonlethal":
      return "Unconscious — nonlethal damage exceeds current HP (not dying).";
  }
}

/** Current/temp/nonlethal HP with fast damage + healing controls. */
export function HpPanel({ doc, sheet, update, undoLast }: BuilderProps) {
  // Free text rather than a number, so "12b 6c" and "9 damage, 3 of which are
  // cold" are typeable; a bare number still behaves exactly as it always did.
  const [amountText, setAmountText] = useState("5");
  const [bypasses, setBypasses] = useState<string[]>([]);
  const max = sheet.hp.max;
  const restMode = doc.build.settings?.restMode ?? "full";
  const { current, temp, nonlethal } = doc.live.hp;
  const effective = current - nonlethal;
  const isLow = max > 0 && effective <= Math.floor(max / 4);
  const fillPct = max > 0 ? Math.max(0, Math.min(1, effective / max)) : 1;

  const state = hpState(doc, sheet);
  // The stabilize toggle only makes sense in the negative-but-above-the-death-
  // threshold range regardless of the current flag value, so the player can
  // flip it on or back off while the character is actually dying.
  const dyingRange = current < 0 && current > state.diesAt;

  const pools = livePools(doc, sheet.level);
  const preview = damagePreview(amountText, sheet.defenses, bypasses, pools);
  // Damage applies the post-defense number; Heal and Nonlethal are untouched
  // by DR/resistance and use the raw total.
  const dmgAmt = preview.amount;
  const amt = preview.raw;

  return (
    <Panel title="Hit Points" step="hp" icon={<HeartIcon />} storageKey="panel:PlayHP">
      <div className="hp-display">
        <div className="hp-big num" data-low={isLow}>
          {current}
          <span className="hp-slash">/</span>
          {max}
        </div>
        <div className="hp-side">
          {temp > 0 ? <span className="hp-chip temp num">+{temp} temp</span> : null}
          {nonlethal > 0 ? <span className="hp-chip nl num">{nonlethal} nonlethal</span> : null}
        </div>
      </div>
      <div className="hp-fill-track">
        <div className="hp-fill-bar" data-low={isLow} style={{ width: `${fillPct * 100}%` }} />
      </div>

      {state.status !== "ok" ? (
        <div
          className={`hp-status-line${state.status === "no-hp" ? "" : " affliction-warn"}`}
          data-status={state.status}
        >
          {statusLabel(state)}
        </div>
      ) : null}
      {dyingRange ? (
        <label className="hp-inline hp-stable-toggle">
          <input
            type="checkbox"
            checked={!!doc.live.stable}
            onChange={(e) => update((d) => setStable(d, e.target.checked))}
          />
          <span>Stabilized</span>
        </label>
      ) : null}

      <div className="hp-controls">
        <span className="hp-amt-wrap">
          <input
            type="text"
            className="hp-amt num"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="5"
            aria-label="Amount"
          />
          <InfoTip
            className="chip-info"
            content={
              <>
                <strong>A plain number works as always.</strong> You can also name damage types the
                way your GM says them, and your DR and resistances come off automatically:
                <br />
                <br />
                <code>12b 6c</code> — 12 bludgeoning and 6 cold
                <br />
                <code>18 fire</code> — one energy type
                <br />
                <code>9, 3 of which are cold</code> — a 9-point total, 3 of it cold
                <br />
                <code>12 untyped</code> — damage nothing should reduce
                <br />
                <br />
                First letters work: b, p, s, f, c, e, a, w. Use <code>so</code> for sonic and{" "}
                <code>ph</code> for physical.
              </>
            }
          >
            ⓘ
          </InfoTip>
        </span>
        <button
          type="button"
          className="btn-act dmg"
          onClick={() => {
            // Draining the pools is part of the same transaction as the HP
            // hit — a stoneskin that soaked this blow must not still be at
            // full strength for the next one.
            const next = applyDamage(consumePools(doc, preview.resolution.pools), dmgAmt);
            update(() => next);
            const droppedToZero = next.live.hp.current <= 0;
            if (dmgAmt >= HP_TOAST_THRESHOLD || droppedToZero) {
              showToast({
                message: `Damage ${dmgAmt}${
                  preview.reduced ? ` (${preview.raw} − ${preview.raw - dmgAmt})` : ""
                } · HP ${current}→${next.live.hp.current}`,
                action: undoLast ? { label: "Undo", onAction: undoLast } : undefined,
              });
            }
          }}
        >
          Damage
        </button>
        <button
          type="button"
          className="btn-act heal"
          onClick={() => {
            const next = applyHealing(doc, amt, max);
            update(() => next);
            if (amt >= HP_TOAST_THRESHOLD) {
              showToast({
                message: `Heal ${amt} · HP ${current}→${next.live.hp.current}`,
                action: undoLast ? { label: "Undo", onAction: undoLast } : undefined,
              });
            }
          }}
        >
          Heal
        </button>
      </div>

      {/* Discoverability for the free-text field: shown while the amount is a
          single bare number (nobody has typed a damage type yet) and retired
          the moment one is used, so it teaches once rather than nagging. */}
      {preview.ok && !preview.reduced && preview.parse.terms.every((t) => t.inferred) ? (
        <div className="hp-damage-hint">
          Tip: name the damage type — <code>12b 6c</code>, <code>18 fire</code>,{" "}
          <code>9, 3 of which are cold</code>
        </div>
      ) : null}

      {preview.ok && (preview.reduced || preview.parse.terms.length > 1) ? (
        <div className="hp-damage-preview">
          <span className="hp-damage-terms">
            {preview.resolution.terms.map((t, i) => (
              <span key={`${t.type}-${i}`} className="hp-chip dmg-term">
                <span className="num">{t.amount}</span> {t.type}
                {t.final !== t.amount ? <span className="num"> → {t.final}</span> : null}
              </span>
            ))}
          </span>
          {preview.reduced ? (
            <span className="hp-damage-result">
              {preview.resolution.reductions.map((r) => r.label).join(", ")} ={" "}
              <span className="num">{preview.amount}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      {preview.assumed ? (
        <div className="hp-damage-note">
          Untyped amounts are treated as weapon damage, so DR applies. Add a type (“
          {preview.raw} fire”) or “untyped” to change that.
        </div>
      ) : null}

      {preview.parse.warnings.map((w) => (
        <div key={w} className="hp-damage-note affliction-warn">
          {w}
        </div>
      ))}

      {pools.length > 0 ? (
        <div className="hp-pool-row">
          {pools.map((p) => (
            <span key={p.id} className="hp-chip pool" title={p.exhaustedNote}>
              {p.label}
              {p.element ? ` (${p.element})` : ""}{" "}
              <span className="num">
                {p.remaining}/{p.capacity}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      {preview.bypassOptions.length > 0 ? (
        <div className="hp-bypass-row">
          <span className="hp-inline-label">Attack bypasses</span>
          {preview.bypassOptions.map((q) => {
            const on = bypasses.includes(q);
            return (
              <button
                key={q}
                type="button"
                className="btn-ghost hp-bypass-chip"
                aria-pressed={on}
                data-on={on}
                onClick={() =>
                  setBypasses((prev) => (on ? prev.filter((b) => b !== q) : [...prev, q]))
                }
              >
                {qualifierLabel(q)}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="hp-row">
        <label className="hp-inline">
          <span>Temp HP</span>
          <NumberField
            className="num"
            size={3}
            value={temp}
            min={0}
            onCommit={(n) => update((d) => setTempHp(d, n))}
            aria-label="Temporary HP"
          />
          {sheet.hp.grantedTemp.total > 0 ? (
            <InfoTip
              className="chip-info"
              content={`${sheet.hp.grantedTemp.total} granted by an active buff/feature (e.g. Rage) — set automatically on activation/deactivation; edit freely otherwise.`}
            >
              ⓘ
            </InfoTip>
          ) : null}
        </label>
        <div className="hp-nl">
          <span className="hp-inline-label">Nonlethal</span>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update((d) => addNonlethal(d, amt))}
          >
            +{amt}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => update((d) => healNonlethal(d, amt))}
          >
            −{amt}
          </button>
        </div>
        <span className="chip-wrap">
          <button
            type="button"
            className="btn-ghost rest"
            title={
              restMode === "natural"
                ? `Natural rest: heal ${sheet.level} HP (1×level), clear nonlethal`
                : "Full rest: heal to max, clear nonlethal"
            }
            onClick={() => update((d) => restHp(d, max, { mode: restMode, level: sheet.level }))}
          >
            Rest ⤿
          </button>
          <InfoTip
            className="chip-info"
            content={
              restMode === "natural"
                ? `Natural rest: heal ${sheet.level} HP (1×level), clear nonlethal`
                : "Full rest: heal to max, clear nonlethal"
            }
          >
            ⓘ
          </InfoTip>
        </span>
      </div>
    </Panel>
  );
}
