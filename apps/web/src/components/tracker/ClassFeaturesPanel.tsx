import { useMemo, useState } from "react";

import {
  collectPanelEntries,
  filterClassFeatures,
  groupClassFeatures,
} from "../../model/classFeaturesPanel.js";
import { ArchetypeFeatureRow, ClassFeatureRow } from "../builder/ClassFeaturesList.js";
import { Panel } from "../builder/Panel.js";
import type { BuilderProps } from "../builder/types.js";
import { BookIcon } from "../icons.js";

/**
 * Class-features-on-the-play-tab: a read-only reference list of every class
 * feature the character has, grouped by origin rather than by level (see
 * `model/classFeaturesPanel.ts`) so a witch's picked hexes, a barbarian's
 * rage powers, an oracle's revelations,... cluster together instead of being
 * scattered across the build's level order. Same "lookup at the table" posture
 * as `FeatsPanel`: no add/remove/pick UI here, that's the builder's
 * `ClassFeaturesList`/each subsystem's own `*Picker.tsx` — this only reads
 * `DerivedSheet.classFeatures` (base class features, archetype swaps, and
 * every hand-authored sub-choice: domains, hexes, rage powers, arcana,
 * exploits, revelations, discoveries, talents,...) plus each active
 * archetype's own feature list, grouped under the archetype's name — the
 * same entries the builder's timeline interleaves by level. Collapsed by
 * default, sits next to Feats in the Reference group.
 */
export function ClassFeaturesPanel({ sheet, refData }: BuilderProps) {
  const [query, setQuery] = useState("");

  const entries = useMemo(() => collectPanelEntries(sheet), [sheet]);
  const filtered = useMemo(() => filterClassFeatures(entries, query), [entries, query]);
  const groups = useMemo(() => groupClassFeatures(filtered, refData), [filtered, refData]);

  if (entries.length === 0) return null;

  return (
    <Panel
      title="Class Features"
      icon={<BookIcon />}
      storageKey="panel:PlayClassFeatures"
      defaultCollapsed
    >
      <input
        className="search"
        type="text"
        placeholder="Search your class features…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="scroll cf-panel-scroll">
        {groups.map((group) => (
          <section className="cf-group" key={group.label}>
            <h4 className="cf-group-head">
              <span className="cf-group-name">{group.label}</span>
              <span className="cf-group-count">{group.entries.length}</span>
            </h4>
            {group.entries.map((entry, i) =>
              entry.kind === "base" ? (
                <ClassFeatureRow
                  key={`${entry.feature.featureId}-${i}`}
                  feature={entry.feature}
                  refData={refData}
                  showOrigin={false}
                  layout="block"
                />
              ) : (
                <ArchetypeFeatureRow
                  key={`${entry.archetypeName}-${entry.feature.name}-${i}`}
                  feature={entry.feature}
                  archetypeName={entry.archetypeName}
                  showOrigin={false}
                  layout="block"
                />
              ),
            )}
          </section>
        ))}
        {groups.length === 0 ? <div className="empty">No matches.</div> : null}
      </div>
    </Panel>
  );
}
