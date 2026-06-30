import { useMemo, useState } from "react";

import { toggleKnownSpell } from "../../model/doc.js";
import { casterModelFor } from "../../model/spellcasting.js";
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

  const entries = useMemo<SpellEntry[]>(() => {
    if (!casterTag) return [];
    const list = refData.spellLists[casterTag] ?? {};
    const out: SpellEntry[] = [];
    for (const [lvl, ids] of Object.entries(list)) {
      for (const id of ids) {
        const sp = refData.spells[id];
        if (sp) out.push({ id, name: sp.name, level: Number(lvl) });
      }
    }
    return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [casterTag, refData]);

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
        {shown.length === 0 ? (
          <div className="empty">{emptyState}</div>
        ) : (
          levels.map((lvl) => {
            const levelLabel = lvl === 0 ? "Cantrips" : `Level ${lvl}`;

            return (
              <div key={lvl}>
                <div className="spell-level-head">{levelLabel}</div>
                {byLevel.get(lvl)!.map((sp) => {
                  const isKnown = known.has(sp.id);
                  return (
                    <div key={sp.id} className={`pick-row${isKnown ? " is-selected" : ""}`}>
                      <div className="pmain">
                        <div className="pname">{sp.name}</div>
                      </div>
                      <button
                        type="button"
                        className={`pick-btn ${isKnown ? "remove" : "add"}`}
                        onClick={() => update((d) => toggleKnownSpell(d, sp.id))}
                      >
                        {isKnown ? "Remove" : "Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
}
