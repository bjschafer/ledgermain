import { useState } from "react";

import type { ActiveForm, ActiveFormNaturalAttack, DerivedActiveForm } from "@pf1/schema";

import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import {
  addNaturalAttack,
  allPolymorphTiers,
  currentActiveForm,
  druidLevel,
  endActiveForm,
  formOptionKey,
  polymorphFormOptions,
  polymorphPanelVisible,
  polymorphTierName,
  removeNaturalAttack,
  setActiveFormName,
  setActiveFormNotes,
  sizeLabel,
  startActiveForm,
  updateNaturalAttack,
  wildShapeTiers,
} from "../../model/polymorph.js";
import { signed } from "../../model/names.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Tracker panel for a polymorph-family transformation (issue #70) — Wild
 * Shape, or a Beast Shape/Elemental Body/Plant Shape spell. Picking a tier +
 * size/creature-type/element and naming the form is all this panel does;
 * the resulting ability-score/AC/attack/CMB/CMD numbers flow through
 * `compute()` automatically (see `sheet.abilities`/`sheet.ac`/etc. — no
 * duplicate math here). Mirrors `ShifterAspectPanel`'s "live toggle, no
 * standing build.* half" shape — including hiding itself entirely for a
 * character with no polymorph source (see `polymorphPanelVisible`).
 */
export function ActiveFormPanel({ doc, sheet, refData, update }: BuilderProps) {
  const active = currentActiveForm(doc);
  const derived = sheet.activeForm;

  if (!polymorphPanelVisible(doc, refData)) return null;

  return (
    <Panel title="Polymorph / Wild Shape" step="wsh" storageKey="panel:Polymorph" defaultCollapsed>
      {active && derived ? (
        <ActiveFormEditor active={active} derived={derived} update={update} />
      ) : (
        <StartForm doc={doc} update={update} />
      )}
    </Panel>
  );
}

function StartForm({ doc, update }: Pick<BuilderProps, "doc" | "update">) {
  const dLevel = druidLevel(doc);
  const wildShapeTierIds = wildShapeTiers(doc);
  const [useAnyTier, setUseAnyTier] = useState(wildShapeTierIds.length === 0);
  const tierIds = useAnyTier ? allPolymorphTiers() : wildShapeTierIds;

  const [tier, setTier] = useState<string>(tierIds[0] ?? "");
  const [optionKey, setOptionKey] = useState<string>(() => {
    const first = polymorphFormOptions(tierIds[0] ?? "")[0];
    return first ? formOptionKey(first) : "";
  });
  const [formName, setFormName] = useState("");

  const options = polymorphFormOptions(tier);
  const selected = options.find((o) => formOptionKey(o) === optionKey) ?? options[0];

  const onTierChange = (next: string) => {
    setTier(next);
    const nextOptions = polymorphFormOptions(next);
    setOptionKey(nextOptions[0] ? formOptionKey(nextOptions[0]) : "");
  };

  return (
    <div className="polymorph-start">
      <p className="hint">
        {dLevel > 0
          ? `Wild Shape (druid ${dLevel}) currently grants: ${
              wildShapeTierIds.length > 0
                ? wildShapeTierIds.map(polymorphTierName).join(", ")
                : "none yet"
            }.`
          : "No druid Wild Shape levels — pick any tier directly (e.g. from a Beast Shape/Elemental Body/Plant Shape spell)."}
      </p>
      {dLevel > 0 && wildShapeTierIds.length > 0 ? (
        <label className="polymorph-any-tier">
          <input
            type="checkbox"
            checked={useAnyTier}
            onChange={(e) => {
              setUseAnyTier(e.target.checked);
              const next = e.target.checked ? allPolymorphTiers() : wildShapeTierIds;
              onTierChange(next[0] ?? "");
            }}
          />
          <span>Use any tier (spell, not Wild Shape)</span>
        </label>
      ) : null}
      <div className="polymorph-picker">
        <select
          value={tier}
          onChange={(e) => onTierChange(e.target.value)}
          aria-label="Polymorph tier"
        >
          {tierIds.length === 0 ? <option value="">No tiers available</option> : null}
          {tierIds.map((t) => (
            <option key={t} value={t}>
              {polymorphTierName(t)}
            </option>
          ))}
        </select>
        <select
          value={selected ? formOptionKey(selected) : ""}
          onChange={(e) => setOptionKey(e.target.value)}
          aria-label="Form size/type"
        >
          {options.map((o) => (
            <option key={formOptionKey(o)} value={formOptionKey(o)}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Form name (e.g. Dire Wolf)"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
        />
        <button
          type="button"
          className="pick-btn add"
          disabled={!selected}
          onClick={() => {
            if (!selected) return;
            update((d) =>
              startActiveForm(d, {
                tier,
                creatureType: selected.creatureType,
                size: selected.size,
                element: selected.element,
                formName: formName || selected.label,
              }),
            );
          }}
        >
          Assume Form
        </button>
      </div>
    </div>
  );
}

function ActiveFormEditor({
  active,
  derived,
  update,
}: {
  active: ActiveForm;
  derived: DerivedActiveForm;
  update: BuilderProps["update"];
}) {
  return (
    <div className="polymorph-active">
      <div className="polymorph-summary">
        <div className="pname">
          {active.formName}{" "}
          <span className="hint">
            — {derived.tierName}, {sizeLabel(derived.size)}
            {derived.element ? ` ${derived.element}` : ""}
          </span>
        </div>
        {derived.unresolved ? (
          <div className="soft">
            This tier/size/type combination isn't in the polymorph table — the size override still
            applies, but no ability-score or natural-armor adjustment was added.
          </div>
        ) : (
          <div className="hint">
            Natural armor +{derived.naturalArmor} (already folded into AC above).
          </div>
        )}
        <button type="button" className="btn-ghost" onClick={() => update((d) => endActiveForm(d))}>
          End Form
        </button>
      </div>

      <label className="polymorph-name">
        Name
        <input
          type="text"
          value={active.formName}
          onChange={(e) => update((d) => setActiveFormName(d, e.target.value))}
        />
      </label>

      <h4 className="tracker-sub">Natural attacks</h4>
      {(active.naturalAttacks ?? []).length === 0 ? (
        <div className="empty">No attack lines yet.</div>
      ) : null}
      <div className="polymorph-attacks">
        {(active.naturalAttacks ?? []).map((a, i) => {
          const resolved = derived.attacks[i];
          return (
            <div className="polymorph-attack-row" key={i}>
              <input
                type="text"
                placeholder="Name (e.g. Bite)"
                value={a.name}
                onChange={(e) => update((d) => updateNaturalAttack(d, i, { name: e.target.value }))}
              />
              <NumberField
                className="num"
                size={2}
                value={a.count ?? 1}
                min={1}
                commitOnChange
                onCommit={(n) => update((d) => updateNaturalAttack(d, i, { count: n }))}
                aria-label="Count"
              />
              <select
                value={a.kind ?? "primary"}
                onChange={(e) =>
                  update((d) =>
                    updateNaturalAttack(d, i, { kind: e.target.value as "primary" | "secondary" }),
                  )
                }
                aria-label="Primary or secondary attack"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary (−5)</option>
              </select>
              <input
                type="text"
                className="num"
                placeholder="Dmg dice (e.g. 1d8)"
                value={a.damageDice ?? ""}
                onChange={(e) =>
                  update((d) =>
                    updateNaturalAttack(d, i, { damageDice: e.target.value || undefined }),
                  )
                }
              />
              {resolved ? (
                <span className="num polymorph-attack-total">
                  {signed(resolved.attackBonus)}
                  {resolved.count > 1 ? ` ×${resolved.count}` : ""}, {resolved.damageDice ?? "—"}{" "}
                  {signed(resolved.damageBonus)} dmg
                </span>
              ) : null}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => update((d) => removeNaturalAttack(d, i))}
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <AddAttackRow onAdd={(attack) => update((d) => addNaturalAttack(d, attack))} />

      {derived.notes.length > 0 ? (
        <div className="polymorph-notes hint">
          {derived.notes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      ) : null}

      <label className="polymorph-player-notes">
        Notes (special abilities, tactics, ...)
        <textarea
          value={active.notes ?? ""}
          onChange={(e) => update((d) => setActiveFormNotes(d, e.target.value))}
          rows={2}
        />
      </label>
    </div>
  );
}

function AddAttackRow({ onAdd }: { onAdd: (attack: ActiveFormNaturalAttack) => void }) {
  const [name, setName] = useState("");
  const [count, setCount] = useState(1);
  const [kind, setKind] = useState<"primary" | "secondary">("primary");
  const [damageDice, setDamageDice] = useState("");

  return (
    <div className="polymorph-attack-row polymorph-attack-add">
      <input
        type="text"
        placeholder="Name (e.g. Bite)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <NumberField
        className="num"
        size={2}
        value={count}
        min={1}
        commitOnChange
        onCommit={(n) => setCount(n)}
        aria-label="Count"
      />
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as "primary" | "secondary")}
        aria-label="Primary or secondary attack"
      >
        <option value="primary">Primary</option>
        <option value="secondary">Secondary (−5)</option>
      </select>
      <input
        type="text"
        className="num"
        placeholder="Dmg dice (e.g. 1d8)"
        value={damageDice}
        onChange={(e) => setDamageDice(e.target.value)}
      />
      <button
        type="button"
        className="pick-btn add"
        disabled={!name.trim()}
        onClick={() => {
          onAdd({ name: name.trim(), count, kind, damageDice: damageDice.trim() || undefined });
          setName("");
          setCount(1);
          setDamageDice("");
        }}
      >
        Add
      </button>
    </div>
  );
}
