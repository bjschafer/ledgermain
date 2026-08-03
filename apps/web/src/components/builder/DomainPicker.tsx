import { useMemo, useState } from "react";

import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  domainSlotCount,
  parentDomainTagOf,
  setClericDomains,
  setInquisition,
} from "../../model/doc.js";
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
 * Domain selection for the two classes that get one: clerics (two domains) and
 * inquisitors (one). Free-choice: the vendored data has no deity→domain
 * mapping, so validation is "soft warning only" per the project's
 * hybrid-prereqs philosophy. Domain tags come from `refData.domainSpellLists`.
 *
 * A CLERIC's domains each grant one bonus prepared slot per accessible spell
 * level (1–9); the tracker's Spells panel renders those slots and
 * lets the cleric prepare a domain spell into them. This picker only sets the
 * choice — the slot capacity + prepare-from-domain UI live in the tracker.
 * An INQUISITOR gets the granted powers only and no bonus slots at all, which
 * is why `SpellsSection`'s domain-slot wiring stays cleric-gated — don't
 * "fix" that gate to match this picker.
 *
 * Either slot may swap its domain for one of that domain's subdomains
 * (`refData.subdomains`), entirely replacing the domain choice for that slot —
 * `doc.build.clericDomains` stores the subdomain's own tag once swapped, and
 * the top grid keeps highlighting the parent domain so the slot stays visible.
 *
 * An inquisitor (the ONLY class `domainSlotCount` gives a single slot to — a
 * cleric/inquisitor multiclass collapses onto the cleric's two-domain pool
 * instead, see that function's doc comment) may take an INQUISITION in place
 * of that one domain: a parallel, unrelated pick-list with its own granted
 * powers and no domain spell slots at all (`build.inquisition`, never both
 * with `build.clericDomains` — `setInquisition`/`toggleDomain` each clear the
 * other). `mode` is purely a display toggle (which half of the choice this
 * picker currently shows); the persisted choice is whichever of
 * `clericDomains`/`inquisition` is actually set.
 */
export function DomainPicker({ doc, refData, update }: DomainPickerProps) {
  const slots = domainSlotCount(doc);
  const isInquisitorSlot = slots === 1;
  const [mode, setMode] = useState<"domain" | "inquisition">(
    isInquisitorSlot && doc.build.inquisition ? "inquisition" : "domain",
  );
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
  const subdomainByTag = useMemo(
    () => new Map(Object.values(refData.subdomains).map((s) => [s.tag, s])),
    [refData],
  );
  const subdomainsByParent = useMemo(() => {
    const map = new Map<string, { tag: string; name: string }[]>();
    for (const sub of Object.values(refData.subdomains)) {
      for (const parentTag of sub.parentDomainTags) {
        const list = map.get(parentTag) ?? [];
        list.push({ tag: sub.tag, name: sub.name });
        map.set(parentTag, list);
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.tag.localeCompare(b.tag));
    return map;
  }, [refData]);

  const inquisitions = useMemo(
    () => Object.values(refData.inquisitions).sort((a, b) => a.name.localeCompare(b.name)),
    [refData],
  );

  const chosen = doc.build.clericDomains ?? [];
  const chosenInquisition = inquisitions.find((i) => i.tag === doc.build.inquisition);

  if (slots === 0) return null;

  const parentTagOf = (tag: string): string => parentDomainTagOf(refData, tag);

  const q = query.trim().toLowerCase();
  const shown = q ? domains.filter((d) => d.toLowerCase().includes(q)).slice(0, 100) : domains;
  const shownInquisitions = q
    ? inquisitions.filter((i) => i.name.toLowerCase().includes(q))
    : inquisitions;

  function toggleDomain(tag: string) {
    const slotIndex = chosen.findIndex((c) => parentTagOf(c) === tag);
    if (slotIndex >= 0) {
      const next = [...chosen];
      next.splice(slotIndex, 1);
      update((d) => setClericDomains(d, next));
      return;
    }
    if (chosen.length >= slots) return; // silently no-op past the class's allowance
    update((d) => setClericDomains(d, [...chosen, tag]));
  }

  function setSlot(index: number, value: string) {
    const next = [...chosen];
    next[index] = value;
    update((d) => setClericDomains(d, next));
  }

  function chooseMode(next: "domain" | "inquisition") {
    setMode(next);
    setQuery("");
    if (next === "domain") {
      update((d) => setInquisition(d, null));
    } else {
      update((d) => setClericDomains(d, []));
    }
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
          {chosenInquisition ? <span className="hint"> · {chosenInquisition.name}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          {isInquisitorSlot && (
            <div
              className="chips domain-mode-toggle"
              role="group"
              aria-label="Domain or inquisition"
            >
              <button
                type="button"
                className="chip"
                aria-pressed={mode === "domain"}
                onClick={() => chooseMode("domain")}
              >
                Domain
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={mode === "inquisition"}
                onClick={() => chooseMode("inquisition")}
              >
                Inquisition
              </button>
            </div>
          )}
          {mode === "inquisition" ? (
            <>
              <p className="hint domain-picker-hint">
                Pick one inquisition (an inquisitor's alternative to a domain: its own granted
                powers, but no domain spell slots at all). Free-choice, no deity validation.
              </p>
              <input
                className="search"
                type="text"
                placeholder={`Search ${inquisitions.length} inquisitions…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="chips domain-chips">
                {shownInquisitions.map((i) => (
                  <button
                    key={i.tag}
                    type="button"
                    className="chip"
                    aria-pressed={doc.build.inquisition === i.tag}
                    onClick={() => update((d) => setInquisition(d, i.tag))}
                  >
                    {i.name}
                  </button>
                ))}
              </div>
              {chosenInquisition?.description && (
                <div className="domain-description">
                  <FeatureDescription html={chosenInquisition.description} />
                </div>
              )}
            </>
          ) : (
            <>
              <p className="hint domain-picker-hint">
                {slots === 1
                  ? "Pick one domain (an inquisitor gets one at level 1). You gain its granted powers, but not its spells."
                  : "Pick two domains (PF1 grants two at level 1). Each grants one bonus prepare-slot per accessible spell level, drawable from that domain's spell list."}{" "}
                Free-choice, no deity validation. A domain with subdomains may swap in one of them
                below, entirely replacing that domain choice.
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
                    aria-pressed={chosen.some((c) => parentTagOf(c) === tag)}
                    onClick={() => toggleDomain(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {chosen.map((tag, index) => {
                const domainTag = parentTagOf(tag);
                const domain = domainByTag.get(domainTag);
                const subdomain = subdomainByTag.get(tag);
                const options = subdomainsByParent.get(domainTag) ?? [];
                const entity = subdomain ?? domain;
                return (
                  <div className="domain-description" key={`${domainTag}-${index}`}>
                    <div className="domain-slot-header">
                      <span className="hint">{domain?.name ?? domainTag}</span>
                      {options.length > 0 && (
                        <select
                          className="subdomain-select"
                          value={subdomain ? subdomain.tag : ""}
                          onChange={(e) => setSlot(index, e.target.value || domainTag)}
                        >
                          <option value="">Standard domain</option>
                          {options.map((o) => (
                            <option key={o.tag} value={o.tag}>
                              {o.tag} (subdomain)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {entity?.description && <FeatureDescription html={entity.description} />}
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
    </div>
  );
}
