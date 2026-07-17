import { useMemo, useState } from "react";

import type { RefData } from "@pf1/schema";

import { effectiveCasterClassLevel } from "../../model/casterLevel.js";
import { toggleKnownSpell } from "../../model/doc.js";
import {
  accessibleSpellLevels,
  bloodlineSpellsKnown,
  casterClassesOf,
  casterModelFor,
  curseSpellsKnown,
  disciplineSpellsKnown,
  grantedCantrips,
  knownSpellsFor,
  mysterySpellsKnown,
  patronSpellsKnown,
  shamanSpiritSpellsKnown,
  spellsKnownLimitsByLevel,
  spellsPanelVisible,
} from "../../model/spellcasting.js";
import { classSpellsByLevel, spellLevelMap } from "../../model/preparedSpells.js";
import type { SpellEntry } from "../../model/spellSearch.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Explainer } from "../Explainer.js";
import { SpellDetail } from "../SpellDetail.js";
import { Panel } from "./Panel.js";
import { SpellManager } from "./SpellManager.js";
import type { BuilderProps } from "./types.js";

export function SpellsSection({ doc, sheet, refData, update }: BuilderProps) {
  // Searching and adding happens in the full-screen SpellManager, not here:
  // this panel sits in one half of the builder's two-column grid, which is the
  // right size to *read* a known list and the wrong size to pick from several
  // hundred class spells.
  const [managerOpen, setManagerOpen] = useState(false);

  // Every caster class on the document (issue #22 multiclass support). With
  // exactly one, this section behaves exactly as before — no switcher chrome
  // — and with 2+, a class switcher below picks which class's spells the rest
  // of this panel shows.
  const casters = useMemo(() => casterClassesOf(doc, refData), [doc, refData]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const casterTag =
    (selectedTag && casters.some((c) => c.tag === selectedTag) ? selectedTag : casters[0]?.tag) ??
    undefined;

  const model = useMemo(() => (casterTag ? casterModelFor(casterTag) : undefined), [casterTag]);

  // RAW class level — feeds the class-FEATURE bonus-spell-known helpers below
  // (bloodline/mystery/discipline/patron/shaman), which stay pinned to the
  // character's actual class level (issue #66 chunk 2: prestige casting
  // advancement grants table numbers only, never accelerates a class
  // feature — see model/casterLevel.ts's header comment).
  const classLevel = useMemo(
    () => doc.identity.classes.find((c) => c.tag === casterTag)?.level ?? 1,
    [doc.identity.classes, casterTag],
  );

  // Advancement-aware effective class level (issue #66 chunk 2) — feeds the
  // spells-per-day/known TABLE lookups below (accessibleLevels, knownLimits),
  // which a prestige class's casting-advancement slot legitimately bumps.
  const effectiveClassLevel = useMemo(
    () => (casterTag ? effectiveCasterClassLevel(doc, refData, casterTag) : classLevel),
    [doc, refData, casterTag, classLevel],
  );

  const grantsCantrips = !!model?.grantsAllCantrips;

  // Spell levels actually reachable at the current class level — used to hide
  // the not-yet-accessible tail of the reference lists below (levels 0/1 are
  // always shown once any caster level is reached; e.g. a level-3 cleric has
  // no business browsing level 5+ spells yet).
  const accessibleLevels = useMemo(
    () => (model ? new Set(accessibleSpellLevels(model, effectiveClassLevel)) : null),
    [model, effectiveClassLevel],
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
  const clericDomains = useMemo(() => doc.build.clericDomains ?? [], [doc]);
  const domainEntries = useMemo<SpellEntry[]>(() => {
    if (!clericDomains.length || casterTag !== "cleric") return [];
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
  }, [clericDomains, refData, grantsCantrips, accessibleLevels, casterTag]);

  // Bloodline bonus spells known (sorcerer only): auto-granted, read-only, and
  // exempt from the spells-known cap — listed here for reference alongside the
  // domain spells block above. See model/spellcasting.bloodlineSpellsKnown.
  const bloodlineEntries = useMemo<SpellEntry[]>(() => {
    if (casterTag !== "sorcerer") return [];
    return bloodlineSpellsKnown(refData, doc.build.sorcererBloodline, classLevel);
  }, [casterTag, refData, doc.build.sorcererBloodline, classLevel]);

  // Oracle mystery + curse bonus spells known: same "auto-granted, read-only,
  // exempt from the cap" treatment as bloodlineEntries above. See
  // model/spellcasting.mysterySpellsKnown / curseSpellsKnown.
  const mysteryEntries = useMemo<SpellEntry[]>(() => {
    if (casterTag !== "oracle") return [];
    return [
      ...mysterySpellsKnown(refData, doc.build.oracleMystery, classLevel),
      ...curseSpellsKnown(refData, doc.build.oracleCurse, classLevel),
    ];
  }, [casterTag, refData, doc.build.oracleMystery, doc.build.oracleCurse, classLevel]);

  // Psychic discipline bonus spells known: same "auto-granted, read-only,
  // exempt from the cap" treatment as bloodlineEntries/mysteryEntries above.
  // See model/spellcasting.disciplineSpellsKnown.
  const disciplineEntries = useMemo<SpellEntry[]>(() => {
    if (casterTag !== "psychic") return [];
    return disciplineSpellsKnown(refData, doc.build.psychicDiscipline, classLevel);
  }, [casterTag, refData, doc.build.psychicDiscipline, classLevel]);

  // Witch patron bonus spells known (added to the familiar's spells): same
  // "auto-granted, read-only, exempt from the cap" treatment as
  // bloodlineEntries/mysteryEntries above. See model/spellcasting.patronSpellsKnown.
  const patronEntries = useMemo<SpellEntry[]>(() => {
    if (casterTag !== "witch") return [];
    return patronSpellsKnown(refData, doc.build.witchPatron, classLevel);
  }, [casterTag, refData, doc.build.witchPatron, classLevel]);
  // Shaman spirit magic bonus spells known: same "auto-granted, read-only,
  // exempt from the cap" treatment as bloodlineEntries/mysteryEntries above.
  // See model/spellcasting.shamanSpiritSpellsKnown.
  const shamanEntries = useMemo<SpellEntry[]>(() => {
    if (casterTag !== "shaman") return [];
    return shamanSpiritSpellsKnown(refData, doc.build.shamanSpirit, classLevel);
  }, [casterTag, refData, doc.build.shamanSpirit, classLevel]);

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
      for (const sp of list) {
        out.push({ id: sp.id, name: sp.name, level: lvl, school: refData.spells[sp.id]?.school });
      }
    }
    return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  }, [casterTag, refData, grantsCantrips]);

  // `entries` restricted to the levels this caster can actually reach. Only
  // consumed by the prepares-from-class-list branch, whose whole class list IS
  // its spell selection; the known-list branch uses `entries` unfiltered, since
  // planning ahead (spellbook scribing, future levels) is intentional there.
  const accessibleEntries = useMemo(
    () => entries.filter((e) => !accessibleLevels || accessibleLevels.has(e.level)),
    [entries, accessibleLevels],
  );

  const known = useMemo(
    () => new Set(casterTag ? knownSpellsFor(doc, refData, casterTag) : []),
    [doc, refData, casterTag],
  );

  // Spells-known limits for spontaneous casters (advisory only).
  const knownLimits = useMemo(() => {
    if (!model) return new Map<number, number>();
    const limits = spellsKnownLimitsByLevel(model, effectiveClassLevel);
    return new Map(limits.map((l) => [l.level, l.limit]));
  }, [model, effectiveClassLevel]);

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

  // A non-caster gets no panel at all rather than an empty one. The stranded
  // -state case (spells present, caster class gone) still renders the message.
  if (!casterTag) {
    if (!spellsPanelVisible(doc, refData)) return null;
    return (
      <Panel title="Spells" step="vii" storageKey="panel:Spells">
        <p className="empty">No spellcasting class selected.</p>
      </Panel>
    );
  }

  const abilityLabel = model ? model.ability.toUpperCase() : "";
  const abilityMod = model ? sheet.abilities[model.ability].mod : 0;

  const knownLabel = model?.knownLabel ?? "Spells Known";
  const knownCount = known.size;

  // Group the known list by spell level for display.
  const byLevel = new Map<number, SpellEntry[]>();
  for (const e of entries) {
    if (!known.has(e.id)) continue;
    const arr = byLevel.get(e.level) ?? [];
    arr.push(e);
    byLevel.set(e.level, arr);
  }
  // Always show a heading for every accessible level — even at 0 known — so you
  // can see at a glance how many spells you still need to add at each level.
  // Cantrips (level 0) live in knownLimits, not accessibleLevels, since they're
  // at-will and never consume a per-day slot; when the class grants them all,
  // level 0 is dropped entirely — `known` can never hold a cantrip, so the
  // heading would be a permanently-empty row next to the granted block.
  const levels = [
    ...new Set([...(accessibleLevels ?? []), ...knownLimits.keys(), ...byLevel.keys()]),
  ]
    .filter((lvl) => !(grantsCantrips && lvl === 0))
    .sort((a, b) => a - b);

  // Header badge: "sorcerer · spontaneous (Cha)" etc.
  const headerBadge = model
    ? `${casterTag} · ${model.preparation} (${abilityLabel})`
    : `${casterTag} list`;

  const casterName = refData.classes[casterTag]?.name ?? casterTag;
  const accessibleCount = accessibleEntries.length;

  return (
    <Panel
      title={model ? knownLabel : "Spells"}
      step="x"
      storageKey="panel:Spells"
      right={
        <span className="hint">
          {preparesFromClassList
            ? `${headerBadge} · ${accessibleCount} accessible on the ${casterTag} list`
            : `${headerBadge} · ${knownCount} known`}
        </span>
      }
    >
      {/* Class switcher: only shown for a multiclass caster (2+ classes with a
          spell list) — a single-caster character never sees this chrome. */}
      {casters.length > 1 && (
        <div className="chips spell-class-switcher" role="tablist" aria-label="Caster class">
          {casters.map((c) => (
            <button
              key={c.tag}
              type="button"
              className="chip"
              role="tab"
              aria-selected={casterTag === c.tag}
              aria-pressed={casterTag === c.tag}
              onClick={() => setSelectedTag(c.tag)}
            >
              {refData.classes[c.tag]?.name ?? c.tag} {c.level}
            </button>
          ))}
        </div>
      )}

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

      <div className="spell-manager-launch">
        <button type="button" className="btn-gold" onClick={() => setManagerOpen(true)}>
          {preparesFromClassList ? `Browse the ${casterName} spell list` : "Edit spellbook"}
        </button>
        <span className="hint">
          {preparesFromClassList
            ? `${accessibleCount} spells you can prepare from`
            : `search and add from ${entries.length} ${casterName} spells`}
        </span>
      </div>

      {managerOpen && (
        <SpellManager
          casterTag={casterTag}
          casterName={casterName}
          knownLabel={knownLabel}
          entries={preparesFromClassList ? accessibleEntries : entries}
          known={known}
          onToggle={
            preparesFromClassList
              ? undefined
              : (id) => update((d) => toggleKnownSpell(d, refData, id, casterTag))
          }
          knownLimits={knownLimits}
          knownCountByLevel={knownCountByLevel}
          isSpontaneous={model?.preparation === "spontaneous"}
          refData={refData}
          abilityMod={abilityMod}
          onClose={() => setManagerOpen(false)}
        />
      )}

      <div className="scroll">
        {/* Granted cantrips: read-only, always present, collapsed by default. */}
        {cantrips.length > 0 && (
          <GrantedCantripsBlock cantrips={cantrips} refData={refData} abilityMod={abilityMod} />
        )}

        {/* Domain spells: read-only reference list for the chosen domains. */}
        {domainEntries.length > 0 && (
          <DomainSpellsBlock
            domains={clericDomains}
            entries={domainEntries}
            refData={refData}
            abilityMod={abilityMod}
          />
        )}

        {/* Bloodline spells: read-only, auto-granted, exempt from the known cap. */}
        {bloodlineEntries.length > 0 && (
          <BloodlineSpellsBlock
            bloodline={doc.build.sorcererBloodline ?? ""}
            entries={bloodlineEntries}
            refData={refData}
            abilityMod={abilityMod}
          />
        )}

        {/* Oracle mystery + curse bonus spells: read-only, auto-granted, exempt from the known cap. */}
        {mysteryEntries.length > 0 && (
          <MysterySpellsBlock entries={mysteryEntries} refData={refData} abilityMod={abilityMod} />
        )}

        {/* Psychic discipline bonus spells: read-only, auto-granted, exempt from the known cap. */}
        {disciplineEntries.length > 0 && (
          <DisciplineSpellsBlock
            entries={disciplineEntries}
            refData={refData}
            abilityMod={abilityMod}
          />
        )}

        {/* Witch patron bonus spells: read-only, auto-granted, exempt from the known cap. */}
        {patronEntries.length > 0 && (
          <PatronSpellsBlock entries={patronEntries} refData={refData} abilityMod={abilityMod} />
        )}

        {/* Shaman spirit magic bonus spells: read-only, auto-granted, exempt from the known cap. */}
        {shamanEntries.length > 0 && (
          <ShamanSpiritSpellsBlock
            entries={shamanEntries}
            refData={refData}
            abilityMod={abilityMod}
          />
        )}

        {/* A prepares-from-class-list caster (cleric, druid) has no known list
            to show here — the whole class list is theirs, and it's browsable in
            the manager rather than inlined into this column. */}
        {preparesFromClassList ? null : levels.length === 0 ? (
          <div className="empty">
            No spells in your {knownLabel.toLowerCase()} yet — “Edit spellbook” to add some.
          </div>
        ) : (
          levels.map((lvl) => (
            <SpellLevelGroup
              key={lvl}
              level={lvl}
              entries={byLevel.get(lvl) ?? []}
              refData={refData}
              abilityMod={abilityMod}
              onRemove={(id) => update((d) => toggleKnownSpell(d, refData, id, casterTag))}
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
  return (
    <Explainer title={`How ${casterTag} spellcasting works`}>
      <p className="hint spell-hint-line">{model.blurb}</p>
      <p className="hint spell-hint-line">{model.learnGuidance}</p>
      {grantsCantrips && (
        <p className="hint spell-hint-line">
          You know <strong>all {cantrips.length} cantrips</strong> on the {casterTag} list — they're
          listed below and cost no spellbook slot.
        </p>
      )}
      {isSpontaneous ? (
        <p className="hint spell-hint-line">
          This is your <strong>{knownLabel}</strong> — the spells you can cast. Cast them on the fly
          from the tracker's <strong>Spells</strong> panel by spending a slot of the appropriate
          level.
        </p>
      ) : preparesFromClassList ? (
        <p className="hint spell-hint-line">
          Nothing to add or remove here — browse the full list below, then prepare from it each day
          in the tracker's <strong>Spells</strong> panel.
        </p>
      ) : (
        <p className="hint spell-hint-line">
          This is your {knownLabel.toLowerCase()} — the spells you <em>could</em> prepare. Prepare
          and cast for the day from the tracker's <strong>Spells</strong> panel.
        </p>
      )}
    </Explainer>
  );
}

// ---------------------------------------------------------------------------
// Spell level group
// ---------------------------------------------------------------------------

/**
 * One spell level of the known list: collapsible, with a Remove button per row
 * and — for spontaneous casters — the known-limit advisory. Adding happens in
 * the SpellManager, so this group only ever renders spells already known; an
 * accessible level with none yet still gets a heading, so the gap is visible.
 */
function SpellLevelGroup({
  level,
  entries,
  refData,
  abilityMod,
  onRemove,
  knownLimit,
  knownCount,
  isSpontaneous,
}: {
  level: number;
  entries: SpellEntry[];
  refData: RefData;
  abilityMod: number;
  onRemove: (id: string) => void;
  knownLimit?: number;
  knownCount: number;
  isSpontaneous: boolean;
}) {
  const [collapsed, toggle] = useCollapsed(`spell-level:${level}`, false);
  const label = level === 0 ? "Cantrips" : `Level ${level}`;

  const showLimit = isSpontaneous && knownLimit !== undefined;
  const isOver = showLimit && knownCount > knownLimit!;
  const isAtLimit = showLimit && knownCount >= knownLimit!;

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
        {showLimit && (
          <span className={`spell-known-count${isOver ? " is-over" : isAtLimit ? " is-full" : ""}`}>
            {knownCount}/{knownLimit} known
          </span>
        )}
        <span className="spell-level-count">{entries.length}</span>
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>
      {!collapsed && entries.length === 0 && (
        <div className="empty spell-level-empty">none yet</div>
      )}
      {!collapsed &&
        entries.map((sp) => {
          const spellData = refData.spells[sp.id];
          return (
            <div key={sp.id} className="pick-row is-selected">
              <div className="pmain">
                <div className="pname">{sp.name}</div>
                {spellData && (
                  <SpellDetail spell={spellData} spellLevel={level} abilityMod={abilityMod} />
                )}
              </div>
              <button type="button" className="pick-btn remove" onClick={() => onRemove(sp.id)}>
                Remove
              </button>
            </div>
          );
        })}
    </div>
  );
}

/**
 * The read-only granted-cantrips block: listed for reference, not selectable.
 * Collapsed by default since you rarely need to interact with the list.
 */
function GrantedCantripsBlock({
  cantrips,
  refData,
  abilityMod,
}: {
  cantrips: SpellEntry[];
  refData: RefData;
  abilityMod: number;
}) {
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
        cantrips.map((sp) => {
          const spellData = refData.spells[sp.id];
          return (
            <div key={sp.id} className="pick-row is-granted">
              <div className="pmain">
                <div className="pname">{sp.name}</div>
                {spellData && (
                  <SpellDetail spell={spellData} spellLevel={0} abilityMod={abilityMod} />
                )}
              </div>
            </div>
          );
        })}
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
  refData,
  abilityMod,
}: {
  domains: string[];
  entries: SpellEntry[];
  refData: RefData;
  abilityMod: number;
}) {
  const [collapsed, toggle] = useCollapsed(`domain-spells:${domains.sort().join(",")}`, true);
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
            {byLevel.get(lvl)!.map((sp) => {
              const spellData = refData.spells[sp.id];
              return (
                <div key={`${lvl}-${sp.id}`} className="pick-row is-granted">
                  <div className="pmain">
                    <div className="pname">{sp.name}</div>
                    {spellData && (
                      <SpellDetail spell={spellData} spellLevel={lvl} abilityMod={abilityMod} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

/**
 * Read-only bloodline-spell listing for the sorcerer's chosen bloodline.
 * Auto-granted at odd sorcerer levels ≥3 (see `bloodlineSpellsKnown`); these
 * are exempt from the spells-known cap since they never touch
 * `doc.build.spells.known` — this block is purely a reference list, badged
 * "bloodline" so the player can tell them apart from chosen known spells.
 */
function BloodlineSpellsBlock({
  bloodline,
  entries,
  refData,
  abilityMod,
}: {
  bloodline: string;
  entries: SpellEntry[];
  refData: RefData;
  abilityMod: number;
}) {
  const [collapsed, toggle] = useCollapsed(`bloodline-spells:${bloodline}`, true);
  const byLevel = new Map<number, SpellEntry[]>();
  for (const e of entries) {
    (byLevel.get(e.level) ?? byLevel.set(e.level, []).get(e.level)!).push(e);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="spell-level-group is-granted is-bloodline">
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
        <span className="spell-level-label">Bloodline Spells ({bloodline})</span>
        <span className="spell-level-count">{entries.length}</span>
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>
      {!collapsed &&
        levels.map((lvl) => (
          <div key={lvl} className="spell-domain-level">
            <div className="spell-domain-level-head">Level {lvl}</div>
            {byLevel.get(lvl)!.map((sp) => {
              const spellData = refData.spells[sp.id];
              return (
                <div key={`${lvl}-${sp.id}`} className="pick-row is-granted">
                  <div className="pmain">
                    <div className="pname">
                      {sp.name} <span className="tag-bloodline">bloodline</span>
                    </div>
                    {spellData && (
                      <SpellDetail spell={spellData} spellLevel={lvl} abilityMod={abilityMod} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

/**
 * Oracle mystery + curse bonus spells known: same "auto-granted, read-only,
 * exempt from the cap" treatment as `BloodlineSpellsBlock` above, just merged
 * across both sources (a mystery always grants some; only the Haunted curse
 * grants any) into one block rather than two near-empty ones.
 */
function MysterySpellsBlock({
  entries,
  refData,
  abilityMod,
}: {
  entries: SpellEntry[];
  refData: RefData;
  abilityMod: number;
}) {
  const [collapsed, toggle] = useCollapsed("mystery-spells", true);
  const byLevel = new Map<number, SpellEntry[]>();
  for (const e of entries) {
    (byLevel.get(e.level) ?? byLevel.set(e.level, []).get(e.level)!).push(e);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="spell-level-group is-granted is-bloodline">
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
        <span className="spell-level-label">Mystery / Curse Bonus Spells</span>
        <span className="spell-level-count">{entries.length}</span>
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>
      {!collapsed &&
        levels.map((lvl) => (
          <div key={lvl} className="spell-domain-level">
            <div className="spell-domain-level-head">Level {lvl}</div>
            {byLevel.get(lvl)!.map((sp) => {
              const spellData = refData.spells[sp.id];
              return (
                <div key={`${lvl}-${sp.id}`} className="pick-row is-granted">
                  <div className="pmain">
                    <div className="pname">
                      {sp.name} <span className="tag-mystery">mystery</span>
                    </div>
                    {spellData && (
                      <SpellDetail spell={spellData} spellLevel={lvl} abilityMod={abilityMod} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

/**
 * Shaman spirit magic bonus spells known: same "auto-granted, read-only,
 * exempt from the cap" treatment as `MysterySpellsBlock` above — one block
 * for the chosen spirit's up-to-9 spirit magic spells (one per spirit-magic
 * spell level, shown once accessible — see `model/spellcasting.
 * shamanSpiritSpellsKnown`). Reuses the mystery block's styling classes; the
 * per-group heading here is the SPELL's own level (unlike
 * `MysterySpellsBlock`'s oracle-level headings), since a
 * `ShamanSpiritMagicSpell.level` already IS the spell's own level.
 */
function ShamanSpiritSpellsBlock({
  entries,
  refData,
  abilityMod,
}: {
  entries: SpellEntry[];
  refData: RefData;
  abilityMod: number;
}) {
  const [collapsed, toggle] = useCollapsed("shaman-spirit-spells", true);
  const byLevel = new Map<number, SpellEntry[]>();
  for (const e of entries) {
    (byLevel.get(e.level) ?? byLevel.set(e.level, []).get(e.level)!).push(e);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="spell-level-group is-granted is-bloodline">
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
        <span className="spell-level-label">Spirit Magic Spells</span>
        <span className="spell-level-count">{entries.length}</span>
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>
      {!collapsed &&
        levels.map((lvl) => (
          <div key={lvl} className="spell-domain-level">
            <div className="spell-domain-level-head">Level {lvl}</div>
            {byLevel.get(lvl)!.map((sp) => {
              const spellData = refData.spells[sp.id];
              return (
                <div key={`${lvl}-${sp.id}`} className="pick-row is-granted">
                  <div className="pmain">
                    <div className="pname">
                      {sp.name} <span className="tag-mystery">spirit magic</span>
                    </div>
                    {spellData && (
                      <SpellDetail spell={spellData} spellLevel={lvl} abilityMod={abilityMod} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

/**
 * Psychic discipline bonus spells known: same "auto-granted, read-only,
 * exempt from the cap" treatment as `MysterySpellsBlock` above — one block
 * for the chosen discipline's 9 bonus spells (unlocked at psychic level 1,
 * 4, 6, ..., 18). Reuses the mystery block's styling classes; the per-group
 * heading shows the PSYCHIC level that unlocked the spell (the `SpellDetail`
 * DC line uses the spell's own level).
 */
function DisciplineSpellsBlock({
  entries,
  refData,
  abilityMod,
}: {
  entries: SpellEntry[];
  refData: RefData;
  abilityMod: number;
}) {
  const [collapsed, toggle] = useCollapsed("discipline-spells", true);
  const byLevel = new Map<number, SpellEntry[]>();
  for (const e of entries) {
    (byLevel.get(e.level) ?? byLevel.set(e.level, []).get(e.level)!).push(e);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="spell-level-group is-granted is-bloodline">
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
        <span className="spell-level-label">Discipline Bonus Spells</span>
        <span className="spell-level-count">{entries.length}</span>
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>
      {!collapsed &&
        levels.map((lvl) => (
          <div key={lvl} className="spell-domain-level">
            <div className="spell-domain-level-head">Psychic Lv {lvl}</div>
            {byLevel.get(lvl)!.map((sp) => {
              const spellData = refData.spells[sp.id];
              return (
                <div key={`${lvl}-${sp.id}`} className="pick-row is-granted">
                  <div className="pmain">
                    <div className="pname">
                      {sp.name} <span className="tag-mystery">discipline</span>
                    </div>
                    {spellData && (
                      <SpellDetail
                        spell={spellData}
                        spellLevel={spellData.level}
                        abilityMod={abilityMod}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

/**
 * Witch patron bonus spells known (added to the familiar's spells): same
 * "auto-granted, read-only, exempt from the cap" treatment as
 * `MysterySpellsBlock` above — one block for the chosen patron's 9 bonus
 * spells (unlocked at witch level 2, 4, 6, ..., 18). Reuses the mystery
 * block's styling classes; the per-group heading shows the WITCH level that
 * unlocked the spell (the `SpellDetail` DC line uses the spell's own level).
 */
function PatronSpellsBlock({
  entries,
  refData,
  abilityMod,
}: {
  entries: SpellEntry[];
  refData: RefData;
  abilityMod: number;
}) {
  const [collapsed, toggle] = useCollapsed("patron-spells", true);
  const byLevel = new Map<number, SpellEntry[]>();
  for (const e of entries) {
    (byLevel.get(e.level) ?? byLevel.set(e.level, []).get(e.level)!).push(e);
  }
  const levels = [...byLevel.keys()].sort((a, b) => a - b);

  return (
    <div className="spell-level-group is-granted is-bloodline">
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
        <span className="spell-level-label">Patron Bonus Spells</span>
        <span className="spell-level-count">{entries.length}</span>
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      </div>
      {!collapsed &&
        levels.map((lvl) => (
          <div key={lvl} className="spell-domain-level">
            <div className="spell-domain-level-head">Witch Lv {lvl}</div>
            {byLevel.get(lvl)!.map((sp) => {
              const spellData = refData.spells[sp.id];
              return (
                <div key={`${lvl}-${sp.id}`} className="pick-row is-granted">
                  <div className="pmain">
                    <div className="pname">
                      {sp.name} <span className="tag-mystery">patron</span>
                    </div>
                    {spellData && (
                      <SpellDetail
                        spell={spellData}
                        spellLevel={spellData.level}
                        abilityMod={abilityMod}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}
