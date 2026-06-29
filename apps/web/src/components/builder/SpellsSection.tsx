import { useMemo, useState } from "react";

import { toggleKnownSpell } from "../../model/doc.js";
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
      <Panel title="Spells" step="vii">
        <p className="empty">No spellcasting class selected.</p>
      </Panel>
    );
  }

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

  return (
    <Panel
      title="Spells"
      step="vii"
      right={<span className="hint">{casterTag} list · {known.size} known</span>}
    >
      <input
        className="search"
        type="text"
        placeholder="Search the spell list to add…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="scroll">
        {shown.length === 0 ? (
          <div className="empty">
            {q ? "No spells match." : "No spells known yet — search to add some."}
          </div>
        ) : (
          levels.map((lvl) => (
            <div key={lvl}>
              <div className="spell-level-head">Level {lvl}</div>
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
          ))
        )}
      </div>
    </Panel>
  );
}
