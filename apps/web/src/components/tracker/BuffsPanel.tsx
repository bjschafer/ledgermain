import { useMemo, useState } from "react";

import type { ActiveBuff, Buff, CharacterDoc, Change, ContextNote } from "@pf1/schema";
import { buildRollData, evaluateBuffChange, unappliedChanges } from "@pf1/engine";
import type { RollData } from "@pf1/engine";

import { Panel } from "../builder/Panel.js";
import { NumberField } from "../builder/NumberField.js";
import {
  addBuff,
  advanceRound,
  hasNoModeledEffect,
  makeActiveBuff,
  makeCustomBuff,
  removeBuff,
  setBuffRounds,
  suggestRounds,
  type DurationUnit,
  roundsToDisplay,
  toRounds,
} from "../../model/buffs.js";
import { isSharedWithCompanion, toggleSharedBuffCompanion } from "../../model/companion.js";
import { isSharedWithFamiliar, toggleSharedBuff } from "../../model/familiar.js";
import { changeTargetLabel, signed } from "../../model/names.js";
import type { BuilderProps } from "../builder/types.js";

/** Common typed-modifier targets for the custom-buff door (not exhaustive). */
const TARGETS = [
  "attack",
  "mattack",
  "rattack",
  "ac",
  "allSavingThrows",
  "fort",
  "ref",
  "will",
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
  "init",
  "cmb",
  "cmd",
  "skills",
  "spellResist",
  "dr",
  "dr.magic",
  "dr.silver",
  "dr.coldIron",
  "dr.adamantine",
  "eres.fire",
  "eres.cold",
  "eres.electricity",
  "eres.acid",
  "eres.sonic",
];
const TYPES = [
  "untyped",
  "enh",
  "morale",
  "luck",
  "sacred",
  "competence",
  "dodge",
  "deflection",
  "resistance",
  "circumstance",
];

export function BuffsPanel({ doc, sheet, refData, update }: BuilderProps) {
  const [query, setQuery] = useState("");
  const [step, setStep] = useState(1);
  const casterLevel = Math.max(1, sheet.level);

  // Same roll-data shape compute() evaluated buffs against, so previews and
  // active-buff rows show the actual resolved value rather than the raw
  // `@data.path` formula string.
  const rollData = useMemo(
    () => buildRollData(doc, refData, sheet.abilities, sheet.speeds),
    [doc, refData, sheet.abilities, sheet.speeds],
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(refData.buffs)
      .filter((b) => !q || b.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 60);
  }, [refData.buffs, query]);

  const add = (buff: Buff) =>
    update((d) =>
      addBuff(
        d,
        makeActiveBuff(buff, {
          casterLevel,
          remainingRounds: suggestRounds(buff, casterLevel),
        }),
      ),
    );

  const tick = (n: number) => update((d) => advanceRound(d, n).doc);

  return (
    <Panel
      title="Buffs"
      step="bf"
      storageKey="panel:Buffs"
      right={
        <div className="round-ctl">
          <button type="button" className="btn-act round" onClick={() => tick(step)}>
            Advance {step === 1 ? "round" : `${step} rds`}
          </button>
          <NumberField
            className="num"
            size={2}
            value={step}
            min={1}
            commitOnChange
            onCommit={(n) => setStep(n)}
            aria-label="Rounds per advance"
          />
        </div>
      }
    >
      {doc.live.activeBuffs.length === 0 ? (
        <div className="empty">No active buffs.</div>
      ) : (
        <div className="buff-list">
          {doc.live.activeBuffs.map((b) => (
            <BuffRow
              key={b.instanceId}
              buff={b}
              rollData={rollData}
              update={update}
              hasFamiliar={!!doc.build.familiar}
              sharedWithFamiliar={isSharedWithFamiliar(doc, b.instanceId)}
              hasCompanion={!!doc.build.animalCompanion}
              sharedWithCompanion={isSharedWithCompanion(doc, b.instanceId)}
            />
          ))}
        </div>
      )}

      <h4 className="tracker-sub">Add a buff</h4>
      <input
        className="search"
        type="text"
        placeholder="Search the buff compendium…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="scroll short">
        {matches.map((buff) => (
          <div className="pick-row" key={buff.id}>
            <div className="pmain">
              <div className="pname">
                {buff.name} <PartialBadge changes={buff.changes} />{" "}
                <NoEffectHint changes={buff.changes} contextNotes={buff.contextNotes} />
              </div>
              <div className="preq">
                {buff.changes.slice(0, 4).map((c, i) => (
                  <span key={i} title={c.formula}>
                    {changeTargetLabel(c.target)} {formulaHint(c, { casterLevel }, rollData)}
                  </span>
                ))}
              </div>
            </div>
            <button type="button" className="pick-btn add" onClick={() => add(buff)}>
              Add
            </button>
          </div>
        ))}
      </div>

      <CustomBuffForm
        onAdd={(name, target, type, value, rounds) =>
          update((d) =>
            addBuff(
              d,
              makeCustomBuff(name, [{ formula: String(value), target, type }], {
                remainingRounds: rounds,
              }),
            ),
          )
        }
      />
    </Panel>
  );
}

/**
 * Show what a buff change's formula actually amounts to right now, evaluated
 * against the character's current stats (e.g. `@abilities.cha.mod` -> "+3").
 * Falls back to the raw formula string for dice terms or evaluation errors
 * (the formula is still shown in full via the element's `title` tooltip).
 */
function formulaHint(
  change: Pick<Change, "formula">,
  buff: Pick<ActiveBuff, "casterLevel">,
  rollData: RollData,
): string {
  const value = evaluateBuffChange(change, buff, rollData);
  return value === null ? change.formula : signed(value);
}

/**
 * Compact "this buff has effects the sheet can't apply" flag. Shown whenever
 * a buff's changes include a target `compute()` doesn't consume (see
 * `@pf1/engine`'s targets.ts) — e.g. Spell Resistance's `spellResist` or
 * Divine Power's `strChecks`/`strSkills`. Non-blocking, matches the existing
 * `.soft` prose-prereq warning style.
 */
function PartialBadge({ changes }: { changes: readonly Change[] }) {
  const missing = unappliedChanges(changes);
  if (missing.length === 0) return null;
  const labels = missing.map((c) => changeTargetLabel(c.target));
  return (
    <span className="soft" title={`Not auto-applied: ${labels.join(", ")}`}>
      ⚠ partial
    </span>
  );
}

/**
 * "This buff does nothing on this sheet" flag — for buffs with an empty
 * `changes[]` AND an empty `contextNotes[]` (e.g. Stoneskin, Invisibility):
 * toggling them is a silent trap with no visible effect at all. Distinct from
 * {@link PartialBadge}, which flags buffs that DO have changes but some of
 * them land on an unconsumed target. See `model/buffs.ts`'s
 * `hasNoModeledEffect` and issue #21.
 */
function NoEffectHint({
  changes,
  contextNotes,
}: {
  changes: readonly Change[];
  contextNotes?: readonly ContextNote[];
}) {
  if (!hasNoModeledEffect({ changes, contextNotes })) return null;
  return (
    <span
      className="soft"
      title="This buff has no changes or reminders — it's a reminder only, with nothing for the sheet to apply."
    >
      reminder only — no modeled effect
    </span>
  );
}

/**
 * A single active-buff row with unit-aware duration display and entry.
 *
 * The unit (rds / min / hr) is local state, initialized from the buff's current
 * `remainingRounds` via {@link roundsToDisplay}. Changing the unit or the value
 * converts back to whole rounds via {@link toRounds} and calls `setBuffRounds`.
 */
function BuffRow({
  buff,
  rollData,
  update,
  hasFamiliar = false,
  sharedWithFamiliar = false,
  hasCompanion = false,
  sharedWithCompanion = false,
}: {
  buff: ActiveBuff;
  rollData: RollData;
  update: (fn: (d: CharacterDoc) => CharacterDoc) => void;
  /** Whether the character has a tracked familiar (`build.familiar`) — hides the share toggle when false. */
  hasFamiliar?: boolean;
  /** Whether this buff instance is currently shared onto the familiar's derived sheet. */
  sharedWithFamiliar?: boolean;
  /** Whether the character has a tracked companion (`build.animalCompanion`) — hides the share toggle when false. */
  hasCompanion?: boolean;
  /** Whether this buff instance is currently shared onto the companion's derived sheet (Share Spells). */
  sharedWithCompanion?: boolean;
}) {
  const [unit, setUnit] = useState<DurationUnit>(
    () => roundsToDisplay(buff.remainingRounds)?.unit ?? "rds",
  );

  // Convert remainingRounds to the currently-selected unit for display.
  // If the conversion rounds to 0 (e.g. 3 rounds in "hr" mode), show ∞ so
  // the user knows to pick a smaller unit or type a value.
  const factor = unit === "hr" ? 600 : unit === "min" ? 10 : 1;
  const displayVal: number | undefined =
    buff.remainingRounds != null
      ? Math.round(buff.remainingRounds / factor) || undefined
      : undefined;

  return (
    <div className="buff-row">
      <div className="buff-main">
        <div className="buff-name">
          {buff.name} <PartialBadge changes={buff.changes} />{" "}
          <NoEffectHint changes={buff.changes} contextNotes={buff.contextNotes} />
        </div>
        <div className="buff-changes num">
          {buff.changes.map((c, i) => (
            <span key={i} className="buff-change" title={c.formula}>
              {changeTargetLabel(c.target)} {c.type ? <em>[{c.type}]</em> : null}{" "}
              {formulaHint(c, buff, rollData)}
            </span>
          ))}
        </div>
      </div>
      <label className="buff-rounds">
        <NumberField
          className="num"
          size={3}
          stepper={false}
          allowEmpty
          placeholder="∞"
          value={displayVal}
          onCommit={(n) =>
            update((d) =>
              setBuffRounds(d, buff.instanceId, n == null ? undefined : toRounds(n, unit)),
            )
          }
          aria-label={`${buff.name} duration`}
        />
        <select
          className="dur-unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value as DurationUnit)}
          aria-label={`${buff.name} duration unit`}
        >
          <option value="rds">rds</option>
          <option value="min">min</option>
          <option value="hr">hr</option>
        </select>
      </label>
      {hasFamiliar ? (
        <label
          className="buff-share-familiar"
          title="Also apply this buff's changes to the familiar"
        >
          <input
            type="checkbox"
            checked={sharedWithFamiliar}
            onChange={() => update((d) => toggleSharedBuff(d, buff.instanceId))}
          />
          <span>Familiar</span>
        </label>
      ) : null}
      {hasCompanion ? (
        <label
          className="buff-share-companion"
          title="Also apply this buff's changes to the companion (Share Spells)"
        >
          <input
            type="checkbox"
            checked={sharedWithCompanion}
            onChange={() => update((d) => toggleSharedBuffCompanion(d, buff.instanceId))}
          />
          <span>Companion</span>
        </label>
      ) : null}
      <button
        type="button"
        className="btn-ghost"
        onClick={() => update((d) => removeBuff(d, buff.instanceId))}
      >
        Remove
      </button>
    </div>
  );
}

function CustomBuffForm({
  onAdd,
}: {
  onAdd: (
    name: string,
    target: string,
    type: string,
    value: number,
    rounds: number | undefined,
  ) => void;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("attack");
  const [type, setType] = useState("untyped");
  const [value, setValue] = useState(1);
  const [durVal, setDurVal] = useState<number | undefined>(undefined);
  const [durUnit, setDurUnit] = useState<DurationUnit>("rds");

  return (
    <details className="custom-buff">
      <summary>Custom buff (expert)</summary>
      <div className="cb-grid">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Target">
          {TARGETS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Bonus type">
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <NumberField
          className="num"
          size={3}
          value={value}
          onCommit={(n) => setValue(n)}
          aria-label="Value"
        />
        <div className="dur-field">
          <NumberField
            className="num"
            size={3}
            stepper={false}
            allowEmpty
            placeholder="∞"
            value={durVal}
            onCommit={setDurVal}
            aria-label="Duration value"
          />
          <select
            className="dur-unit"
            value={durUnit}
            onChange={(e) => setDurUnit(e.target.value as DurationUnit)}
            aria-label="Duration unit"
          >
            <option value="rds">rds</option>
            <option value="min">min</option>
            <option value="hr">hr</option>
          </select>
        </div>
        <button
          type="button"
          className="pick-btn add"
          onClick={() => {
            onAdd(
              name || `${target} ${signed(value)}`,
              target,
              type,
              Number.isNaN(value) ? 0 : value,
              durVal == null ? undefined : toRounds(durVal, durUnit),
            );
            setName("");
            setDurVal(undefined);
          }}
        >
          Add
        </button>
      </div>
    </details>
  );
}
