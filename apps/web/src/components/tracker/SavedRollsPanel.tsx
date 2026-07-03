import { useEffect, useId, useMemo, useState } from "react";

import type { SavedRoll } from "@pf1/schema";

import {
  addSavedRoll,
  availableSavedRollSources,
  removeSavedRoll,
  resolveSavedRoll,
  updateSavedRoll,
  type ResolvedSavedRoll,
} from "../../model/savedRolls.js";
import { NumberField } from "../builder/NumberField.js";
import { Panel } from "../builder/Panel.js";
import { Provenance } from "../Provenance.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Saved rolls (issue #2) — the owner-decided "no dice roller" answer: pin a
 * name to a number the sheet already computes (a full attack, a save, a
 * skill) so it's one glance away during play instead of scrolling the whole
 * character sheet. Every row re-resolves against the live `DerivedSheet` on
 * every render, so a saved roll never goes stale as buffs/feats/gear change.
 * A saved roll can carry a flat attack/damage adjustment (for situational
 * feats the engine doesn't toggle, e.g. Rapid Shot, Deadly Aim) or point at
 * nothing at all (`source.kind === "custom"`) for one-off bookmarks.
 */
export function SavedRollsPanel({ doc, sheet, update }: BuilderProps) {
  const [query, setQuery] = useState("");

  const saved = doc.build.savedRolls ?? [];
  const resolved = useMemo(() => saved.map((r) => resolveSavedRoll(r, sheet)), [saved, sheet]);

  const options = useMemo(() => availableSavedRollSources(sheet), [sheet]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !q || o.label.toLowerCase().includes(q)).slice(0, 60);
  }, [options, query]);

  return (
    <Panel title="Saved Rolls" step="sr" storageKey="panel:SavedRolls">
      {saved.length === 0 ? (
        <div className="empty">No saved rolls yet — pin one below.</div>
      ) : (
        <div className="res-list">
          {saved.map((roll, i) => (
            <SavedRollRow
              key={roll.id}
              roll={roll}
              resolved={resolved[i]!}
              onUpdate={(patch) => update((d) => updateSavedRoll(d, roll.id, patch))}
              onRemove={() => update((d) => removeSavedRoll(d, roll.id))}
            />
          ))}
        </div>
      )}

      <h4 className="tracker-sub">Add a saved roll</h4>
      <p className="hint spell-hint-line">
        Pick a source below, then expand the saved row to layer a manual
        adjustment (e.g. Rapid Shot's −2) or, for "Custom", enter a value and
        damage note by hand.
      </p>
      <input
        className="search"
        type="text"
        placeholder="Search attacks, saves, skills…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="scroll short">
        {matches.map((opt, i) => (
          <div className="pick-row" key={`${opt.source.kind}-${i}`}>
            <div className="pmain">
              <div className="pname">{opt.label}</div>
            </div>
            <button
              type="button"
              className="pick-btn add"
              onClick={() => update((d) => addSavedRoll(d, opt.source, opt.label))}
            >
              Add
            </button>
          </div>
        ))}
        {matches.length === 0 ? <div className="empty">No matches.</div> : null}
      </div>
    </Panel>
  );
}

/**
 * One saved roll: a name/value/damage/remove line, expanding below (full row
 * width) to its `Provenance` breakdown plus editable attack/damage
 * adjustments — or, for a custom roll, a manual value + damage note.
 */
function SavedRollRow({
  roll,
  resolved,
  onUpdate,
  onRemove,
}: {
  roll: SavedRoll;
  resolved: ResolvedSavedRoll;
  onUpdate: (
    patch: Partial<Pick<SavedRoll, "label" | "attackModifier" | "damageModifier" | "customDamage">>,
  ) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const isCustom = roll.source.kind === "custom";
  const isWeapon = roll.source.kind === "weapon";

  return (
    <div className="res-row saved-roll-row">
      <div className="saved-roll-row-line">
        <div className="res-main">
          <RenameField value={roll.label} onCommit={(label) => onUpdate({ label })} />
          {resolved.missing ? <div className="res-sub">source no longer available</div> : null}
        </div>
        <button
          type="button"
          className="res-count saved-roll-value-btn"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="caret">{open ? "▲" : "▼"}</span>
          {resolved.display}
        </button>
        {resolved.damage ? (
          <span className="saved-roll-damage" title="Damage">
            {resolved.damage.display}
            {resolved.damage.crit ? ` (${resolved.damage.crit})` : ""}
          </span>
        ) : null}
        <div className="res-btns">
          <button type="button" className="btn-ghost" onClick={onRemove} aria-label={`remove ${roll.label}`}>
            ✕
          </button>
        </div>
      </div>
      {open ? (
        <div id={panelId} className="saved-roll-detail">
          {resolved.components.length > 0 ? (
            <Provenance
              title={isCustom ? "Value breakdown" : `${roll.label} breakdown`}
              components={resolved.components}
            />
          ) : null}
          <label className="saved-roll-adjust">
            {isCustom ? "Value" : "Attack adjustment"}
            <NumberField
              className="num"
              size={4}
              stepper={false}
              allowEmpty
              placeholder="0"
              value={roll.attackModifier}
              onCommit={(n) => onUpdate({ attackModifier: n })}
              aria-label={isCustom ? "Custom value" : "Attack adjustment"}
            />
          </label>

          {isCustom ? (
            <label className="saved-roll-adjust saved-roll-adjust--wide">
              Damage note
              <input
                type="text"
                placeholder="e.g. 2d6+4, x3 crit"
                value={roll.customDamage ?? ""}
                onChange={(e) => onUpdate({ customDamage: e.target.value || undefined })}
              />
            </label>
          ) : null}

          {isWeapon ? (
            <>
              {resolved.damage && resolved.damage.components.length > 0 ? (
                <Provenance title="Damage breakdown" components={resolved.damage.components} />
              ) : null}
              <label className="saved-roll-adjust">
                Damage adjustment
                <NumberField
                  className="num"
                  size={4}
                  stepper={false}
                  allowEmpty
                  placeholder="0"
                  value={roll.damageModifier}
                  onCommit={(n) => onUpdate({ damageModifier: n })}
                  aria-label="Damage adjustment"
                />
              </label>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Inline-editable label, committed on blur/Enter (mirrors NumberField's commit model). */
function RenameField({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  return (
    <input
      className="res-name saved-roll-name"
      type="text"
      value={local}
      aria-label="Saved roll name"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const trimmed = local.trim();
        if (trimmed && trimmed !== value) onCommit(trimmed);
        else setLocal(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
