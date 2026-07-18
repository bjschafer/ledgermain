import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { RefData } from "@pf1/schema";

import { schoolLabel } from "../../model/spellcasting.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import type { SpellEntry, SpellFilter } from "../../model/spellSearch.js";
import {
  EMPTY_SPELL_FILTER,
  filterSpells,
  groupSpellsByLevel,
  isFilterActive,
  levelsOf,
  schoolsOf,
} from "../../model/spellSearch.js";
import { Dialog } from "../Dialog.js";
import { SpellDetail } from "../SpellDetail.js";

const levelName = (level: number) => (level === 0 ? "Cantrips" : `Level ${level}`);

/**
 * The full-screen spellbook editor. The builder panel is sized to *display* a
 * known list; picking from a class list of several hundred spells is a
 * different job, and it gets the whole viewport: filters across the top, the
 * class list on the left, and your known list on the right so an add lands
 * somewhere visible without scrolling the source list away.
 *
 * `onToggle` is undefined for a caster that prepares from the whole class list
 * (cleric, druid): there's nothing to add or remove, so the known pane is
 * dropped and the browse pane takes the full width as a reference view.
 */
export function SpellManager({
  casterTag,
  casterName,
  knownLabel,
  entries,
  known,
  onToggle,
  knownLimits,
  knownCountByLevel,
  isSpontaneous,
  refData,
  abilityMod,
  casterLevel,
  onClose,
}: {
  casterTag: string;
  casterName: string;
  knownLabel: string;
  /** The full class spell list (cantrips excluded when the class grants them all). */
  entries: SpellEntry[];
  known: Set<string>;
  /** Omit for a prepares-from-class-list caster — makes this a read-only browser. */
  onToggle?: (id: string) => void;
  knownLimits: Map<number, number>;
  knownCountByLevel: Map<number, number>;
  isSpontaneous: boolean;
  refData: RefData;
  abilityMod: number;
  casterLevel: number;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<SpellFilter>(EMPTY_SPELL_FILTER);
  const editable = onToggle !== undefined;

  const schools = useMemo(() => schoolsOf(entries, schoolLabel), [entries]);
  const levels = useMemo(() => levelsOf(entries), [entries]);

  const matches = useMemo(() => filterSpells(entries, filter), [entries, filter]);
  const browseGroups = useMemo(() => groupSpellsByLevel(matches), [matches]);

  const knownGroups = useMemo(
    () => groupSpellsByLevel(entries.filter((e) => known.has(e.id))),
    [entries, known],
  );

  const filtered = isFilterActive(filter);
  const set = (patch: Partial<SpellFilter>) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <Dialog
      title={`${casterName} ${knownLabel.toLowerCase()}`}
      subtitle={
        editable
          ? `${known.size} known · ${entries.length} on the ${casterTag} list`
          : `${entries.length} spells on the ${casterTag} list`
      }
      onClose={onClose}
      right={<span className="dialog-esc-hint">esc to close</span>}
    >
      <div className="spell-manager">
        <div className="spell-manager-filters">
          <input
            className="search"
            type="text"
            placeholder={`Search the ${casterTag} spell list…`}
            value={filter.query}
            onChange={(e) => set({ query: e.target.value })}
            aria-label="Search spells"
            autoFocus
          />
          <select
            className="spell-facet"
            value={filter.school ?? ""}
            onChange={(e) => set({ school: e.target.value || null })}
            aria-label="Filter by school"
          >
            <option value="">All schools</option>
            {schools.map((s) => (
              <option key={s} value={s}>
                {schoolLabel(s)}
              </option>
            ))}
          </select>
          <select
            className="spell-facet"
            value={filter.level ?? ""}
            onChange={(e) => set({ level: e.target.value === "" ? null : Number(e.target.value) })}
            aria-label="Filter by spell level"
          >
            <option value="">All levels</option>
            {levels.map((l) => (
              <option key={l} value={l}>
                {levelName(l)}
              </option>
            ))}
          </select>
          {filtered && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setFilter(EMPTY_SPELL_FILTER)}
            >
              clear
            </button>
          )}
        </div>

        <div className={`spell-manager-panes${editable ? "" : " is-single"}`}>
          <section className="spell-pane" aria-label="Spell list">
            <div className="spell-pane-head">
              <span className="spell-pane-title">{filtered ? "Matches" : "Spell list"}</span>
              <span className="spell-pane-count">{matches.length}</span>
            </div>
            <div className="spell-pane-body">
              {browseGroups.length === 0 ? (
                <div className="empty">No spells match.</div>
              ) : (
                browseGroups.map((g) => (
                  <ManagerLevelGroup
                    key={g.level}
                    storageKey={`spell-manager:browse:${casterTag}:${g.level}`}
                    label={levelName(g.level)}
                    count={g.entries.length}
                  >
                    {g.entries.map((sp) => (
                      <SpellRow
                        key={sp.id}
                        spell={sp}
                        refData={refData}
                        abilityMod={abilityMod}
                        casterLevel={casterLevel}
                        isKnown={known.has(sp.id)}
                        onToggle={onToggle}
                        overLimit={
                          isSpontaneous &&
                          !known.has(sp.id) &&
                          (knownCountByLevel.get(sp.level) ?? 0) >=
                            (knownLimits.get(sp.level) ?? Infinity)
                        }
                        limitNote={limitNote(
                          sp.level,
                          knownCountByLevel.get(sp.level) ?? 0,
                          knownLimits.get(sp.level),
                        )}
                      />
                    ))}
                  </ManagerLevelGroup>
                ))
              )}
            </div>
          </section>

          {editable && (
            <section className="spell-pane spell-pane--known" aria-label={knownLabel}>
              <div className="spell-pane-head">
                <span className="spell-pane-title">{knownLabel}</span>
                <span className="spell-pane-count">{known.size}</span>
              </div>
              <div className="spell-pane-body">
                {knownGroups.length === 0 ? (
                  <div className="empty">
                    Nothing here yet — search on the left and add a spell.
                  </div>
                ) : (
                  knownGroups.map((g) => {
                    const limit = knownLimits.get(g.level);
                    const count = knownCountByLevel.get(g.level) ?? g.entries.length;
                    return (
                      <ManagerLevelGroup
                        key={g.level}
                        storageKey={`spell-manager:known:${casterTag}:${g.level}`}
                        label={levelName(g.level)}
                        count={g.entries.length}
                        badge={
                          isSpontaneous && limit !== undefined ? (
                            <span
                              className={`spell-known-count${
                                count > limit ? " is-over" : count >= limit ? " is-full" : ""
                              }`}
                            >
                              {count}/{limit} known
                            </span>
                          ) : null
                        }
                      >
                        {g.entries.map((sp) => (
                          <SpellRow
                            key={sp.id}
                            spell={sp}
                            refData={refData}
                            abilityMod={abilityMod}
                            casterLevel={casterLevel}
                            isKnown
                            onToggle={onToggle}
                          />
                        ))}
                      </ManagerLevelGroup>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </Dialog>
  );
}

/**
 * A collapsible spell level within a manager pane, matching the builder
 * panel's level groups. Collapse is persisted per pane and caster, so the two
 * panes collapse independently — they're different lists.
 *
 * A collapsed group keeps its count in the heading, so a search whose only
 * matches land in a collapsed level still reads as "LEVEL 3 · 1" rather than
 * looking like no results.
 */
function ManagerLevelGroup({
  storageKey,
  label,
  count,
  badge,
  children,
}: {
  storageKey: string;
  label: string;
  count: number;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, toggle] = useCollapsed(storageKey, false);
  return (
    <div className="spell-level-group">
      <div
        className={`spell-level-head is-collapsible${collapsed ? " is-collapsed" : ""}`}
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggle();
        }}
      >
        <span className="spell-level-label">{label}</span>
        {badge}
        <span className="spell-level-count">{count}</span>
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>
      {!collapsed && children}
    </div>
  );
}

function limitNote(level: number, count: number, limit: number | undefined): string | undefined {
  if (limit === undefined || count < limit) return undefined;
  return `You already know ${count}/${limit} level-${level} spells — adding more exceeds your known limit.`;
}

function SpellRow({
  spell,
  refData,
  abilityMod,
  casterLevel,
  isKnown,
  onToggle,
  overLimit = false,
  limitNote,
}: {
  spell: SpellEntry;
  refData: RefData;
  abilityMod: number;
  casterLevel: number;
  isKnown: boolean;
  onToggle?: (id: string) => void;
  overLimit?: boolean;
  limitNote?: string;
}) {
  const data = refData.spells[spell.id];
  return (
    <div className={`pick-row${isKnown ? " is-selected" : ""}`}>
      <div className="pmain">
        <div className="pname">{spell.name}</div>
        {/* School/level and the details toggle share a line — the browse pane
            is a long list, and two stacked 10px mono lines per row cost about
            a fifth of the visible rows. */}
        <div className="spell-row-sub">
          {spell.school && (
            <span className="spell-row-meta">
              {schoolLabel(spell.school)} · {levelName(spell.level).toLowerCase()}
            </span>
          )}
          {data && (
            <SpellDetail
              spell={data}
              spellLevel={spell.level}
              abilityMod={abilityMod}
              casterLevel={casterLevel}
            />
          )}
        </div>
      </div>
      {onToggle && (
        <button
          type="button"
          className={`pick-btn ${isKnown ? "remove" : "add"}`}
          onClick={() => onToggle(spell.id)}
          title={overLimit ? limitNote : undefined}
        >
          {isKnown ? "Remove" : overLimit ? "Add (over limit)" : "Add"}
        </button>
      )}
    </div>
  );
}
