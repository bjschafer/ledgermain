import { useMemo, useState } from "react";

import type { AbilityId } from "@pf1/schema";

import { casterLevel } from "../../model/casterLevel.js";
import { toggleFeat } from "../../model/doc.js";
import { ABILITY_IDS } from "../../model/doc.js";
import { evaluatePrereqs, type PrereqContext } from "../../model/prereqs.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function FeatsSection({ doc, sheet, refData, update }: BuilderProps) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(doc.build.feats), [doc.build.feats]);

  const ctx: PrereqContext = useMemo(() => {
    const abilityTotals = {} as Record<AbilityId, number>;
    for (const id of ABILITY_IDS) abilityTotals[id] = sheet.abilities[id].total;
    return {
      abilityTotals,
      bab: sheet.bab,
      casterLevel: casterLevel(doc),
      selectedFeats: selected,
      refData,
    };
  }, [sheet, doc, selected, refData]);

  const feats = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(refData.feats)
      .filter((f) => !q || f.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [refData.feats, query, selected]);

  return (
    <Panel
      title="Feats"
      step="vi"
      right={<span className="hint">{selected.size} selected</span>}
    >
      <input
        className="search"
        type="text"
        placeholder="Search feats…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="scroll">
        {feats.slice(0, 150).map((feat) => {
          const isSel = selected.has(feat.id);
          const res = evaluatePrereqs(feat, ctx);
          const blocked = res.blocked && !isSel;
          return (
            <div
              key={feat.id}
              className={`pick-row${isSel ? " is-selected" : ""}${blocked ? " is-blocked" : ""}`}
            >
              <div className="pmain">
                <div className="pname">{feat.name}</div>
                {(res.checks.length > 0 || res.softText) && (
                  <div className="preq">
                    {res.checks.map((c, i) => (
                      <span key={i} className={c.met ? "ck-met" : "ck-unmet"}>
                        {c.met ? "✓" : "✗"} {c.label}
                      </span>
                    ))}
                    {res.softText ? (
                      <span className="soft" title="Prerequisite text — verify manually (not auto-enforced)">
                        ⚠ {res.softText}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={`pick-btn ${isSel ? "remove" : "add"}`}
                disabled={blocked}
                title={blocked ? "Prerequisites not met" : undefined}
                onClick={() => update((d) => toggleFeat(d, feat.id))}
              >
                {isSel ? "Remove" : blocked ? "Locked" : "Add"}
              </button>
            </div>
          );
        })}
        {feats.length > 150 ? (
          <div className="empty">Showing first 150 — refine your search.</div>
        ) : null}
      </div>
    </Panel>
  );
}
