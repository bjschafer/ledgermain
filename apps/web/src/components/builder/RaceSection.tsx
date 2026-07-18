import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { raceGrantsFlexibleAbility } from "@pf1/engine";
import { ABILITY_IDS } from "@pf1/schema";

import { setBonusLanguages, setFlexibleAbility, setRace } from "../../model/doc.js";
import {
  languageLabel,
  racialLanguages,
  suggestedBonusLanguageCount,
} from "../../model/languages.js";
import { ABILITY_ABBR } from "../../model/names.js";
import {
  availableRacialTraits,
  conflictingRacialTraitIds,
  hasRacialTrait,
  toggleRacialTrait,
} from "../../model/racialTraits.js";
import { groupRacesByRarity, type Rarity } from "../../model/rarity.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import { HomebrewRaceEditor } from "./HomebrewRaceEditor.js";
import { Panel } from "./Panel.js";
import { SearchMiss } from "./SearchMiss.js";
import type { BuilderProps } from "./types.js";

/**
 * One collapsible rarity tier in the race picker. Rendered per group (a stable
 * set of four), so `useCollapsed` inside a list is fine. Exotic defaults
 * collapsed to declutter the picker; an active search force-opens every tier
 * (via `forceOpen`) so a collapsed section never hides a match.
 */
function RaceGroupSection({
  category,
  label,
  count,
  forceOpen,
  children,
}: {
  category: Rarity;
  label: string;
  count: number;
  forceOpen: boolean;
  children: ReactNode;
}) {
  const [collapsed, toggle] = useCollapsed(`race-rarity:${category}`, category === "exotic");
  const open = forceOpen || !collapsed;
  return (
    <div className="race-group">
      <div
        className="race-group-header"
        onClick={forceOpen ? undefined : toggle}
        role="button"
        tabIndex={forceOpen ? -1 : 0}
        aria-expanded={open}
        onKeyDown={(e) => {
          if (!forceOpen && (e.key === "Enter" || e.key === " ")) toggle();
        }}
      >
        <span className="section-label">{label}</span>
        <span className="race-group-count">{count}</span>
        {forceOpen ? null : <span className="panel-caret">{open ? "▾" : "▸"}</span>}
      </div>
      {open ? <div className="chips">{children}</div> : null}
    </div>
  );
}

export function RaceSection({ doc, sheet, refData, update }: BuilderProps) {
  const [pendingRaceId, setPendingRaceId] = useState<string | null>(null);
  const [langInput, setLangInput] = useState("");
  const [query, setQuery] = useState("");

  // Alphabetical within each rarity tier; the tier sections (below) carry the
  // top-level ordering, and the selected race stays marked via aria-pressed
  // wherever it lands, so no selected-first sort is needed.
  const raceGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const entries = Object.entries(refData.races)
      .filter(([, race]) => !q || race.name.toLowerCase().includes(q))
      .sort((a, b) => a[1].name.localeCompare(b[1].name));
    return groupRacesByRarity(entries);
  }, [refData, query]);
  const hasMatches = raceGroups.some((g) => g.items.length > 0);
  const searchActive = query.trim().length > 0;
  const selected = refData.races[doc.identity.race];
  const flexible = selected ? raceGrantsFlexibleAbility(selected) : false;
  const racialTraits = availableRacialTraits(doc, refData);
  const racialTraitConflicts = conflictingRacialTraitIds(doc, refData);
  const pendingRace = pendingRaceId != null ? refData.races[pendingRaceId] : undefined;
  const racial = racialLanguages(doc, refData);
  const bonusLanguages = doc.build.bonusLanguages ?? [];
  const suggestedCount = suggestedBonusLanguageCount(doc, sheet.abilities.int.mod);

  function addLanguage() {
    const trimmed = langInput.trim();
    if (!trimmed) return;
    update((d) => setBonusLanguages(d, [...(d.build.bonusLanguages ?? []), trimmed]));
    setLangInput("");
  }

  function removeLanguage(index: number) {
    update((d) =>
      setBonusLanguages(
        d,
        (d.build.bonusLanguages ?? []).filter((_, i) => i !== index),
      ),
    );
  }

  // Shared by the rarity-grouped chip grid AND the homebrew management
  // list's "Select" buttons, so both paths go through the same "switching
  // race resets modifiers" confirmation (below) rather than one silently
  // bypassing it.
  function selectRace(id: string) {
    if (doc.identity.race && doc.identity.race !== id) {
      setPendingRaceId(id);
    } else if (doc.identity.race === id) {
      setPendingRaceId("");
    } else {
      update((d) => setRace(d, id));
    }
  }

  return (
    <Panel title="Race" step="iii" storageKey="panel:Race">
      <input
        className="search"
        type="text"
        placeholder="Search races…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {raceGroups.map((group) => (
        <RaceGroupSection
          key={group.category}
          category={group.category}
          label={group.label}
          count={group.items.length}
          forceOpen={searchActive}
        >
          {group.items.map(([id, race]) => (
            <button
              key={id}
              type="button"
              className="chip"
              aria-pressed={doc.identity.race === id}
              onClick={() => selectRace(id)}
            >
              {race.name}
              <HomebrewBadge id={id} interactive={false} />
            </button>
          ))}
        </RaceGroupSection>
      ))}
      {!hasMatches ? (
        searchActive ? (
          <SearchMiss query={query.trim()} picker="races" />
        ) : (
          <div className="empty">No races match.</div>
        )
      ) : null}
      {pendingRaceId != null && (
        <p className="hint" style={{ marginTop: 12 }}>
          <span className="prep-clear-confirm-label">
            {pendingRaceId
              ? `Switch race to ${pendingRace?.name ?? pendingRaceId}? This resets racial modifiers.`
              : "Clear race? This removes racial modifiers."}
          </span>{" "}
          <button
            type="button"
            className="pick-btn remove"
            onClick={() => {
              update((d) => setRace(d, pendingRaceId));
              setPendingRaceId(null);
            }}
          >
            Confirm
          </button>{" "}
          <button type="button" className="btn-ghost" onClick={() => setPendingRaceId(null)}>
            Cancel
          </button>
        </p>
      )}
      {selected ? (
        <p className="hint" style={{ marginTop: 12 }}>
          {selected.name} <HomebrewBadge id={doc.identity.race} /> · size {selected.size} · speed{" "}
          {selected.speeds.land ?? 30} ft. Racial ability and skill bonuses flow into the sheet
          automatically.
        </p>
      ) : (
        <p className="hint" style={{ marginTop: 12 }}>
          Choose a race to apply its racial modifiers.
        </p>
      )}
      {flexible && (
        <div style={{ marginTop: 12 }}>
          <p className="hint">+2 to an ability of your choice</p>
          <div className="chips" style={{ marginTop: 6 }}>
            {ABILITY_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className="chip"
                aria-pressed={doc.identity.flexibleAbility === id}
                onClick={() =>
                  update((d) =>
                    setFlexibleAbility(d, doc.identity.flexibleAbility === id ? null : id),
                  )
                }
              >
                {ABILITY_ABBR[id]}
              </button>
            ))}
          </div>
        </div>
      )}
      {racialTraits.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p className="hint">
            Alternate racial traits · swap a standard trait for an alternate
            {racialTraitConflicts.size > 0 ? (
              <span className="soft" style={{ marginLeft: 6 }}>
                ⚠ two traits replace the same standard trait
              </span>
            ) : null}
          </p>
          <div style={{ marginTop: 6 }}>
            {racialTraits.map((tr) => {
              const isSel = hasRacialTrait(doc, tr.id);
              const conflict = isSel && racialTraitConflicts.has(tr.id);
              return (
                <div key={tr.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {tr.name}
                      <span className="tag-bloodline" title={`Replaces ${tr.replaces.join(", ")}`}>
                        replaces {tr.replaces.join(", ")}
                      </span>
                      {conflict ? (
                        <span
                          className="soft"
                          title="Another chosen trait replaces the same standard trait"
                        >
                          ⚠ conflict
                        </span>
                      ) : null}
                    </div>
                    <div className="preq">
                      <span className="desc-text">{tr.summary}</span>
                    </div>
                    {isSel
                      ? tr.contextNotes?.map((note, i) => (
                          <div key={i} className="hint" style={{ marginTop: 2 }}>
                            ⚠ {note.text}
                          </div>
                        ))
                      : null}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleRacialTrait(d, tr.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <p className="hint">Racial languages</p>
        <div className="chips" style={{ marginTop: 6 }}>
          {racial.length > 0 ? (
            racial.map((id) => (
              <span key={id} className="chip display-only">
                {languageLabel(id)}
              </span>
            ))
          ) : (
            <p className="hint">Choose a race to see its languages.</p>
          )}
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <p className="hint">
          Bonus languages
          {suggestedCount > 0
            ? ` · suggested ${suggestedCount} (Int bonus + Linguistics ranks)`
            : ""}
        </p>
        <div className="chips" style={{ marginTop: 6 }}>
          {bonusLanguages.map((lang, i) => (
            <button
              key={`${lang}-${i}`}
              type="button"
              className="chip"
              aria-pressed="true"
              title="Click to remove"
              onClick={() => removeLanguage(i)}
            >
              {lang} ×
            </button>
          ))}
        </div>
        <div className="lang-add-row">
          <input
            type="text"
            placeholder="Add a language…"
            value={langInput}
            onChange={(e) => setLangInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLanguage();
              }
            }}
          />
          <button
            type="button"
            className="btn-ghost"
            disabled={!langInput.trim()}
            onClick={addLanguage}
          >
            + Add
          </button>
        </div>
      </div>
      <HomebrewRaceEditor
        doc={doc}
        sheet={sheet}
        refData={refData}
        update={update}
        selectRace={selectRace}
      />
    </Panel>
  );
}
