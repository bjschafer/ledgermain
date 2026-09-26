import { useMemo, useState } from "react";

import type { Feat } from "@pf1/schema";

import {
  featContextNotes,
  featInstanceDisplayName,
  featInstances,
  grantedFeats,
} from "../../model/feats.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import { RulesProse } from "../RulesProse.js";
import { StarIcon } from "../icons.js";
import { Panel } from "../builder/Panel.js";
import type { BuilderProps } from "../builder/types.js";

/**
 * Prereqs sit on the row as a quiet line (at the table they're trivia, not
 * something to open a disclosure for); the description is the only thing
 * behind the toggle, set off by a gold rule so it reads as belonging to the
 * feat above it.
 */
function FeatDetail({ feat }: { feat: Feat }) {
  const prereqText = feat.prerequisites.prereqText;
  return (
    <>
      {prereqText && <div className="feat-prereq">Prereqs: {prereqText}</div>}
      {feat.description && (
        <details className="spell-detail feat-detail">
          <summary className="spell-detail-summary">details</summary>
          <RulesProse className="spell-detail-desc" html={feat.description} />
        </details>
      )}
    </>
  );
}

/** One rendered row: a feat plus the (optional) choice of the SPECIFIC instance it represents. */
interface FeatRow {
  key: string;
  feat: Feat;
  choiceId?: string;
}

/**
 * Feats-on-the-play-tab: a read-only reference list of every feat instance the
 * character has — manually chosen (`build.feats` + `build.extraFeats`: a
 * repeatable feat taken more than once lists each instance with its own
 * choice, e.g. "Weapon Focus: Falchion", "Weapon Focus: Longbow") plus
 * class-granted (Scribe Scroll, Eschew Materials,...) — for "do you have
 * Combat Casting" lookups at the table. No add/remove/prereq-checking here;
 * that's the builder's `FeatsSection` job. Collapsed by default and placed at
 * the bottom of the Play tab.
 */
export function FeatsPanel({ doc, refData }: BuilderProps) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const out: FeatRow[] = [];
    for (const inst of featInstances(doc)) {
      const feat = refData.feats[inst.featId];
      if (feat) out.push({ key: inst.instanceId, feat, choiceId: inst.choiceId });
    }
    // Class-granted feats not already present via a manually-added instance
    // (see `grantedFeats`'s "manually-added duplicate" note).
    for (const g of grantedFeats(doc, refData)) {
      if (out.some((r) => r.feat.id === g.featId)) continue;
      const feat = refData.feats[g.featId];
      if (feat) out.push({ key: `granted:${g.featId}`, feat });
    }
    return out.sort((a, b) => a.feat.name.localeCompare(b.feat.name) || a.key.localeCompare(b.key));
  }, [doc, refData]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.feat.name.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  return (
    <Panel
      title="Feats"
      step="ft"
      icon={<StarIcon />}
      storageKey="panel:PlayFeats"
      defaultCollapsed
    >
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
            {filtered.map((row) => (
              <div key={row.key} className="pick-row">
                <div className="pmain">
                  <div className="pname">
                    {featInstanceDisplayName(row.feat, row.choiceId, doc, refData)}
                    <HomebrewBadge id={row.feat.id} />
                    {row.feat.tags.length > 0 && (
                      <span className="hint" style={{ marginLeft: 8 }}>
                        {row.feat.tags.join(", ")}
                      </span>
                    )}
                  </div>
                  {featContextNotes(row.feat.name).map((n, i) => (
                    <div key={i} className="hint" style={{ marginTop: 2 }}>
                      ⚠ {n.text}
                    </div>
                  ))}
                  <FeatDetail feat={row.feat} />
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
