import { useMemo } from "react";

import type { CharacterDoc, RefData } from "@pf1/schema";

import { setDruidNatureBondDomain } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { FeatureDescription } from "./ClassFeaturesList.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface DruidDomainPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Druid nature-bond domain (PF1 chooses one at L1 as the alternative to an
 * animal companion). Free-choice: the vendored data carries no terrain/deity
 * mapping, so validation is "soft warning only" per the project's
 * hybrid-prereqs philosophy (mirrors `DomainPicker`/`SchoolPicker`).
 *
 * Unlike a cleric's domain, a druid's nature bond grants only the domain's
 * *powers* (scaling off druid level) — no bonus spell slot and no spell list —
 * so this picker just sets the choice and surfaces the domain's prose powers
 * from `DruidDomain.description`; there is nothing to render in the tracker.
 */
export function DruidDomainPicker({ doc, refData, update }: DruidDomainPickerProps) {
  const isDruid = doc.identity.classes.some((c) => c.tag === "druid");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:NatureBondDomain", false);

  const { animal, terrain, byTag } = useMemo(() => {
    const domains = Object.values(refData.druidDomains);
    const byTag = new Map(domains.map((d) => [d.tag, d]));
    const sortByName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
    return {
      animal: domains.filter((d) => d.kind === "animal").sort(sortByName),
      terrain: domains.filter((d) => d.kind === "terrain").sort(sortByName),
      byTag,
    };
  }, [refData]);

  if (!isDruid) return null;

  const chosen = doc.build.druidNatureBondDomain ?? "";
  const domain = chosen ? byTag.get(chosen) : undefined;

  return (
    <div className="subsection druid-domain-picker">
      <div
        className="subsection-header"
        onClick={toggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleCollapsed();
        }}
        aria-expanded={!collapsed}
      >
        <h3>
          Nature Bond
          {domain ? <span className="hint"> · {domain.name}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint druid-domain-picker-hint">
            Pick one nature-bond domain (the alternative to an animal companion). A druid gains only
            the domain's granted powers, scaling off druid level — no domain spell slot and no bonus
            spell list. Free-choice — no terrain validation. Leave unset for a druid who bonds with
            an animal companion instead.
          </p>
          <select
            className="druid-domain-select"
            value={chosen}
            onChange={(e) => {
              const value = e.target.value;
              update((d) => setDruidNatureBondDomain(d, value || null));
            }}
          >
            <option value="">— animal companion (no domain) —</option>
            <optgroup label="Animal Domains">
              {animal.map((d) => (
                <option key={d.tag} value={d.tag}>
                  {d.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Terrain Domains">
              {terrain.map((d) => (
                <option key={d.tag} value={d.tag}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          </select>

          {domain?.description && (
            <div className="domain-description">
              <span className="hint">{domain.name}</span>
              <FeatureDescription html={domain.description} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
