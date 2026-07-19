import { useMemo, useState } from "react";

import type { CharacterDoc, RefData } from "@pf1/schema";

import { setClericDomains } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { FeatureDescription } from "./ClassFeaturesList.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface DomainPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Cleric domain selection (PF1 grants two). Free-choice: the vendored data has
 * no deity→domain mapping, so validation is "soft warning only" per the project's
 * hybrid-prereqs philosophy. Domain tags come from `refData.domainSpellLists`.
 *
 * The chosen domains each grant one bonus prepared slot per accessible spell
 * level (1–9); the tracker's Spells panel renders those slots and
 * lets the cleric prepare a domain spell into them. This picker only sets the
 * choice — the slot capacity + prepare-from-domain UI live in the tracker.
 */
export function DomainPicker({ doc, refData, update }: DomainPickerProps) {
  const isCleric = doc.identity.classes.some((c) => c.tag === "cleric");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Domains", false);

  const domains = useMemo(
    () =>
      Object.keys(refData.domainSpellLists)
        .filter((t) => t.length > 0)
        .sort((a, b) => a.localeCompare(b)),
    [refData],
  );

  const domainByTag = useMemo(
    () => new Map(Object.values(refData.domains).map((d) => [d.tag, d])),
    [refData],
  );

  const chosen = doc.build.clericDomains ?? [];

  if (!isCleric) return null;

  const q = query.trim().toLowerCase();
  const shown = q ? domains.filter((d) => d.toLowerCase().includes(q)).slice(0, 100) : domains;

  function toggle(tag: string) {
    const set = new Set(chosen);
    if (set.has(tag)) set.delete(tag);
    else if (set.size < 2) set.add(tag);
    // PF1 grants two — silently no-op beyond 2 (the toggle above already
    // guards it; this belt-and-braces keeps the data layer honest).
    update((d) => setClericDomains(d, [...set]));
  }

  return (
    <div className="subsection domain-picker">
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
          Domains
          {chosen.length > 0 ? <span className="hint"> · {chosen.join(", ")}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint domain-picker-hint">
            Pick two domains (PF1 grants two at level 1). Each grants one bonus prepare-slot per
            accessible spell level, drawable from that domain's spell list. Free-choice — no deity
            validation.
          </p>
          <input
            className="search"
            type="text"
            placeholder={`Search ${domains.length} domains…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="chips domain-chips">
            {shown.map((tag) => (
              <button
                key={tag}
                type="button"
                className="chip"
                aria-pressed={chosen.includes(tag)}
                onClick={() => toggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
          {chosen.length > 0 && (
            <p className="hint domain-chosen">
              <span>Chosen: </span>
              <strong>{chosen.join(", ")}</strong>
            </p>
          )}
          {chosen.map((tag) => {
            const domain = domainByTag.get(tag);
            if (!domain?.description) return null;
            return (
              <div className="domain-description" key={tag}>
                <span className="hint">{domain.name}</span>
                <FeatureDescription html={domain.description} />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
