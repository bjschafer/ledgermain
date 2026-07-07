import { useMemo, useState } from "react";

import type { Feat } from "@pf1/schema";

import { featDisplayName, grantedFeats } from "../../model/feats.js";
import { Panel } from "../builder/Panel.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Collapsible HTML description + prereq text, same visual pattern as
 * `SpellDetail`/`ClassFeaturesList`'s "prose reveal" (reuses its CSS classes).
 */
function FeatDetail({ feat }: { feat: Feat }) {
  const prereqText = feat.prerequisites.prereqText;
  if (!feat.description && !prereqText) return null;
  return (
    <details className="spell-detail">
      <summary className="spell-detail-summary">details</summary>
      <div className="spell-detail-body">
        {prereqText && (
          <div className="spell-detail-row">
            <span className="spell-detail-label">Prereqs</span>
            <span className="spell-detail-value">{prereqText}</span>
          </div>
        )}
        {feat.description && (
          <div
            className="spell-detail-desc"
            // Feat descriptions come from the vendored Foundry PF1 data (open
            // game content) and contain only formatting tags (<p>, <i>,
            // <strong>) — no user input. Same posture as SpellDetail.
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: feat.description }}
          />
        )}
      </div>
    </details>
  );
}

/**
 * Feats-on-the-play-tab (issue #12): a read-only reference list of every feat
 * the character has — manually chosen (`build.feats`) plus class-granted
 * (Scribe Scroll, Eschew Materials, ...) — for "do you have Combat Casting"
 * lookups at the table. No add/remove/prereq-checking here; that's the
 * builder's `FeatsSection` job. Collapsed by default and placed at the
 * bottom of the Play tab per the issue's request.
 */
export function FeatsPanel({ doc, refData }: BuilderProps) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const ids = new Set(doc.build.feats);
    for (const g of grantedFeats(doc, refData)) ids.add(g.featId);
    const feats: Feat[] = [];
    for (const id of ids) {
      const feat = refData.feats[id];
      if (feat) feats.push(feat);
    }
    return feats.sort((a, b) => a.name.localeCompare(b.name));
  }, [doc, refData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((f) => f.name.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  return (
    <Panel title="Feats" step="ft" storageKey="panel:PlayFeats" defaultCollapsed>
      {rows.length === 0 ? (
        <div className="empty">No feats yet.</div>
      ) : (
        <>
          <input
            className="search"
            type="text"
            placeholder="Search your feats…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {filtered.map((feat) => (
              <div key={feat.id} className="pick-row">
                <div className="pmain">
                  <div className="pname">
                    {featDisplayName(feat, doc, refData)}
                    {feat.tags.length > 0 && (
                      <span className="hint" style={{ marginLeft: 8 }}>
                        {feat.tags.join(", ")}
                      </span>
                    )}
                  </div>
                  <FeatDetail feat={feat} />
                </div>
              </div>
            ))}
            {filtered.length === 0 ? <div className="empty">No matches.</div> : null}
          </div>
        </>
      )}
    </Panel>
  );
}
