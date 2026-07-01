import { useMemo, useState } from "react";

import { toggleKnownSpell } from "../../model/doc.js";
import {
  accessibleSpellLevels,
  casterModelFor,
  grantedCantrips,
  spellsKnownLimitsByLevel,
} from "../../model/spellcasting.js";
import { classSpellsByLevel, spellLevelMap } from "../../model/preparedSpells.js";
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

  const classLevel = useMemo(
    () => doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 1,
    [doc.identity.classes, casterTag],
  );

  const grantsCantrips = !!model?.grantsAllCantrips;

  // Spell levels actually reachable at the current class level — used to hide
  // the not-yet-accessible tail of the reference lists below (levels 0/1 are
  // always shown once any caster level is reached; e.g. a level-3 cleric has
  // no business browsing level 5+ spells yet).
  const accessibleLevels = useMemo(
    () => (model ? new Set(accessibleSpellLevels(model, classLevel)) : null),
    [model, classLevel],
  );

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

  // Chosen cleric domains (each grants a bonus prepare-slot per accessed spell
  // level; the prepare-from-domain UI lives in the tracker). Listed here
  // read-only so the player knows what's available to prepare in a domain slot.
  const clericDomains = doc.build.clericDomains ?? [];
  const domainEntries = useMemo<SpellEntry[]>(() => {
    if (!clericDomains.length) return [];
    const out: SpellEntry[] = [];
    for (const tag of clericDomains) {
      const list = refData.domainSpellLists[tag];
      if (!list) continue;
      for (const [lvl, ids] of Object.entries(list)) {
        const n = Number(lvl);
        if (grantsCantrips && n === 0) continue;
        if (accessibleLevels && !accessibleLevels.has(n)) continue;
        for (const id of ids) {
          const sp = refData.spells[id];
          if (sp) out.push({ id, name: sp.name, level: n });
        }
      }
    }
    return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [clericDomains, refData, grantsCantrips, accessibleLevels]);

  const preparesFromClassList = !!model?.preparesFromClassList;

  // The whole class list EXCEPT cantrips when this caster grants all of them.
  // For a search-and-add caster (wizard, sorcerer) this is the searchable
  // source list; for a class-list caster (cleric) it's the entire browsable
  // reference list, grouped by level below.
  const entries = useMemo<SpellEntry[]>(() => {
    if (!casterTag) return [];
    const byLevel = classSpellsByLevel(refData, casterTag, { excludeCantrips: grantsCantrips });
    const out: SpellEntry[] = [];
    for (const [lvl, list] of byLevel) {
      for (const sp of list) out.push({ id: sp.id, name: sp.name, level: lvl });
    }
    return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [casterTag, refData, grantsCantrips]);

  // Grouped-by-level view of `entries`, restricted to accessible levels. Only
  // consumed by the read-only class-list reference below (preparesFromClassList) —
  // the search/known-list branch below uses `entries` unfiltered, since
  // planning ahead (spellbook scribing, future levels) is intentional there.
  const entriesByLevel = useMemo(() => {
    const map = new Map<number, SpellEntry[]>();
    for (const e of entries) {
      if (accessibleLevels && !accessibleLevels.has(e.level)) continue;
      (map.get(e.level) ?? map.set(e.level, []).get(e.level)!).push(e);
    }
    return map;
  }, [entries, accessibleLevels]);
  const entriesLevels = useMemo(
    () => [...entriesByLevel.keys()].sort((a, b) => a - b),
    [entriesByLevel],
  );

  const known = useMemo(() => new Set(doc.build.spells.known), [doc.build.spells.known]);

  // Spells-known limits for spontaneous casters (advisory only).
  const knownLimits = useMemo(() => {
    if (!model) return new Map<number, number>();
    const limits = spellsKnownLimitsByLevel(model, classLevel);
    return new Map(limits.map((l) => [l.level, l.limit]));
  }, [model, classLevel]);

  // Count known spells per level (for the advisory).
  const levelMap = useMemo(
    () => (casterTag ? spellLevelMap(refData, casterTag) : new Map<string, number>()),
    [refData, casterTag],
  );
  const knownCountByLevel = useMemo(() => {
    const counts = new Map<number, number>();
    for (const id of known) {
      const lvl = levelMap.get(id);
      if (lvl !== undefined) counts.set(lvl, (counts.get(lvl) ?? 0) + 1);
    }
    return counts;
  }, [known, levelMap]);

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

  // Header badge: "sorcerer · spontaneous (Cha)" etc.
  const headerBadge = model
    ? `${casterTag} · ${model.preparation} (${abilityLabel})`
    : `${casterTag} list`;

  const emptyState = q
    ? "No spells match."
    : `No spells in your ${knownLabel.toLowerCase()} yet — search to add some.`;

  return (
    <Panel
      title={model ? knownLabel : "Spells"}
      step="x"
      storageKey="panel:Spells"
      right={
        <span className="hint">
          {preparesFromClassList
            ? `${headerBadge} · ${entriesLevels.reduce((n, lvl) => n + entriesByLevel.get(lvl)!.length, 0)} accessible on the ${casterTag} list`
            : `${headerBadge} · ${knownCount} in ${knownLabel.toLowerCase()}`}
        </span>
      }
    >
      {/* Guidance hints: collapsible (Task 4). Default collapsed to save space. */}
      {model && (
        <SpellHints
          model={{ blurb: model.blurb, learnGuidance: model.learnGuidance }}
          casterTag={casterTag}
          cantrips={cantrips}
          grantsCantrips={grantsCantrips}
          knownLabel={knownLabel}
          isSpontaneous={model.preparation === "spontaneous"}
          preparesFromClassList={preparesFromClassList}
        />
      )}

      {!preparesFromClassList && (
        <input
          className="search"
          type="text"
          placeholder={`Search the ${casterTag} spell list to add…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}
      <div className="scroll">
        {/* Granted cantrips: read-only, always present, collapsed by default. */}
        {cantrips.length > 0 && <GrantedCantripsBlock cantrips={cantrips} />}

        {/* Domain spells: read-only reference list for the chosen domains. */}
        {domainEntries.length > 0 && (
          <DomainSpellsBlock domains={clericDomains} entries={domainEntries} />
        )}

        {preparesFromClassList ? (
          entriesLevels.length === 0 ? (
            <div className="empty">No spells on the {casterTag} list yet.</div>
          ) : (
            entriesLevels.map((lvl) => (
              <SpellLevelGroup key={lvl} level={lvl} entries={entriesByLevel.get(lvl)!} readOnly />
            ))
          )
        ) : shown.length === 0 ? (
          <div className="empty">{emptyState}</div>
        ) : (
          levels.map((lvl) => (
            <SpellLevelGroup
              key={lvl}
              level={lvl}
              entries={byLevel.get(lvl)!}
              known={known}
              onToggle={(id) => update((d) => toggleKnownSpell(d, id))}
              knownLimit={knownLimits.get(lvl)}
              knownCount={knownCountByLevel.get(lvl) ?? 0}
              isSpontaneous={model?.preparation === "spontaneous"}
            />
          ))
        )}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Collapsible guidance hints (Task 4)
// ---------------------------------------------------------------------------

/**
 * Guidance notes about the spellbook/known list. Collapsed by default to save
 * screen space; the user can expand once and the state persists via localStorage.
 */
function SpellHints({
  model,
  casterTag,
  cantrips,
  grantsCantrips,
  knownLabel,
  isSpontaneous,
  preparesFromClassList,
}: {
  model: { blurb: string; learnGuidance: string };
  casterTag: string;
  cantrips: SpellEntry[];
  grantsCantrips: boolean;
  knownLabel: string;
  isSpontaneous: boolean;
  preparesFromClassList: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="spell-hints-details"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="spell-hints-summary">
        How {casterTag} spellcasting works
        <span className="panel-caret" aria-hidden="true">{open ? " ▾" : " ▸"}</span>
      </summary>
      <div className="spell-hints">
        <p className="hint spell-hint-line">{model.blurb}</p>
        <p className="hint spell-hint-line">{model.learnGuidance}</p>
        {grantsCantrips && (
          <p className="hint spell-hint-line">
            You know <strong>all {cantrips.length} cantrips</strong> on the{" "}
            {casterTag} list — they're listed below and cost no spellbook slot.
          </p>
        )}
        {isSpontaneous ? (
          <p className="hint spell-hint-line">
            This is your <strong>{knownLabel}</strong> — the spells you can cast. Cast
            them on the fly from the tracker's <strong>Spells</strong> panel by spending
            a slot of the appropriate level.
          </p>
        ) : preparesFromClassList ? (
          <p className="hint spell-hint-line">
            Nothing to add or remove here — browse the full list below, then
            prepare from it each day in the tracker's{" "}
            <strong>Prepared Spells</strong> panel.
          </p>
        ) : (
          <p className="hint spell-hint-line">
            This is your {knownLabel.toLowerCase()} — the spells you <em>could</em>{" "}
            prepare. Prepare and cast for the day from the tracker's{" "}
            <strong>Prepared Spells</strong> panel.
          </p>
        )}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Spell level group
// ---------------------------------------------------------------------------

/**
 * A collapsible group of spells at one spell level. For spontaneous casters,
 * shows a known-limit advisory when the count approaches or exceeds the cap.
 */
function SpellLevelGroup({
  level,
  entries,
  known = EMPTY_KNOWN,
  onToggle,
  knownLimit,
  knownCount = 0,
  isSpontaneous = false,
  readOnly = false,
}: {
  level: number;
  entries: SpellEntry[];
  known?: Set<string>;
  onToggle?: (id: string) => void;
  knownLimit?: number;
  knownCount?: number;
  isSpontaneous?: boolean;
  /** No Add/Remove button — used for the browsable full class-list reference. */
  readOnly?: boolean;
}) {
  const [collapsed, toggle] = useCollapsed(`spell-level:${level}`, readOnly);
  const label = level === 0 ? "Cantrips" : `Level ${level}`;

  const isAtLimit = isSpontaneous && knownLimit !== undefined && knownCount >= knownLimit;
  const isOver = isSpontaneous && knownLimit !== undefined && knownCount > knownLimit;

  return (
    <div className="spell-level-group">
      <div
        className={`spell-level-head is-collapsible${collapsed ? " is-collapsed" : ""}${readOnly ? " is-granted" : ""}`}
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggle();
        }}
      >
        <span className="spell-level-label">{label}</span>
        {isSpontaneous && knownLimit !== undefined && (
          <span className={`spell-known-count${isOver ? " is-over" : isAtLimit ? " is-full" : ""}`}>
            {knownCount}/{knownLimit} known
          </span>
        )}
        <span className="spell-level-count">{entries.length}</span>
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>
      {!collapsed &&
        entries.map((sp) => {
          const isKnown = known.has(sp.id);
          const wouldExceed =
            isSpontaneous &&
            knownLimit !== undefined &&
            !isKnown &&
            knownCount >= knownLimit;
          return (
            <div
              key={sp.id}
              className={`pick-row${isKnown ? " is-selected" : ""}${readOnly ? " is-granted" : ""}`}
            >
              <div className="pmain">
                <div className="pname">{sp.name}</div>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className={`pick-btn ${isKnown ? "remove" : "add"}`}
                  onClick={() => onToggle?.(sp.id)}
                  title={
                    wouldExceed
                      ? `You already know ${knownCount}/${knownLimit} level-${level} spells — adding more exceeds your known limit.`
                      : undefined
                  }
                >
                  {isKnown ? "Remove" : wouldExceed ? "Add (over limit)" : "Add"}
                </button>
              )}
            </div>
          );
        })}
    </div>
  );
}

const EMPTY_KNOWN: Set<string> = new Set();

/**
 * The read-only granted-cantrips block: listed for reference, not selectable.
 * Collapsed by default since you rarely need to interact with the list.
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

/**
 * Read-only domain-spell listing for the cleric's chosen domains. Groups spells
 * by spell level so the player can see what's prepared into each level's bonus
 * domain slot. Click-through preparation lives in the tracker's Prepared
 * Spells panel — this block only shows what's available to prepare.
 */
function DomainSpellsBlock({
  domains,
  entries,
}: {
  domains: string[];
  entries: SpellEntry[];
}) {
  const [collapsed, toggle] = useCollapsed(
    `domain-spells:${domains.sort().join(",")}`,
    true,
  );
  const byLevel = new Map<number, SpellEntry[]>();
  for (const e of entries) {
    (byLevel.get(e.level) ?? byLevel.set(e.level, []).get(e.level)!).push(e);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="spell-level-group is-granted is-domain">
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
        <span className="spell-level-label">Domain Spells ({domains.join(", ")})</span>
        <span className="spell-level-count">{entries.length}</span>
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>
      {!collapsed &&
        levels.map((lvl) => (
          <div key={lvl} className="spell-domain-level">
            <div className="spell-domain-level-head">Level {lvl}</div>
            {byLevel.get(lvl)!.map((sp) => (
              <div key={`${lvl}-${sp.id}`} className="pick-row is-granted">
                <div className="pmain">
                  <div className="pname">{sp.name}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
