import { useMemo, useState } from "react";

import { toggleKnownSpell } from "../../model/doc.js";
import { casterModelFor, grantedCantrips } from "../../model/spellcasting.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

interface SpellEntry {
  id: string;
  name: string;
  level: number;
}

export function SpellsSection({ doc, refData, update }: BuilderProps) {
  const [query, setQuery] = useState("");

  const casterTag = useMemo(
    () => doc.identity.classes.map((c) => c.tag).find((t) => refData.spellLists[t]),
    [doc.identity.classes, refData.spellLists],
  );

  const model = useMemo(
    () => (casterTag ? casterModelFor(casterTag) : undefined),
    [casterTag],
  );

  const grantsCantrips = !!model?.grantsAllCantrips;

  // Granted cantrips: derived from the class list, never stored in `known`.
  const cantrips = useMemo<SpellEntry[]>(
    () =>
      grantsCantrips && casterTag
        ? grantedCantrips(refData, casterTag).map((c) => ({
            id: c.id,
            name: c.name,
            level: 0,
          }))
        : [],
    [grantsCantrips, casterTag, refData],
  );

  // The searchable spellbook: the whole class list EXCEPT cantrips when this
  // caster grants all of them (cantrips have no Add/Remove — they're free).
  const entries = useMemo<SpellEntry[]>(() => {
    if (!casterTag) return [];
    const list = refData.spellLists[casterTag] ?? {};
    const out: SpellEntry[] = [];
    for (const [lvl, ids] of Object.entries(list)) {
      const n = Number(lvl);
      if (grantsCantrips && n === 0) continue;
      for (const id of ids) {
        const sp = refData.spells[id];
        if (sp) out.push({ id, name: sp.name, level: n });
      }
    }
    return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [casterTag, refData, grantsCantrips]);

  const known = useMemo(() => new Set(doc.build.spells.known), [doc.build.spells.known]);

  if (!casterTag) {
    return (
      <Panel title="Spells" step="vii" storageKey="panel:Spells">
        <p className="empty">No spellcasting class selected.</p>
      </Panel>
    );
  }

  const abilityLabel = model ? model.ability.toUpperCase() : "";

  const knownLabel = model?.knownLabel ?? "Spells Known";
  const knownCount = known.size;

  const q = query.trim().toLowerCase();
  const shown = q
    ? entries.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 200)
    : entries.filter((e) => known.has(e.id));

  // Group by spell level for display.
  const byLevel = new Map<number, SpellEntry[]>();
  for (const e of shown) {
    const arr = byLevel.get(e.level) ?? [];
    arr.push(e);
    byLevel.set(e.level, arr);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  // Header badge: "Wizard · prepared (Int)" or "{casterTag} list"
  const headerBadge = model
    ? `${casterTag} · ${model.preparation} (${abilityLabel})`
    : `${casterTag} list`;

  // Empty-state copy uses the knownLabel so "spellbook" appears where appropriate.
  const emptyState = q
    ? "No spells match."
    : `No spells in your ${knownLabel.toLowerCase()} yet — search to add some.`;

  return (
    <Panel
      title={model ? knownLabel : "Spells"}
      step="vii"
      storageKey="panel:Spells"
      right={
        <span className="hint">
          {headerBadge} · {knownCount} in {knownLabel.toLowerCase()}
        </span>
      }
    >
      {/* Guidance hints: what this list is, plus a pointer to the daily loop. */}
      {model && (
        <div className="spell-hints">
          <p className="hint spell-hint-line">{model.blurb}</p>
          <p className="hint spell-hint-line">{model.learnGuidance}</p>
          {grantsCantrips && (
            <p className="hint spell-hint-line">
              You know <strong>all {cantrips.length} cantrips</strong> on the{" "}
              {casterTag} list — they’re listed below and cost no spellbook slot.
            </p>
          )}
          <p className="hint spell-hint-line">
            This is your {knownLabel.toLowerCase()} — the spells you <em>could</em>{" "}
            prepare. Prepare and cast for the day from the tracker’s{" "}
            <strong>Prepared Spells</strong> panel.
          </p>
        </div>
      )}

      <input
        className="search"
        type="text"
        placeholder={`Search the ${casterTag} spell list to add…`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="scroll">
        {/* Granted cantrips: read-only, always present, collapsed by default. */}
        {cantrips.length > 0 && <GrantedCantripsBlock cantrips={cantrips} />}

        {shown.length === 0 ? (
          <div className="empty">{emptyState}</div>
        ) : (
          levels.map((lvl) => (
            <SpellLevelGroup
              key={lvl}
              level={lvl}
              entries={byLevel.get(lvl)!}
              known={known}
              onToggle={(id) => update((d) => toggleKnownSpell(d, id))}
            />
          ))
        )}
      </div>
    </Panel>
  );
}

/**
 * A collapsible group of spells at one spell level. The header shows the level
 * label and a count; clicking toggles collapse (persisted per level so the view
 * survives reloads). Rows are Add/Remove toggles against `known`.
 */
function SpellLevelGroup({
  level,
  entries,
  known,
  onToggle,
}: {
  level: number;
  entries: SpellEntry[];
  known: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [collapsed, toggle] = useCollapsed(`spell-level:${level}`, false);
  const label = level === 0 ? "Cantrips" : `Level ${level}`;
  return (
    <div className="spell-level-group">
      <div
        className={`spell-level-head is-collapsible${collapsed ? " is-collapsed" : ""}`}
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggle();
        }}
      >
        <span className="spell-level-label">{label}</span>
        <span className="spell-level-count">{entries.length}</span>
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>
      {!collapsed &&
        entries.map((sp) => {
          const isKnown = known.has(sp.id);
          return (
            <div key={sp.id} className={`pick-row${isKnown ? " is-selected" : ""}`}>
              <div className="pmain">
                <div className="pname">{sp.name}</div>
              </div>
              <button
                type="button"
                className={`pick-btn ${isKnown ? "remove" : "add"}`}
                onClick={() => onToggle(sp.id)}
              >
                {isKnown ? "Remove" : "Add"}
              </button>
            </div>
          );
        })}
    </div>
  );
}

/**
 * The read-only granted-cantrips block: listed for reference, not selectable
 * (the caster knows them all for free). Collapsed by default since you rarely
 * need to interact with the list.
 */
function GrantedCantripsBlock({ cantrips }: { cantrips: SpellEntry[] }) {
  const [collapsed, toggle] = useCollapsed("spell-granted-cantrips", true);
  return (
    <div className="spell-level-group is-granted">
      <div
        className="spell-level-head is-collapsible is-granted"
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggle();
        }}
      >
        <span className="spell-level-label">Granted Cantrips</span>
        <span className="spell-level-count">{cantrips.length}</span>
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>
      {!collapsed &&
        cantrips.map((sp) => (
          <div key={sp.id} className="pick-row is-granted">
            <div className="pmain">
              <div className="pname">{sp.name}</div>
            </div>
          </div>
        ))}
    </div>
  );
}
