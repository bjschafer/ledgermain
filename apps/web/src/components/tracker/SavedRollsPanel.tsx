import { useEffect, useId, useMemo, useState } from "react";

import type { ModifierComponent } from "@pf1/schema";

import {
  addSavedRoll,
  availableSavedRollSources,
  removeSavedRoll,
  renameSavedRoll,
  resolveSavedRoll,
} from "../../model/savedRolls.js";
import { Panel } from "../builder/Panel.js";
import { Provenance } from "../Provenance.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Saved rolls (issue #2) — the owner-decided "no dice roller" answer: pin a
 * name to a number the sheet already computes (a full attack, a save, a
 * skill) so it's one glance away during play instead of scrolling the whole
 * character sheet. Every row re-resolves against the live `DerivedSheet` on
 * every render, so a saved roll never goes stale as buffs/feats/gear change.
 */
export function SavedRollsPanel({ doc, sheet, update }: BuilderProps) {
  const [query, setQuery] = useState("");

  const saved = doc.build.savedRolls ?? [];
  const resolved = useMemo(
    () => saved.map((r) => resolveSavedRoll(r, sheet)),
    [saved, sheet],
  );

  const options = useMemo(() => availableSavedRollSources(sheet), [sheet]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !q || o.label.toLowerCase().includes(q)).slice(0, 60);
  }, [options, query]);

  return (
    <Panel title="Saved Rolls" step="sr" storageKey="panel:SavedRolls">
      {resolved.length === 0 ? (
        <div className="empty">No saved rolls yet — pin one below.</div>
      ) : (
        <div className="res-list">
          {resolved.map((r) => (
            <SavedRollRow
              key={r.id}
              label={r.label}
              display={r.display}
              components={r.components}
              missing={r.missing}
              onRename={(label) => update((d) => renameSavedRoll(d, r.id, label))}
              onRemove={() => update((d) => removeSavedRoll(d, r.id))}
            />
          ))}
        </div>
      )}

      <h4 className="tracker-sub">Add a saved roll</h4>
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
 * One saved roll: a name/value/remove line, with its full `Provenance`
 * breakdown (same reveal the Sheet's stat seals use) expanding below the
 * line — full row width — rather than the Sheet's boxy seal chrome.
 */
function SavedRollRow({
  label,
  display,
  components,
  missing,
  onRename,
  onRemove,
}: {
  label: string;
  display: string;
  components: ModifierComponent[];
  missing: boolean;
  onRename: (label: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const expandable = components.length > 0;

  return (
    <div className="res-row saved-roll-row">
      <div className="saved-roll-row-line">
        <div className="res-main">
          <RenameField value={label} onCommit={onRename} />
          {missing ? <div className="res-sub">source no longer available</div> : null}
        </div>
        <button
          type="button"
          className="res-count saved-roll-value-btn"
          disabled={!expandable}
          aria-expanded={expandable ? open : undefined}
          aria-controls={expandable ? panelId : undefined}
          onClick={() => setOpen((o) => !o)}
        >
          {expandable ? <span className="caret">{open ? "▲" : "▼"}</span> : null}
          {display}
        </button>
        <div className="res-btns">
          <button type="button" className="btn-ghost" onClick={onRemove} aria-label={`remove ${label}`}>
            ✕
          </button>
        </div>
      </div>
      {expandable && open ? (
        <div id={panelId}>
          <Provenance title={`${label} breakdown`} components={components} />
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
