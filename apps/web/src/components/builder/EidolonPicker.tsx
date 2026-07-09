import { useMemo, useState } from "react";

import { EIDOLON_BASE_FORMS, EIDOLON_EVOLUTION_IDS, EIDOLON_EVOLUTIONS } from "@pf1/engine";
import type { AbilityId, CharacterDoc } from "@pf1/schema";

import {
  addEidolonEvolution,
  clearEidolon,
  eidolonEvolutionCount,
  eidolonEvolutionPointsAvailable,
  eidolonEvolutionPointsSpent,
  eidolonEvolutionPoolNeedsWarning,
  eidolonSummonerLevel,
  removeLastEidolonEvolution,
  setEidolon,
  setEidolonEvolutionChoice,
  setEidolonNotes,
} from "../../model/eidolon.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface EidolonPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

const ABILITY_OPTIONS: { id: AbilityId; label: string }[] = [
  { id: "str", label: "Str" },
  { id: "dex", label: "Dex" },
  { id: "con", label: "Con" },
  { id: "int", label: "Int" },
  { id: "wis", label: "Wis" },
  { id: "cha", label: "Cha" },
];

/**
 * Tracked eidolon (PF1 APG Summoner's "Eidolon" class feature) — base form +
 * name + evolution-pool spend, mirroring `PhantomPicker`'s shape for the
 * top-level fields and `ImplementPicker`'s budgeted-list vocabulary
 * (`pick-row`/`pmain`/`pname`/`pick-btn`) for the evolution catalog. Always
 * gated to summoner/summonerUnchained levels (unlike `FamiliarPicker`, which
 * is class-agnostic) since only the Summoner's own "Eidolon" class feature
 * grants one.
 */
export function EidolonPicker({ doc, update }: EidolonPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Eidolon", false);
  const summonerLevel = eidolonSummonerLevel(doc);
  if (summonerLevel < 1) return null;

  const eidolon = doc.build.eidolon;

  return (
    <div className="subsection phantom-picker">
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
          Eidolon
          {eidolon ? <span className="hint"> · {eidolon.name}</span> : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint familiar-hint">
            A tracked eidolon gets its own stat block on the Play tab — HD, BAB, saves, AC, attacks,
            and skills, derived from your summoner level, base form, and chosen evolutions.
          </p>
          {!eidolon ? (
            <button
              type="button"
              className="chip"
              onClick={() => update((d) => setEidolon(d, "biped", "Eidolon"))}
            >
              Add an eidolon
            </button>
          ) : (
            <>
              <div className="familiar-fields">
                <select
                  className="familiar-select"
                  value={eidolon.baseForm}
                  onChange={(e) => update((d) => setEidolon(d, e.target.value, eidolon.name))}
                  aria-label="Base form"
                >
                  {Object.entries(EIDOLON_BASE_FORMS).map(([id, def]) => (
                    <option key={id} value={id}>
                      {def.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="familiar-name"
                  placeholder="Name"
                  value={eidolon.name}
                  onChange={(e) => update((d) => setEidolon(d, eidolon.baseForm, e.target.value))}
                  aria-label="Eidolon name"
                />
              </div>
              <textarea
                className="familiar-notes"
                placeholder="Notes (personality, tactics, house rules…)"
                value={eidolon.notes ?? ""}
                onChange={(e) => update((d) => setEidolonNotes(d, e.target.value))}
                aria-label="Eidolon notes"
              />
              <EvolutionSection doc={doc} update={update} />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => update((d) => clearEidolon(d))}
              >
                Remove eidolon
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function EvolutionSection({ doc, update }: { doc: CharacterDoc; update: Updater }) {
  const [query, setQuery] = useState("");
  const spent = eidolonEvolutionPointsSpent(doc);
  const available = eidolonEvolutionPointsAvailable(doc);
  const warn = eidolonEvolutionPoolNeedsWarning(doc);
  const countClass = warn ? "hint warn-over" : "hint";
  const picks = doc.build.eidolon?.evolutions ?? [];

  const evolutionList = useMemo(
    () => EIDOLON_EVOLUTION_IDS.map((id) => EIDOLON_EVOLUTIONS[id]!),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return evolutionList
      .filter((e) => !q || e.name.toLowerCase().includes(q))
      .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  }, [evolutionList, query]);

  return (
    <div className="subsection">
      <h4 className="tracker-sub">
        Evolutions
        <span
          className={countClass}
          title={warn ? "More evolution points spent than the evolution pool provides" : undefined}
        >
          {" "}
          · {spent} / {available}
        </span>
      </h4>
      <p className="hint revelation-picker-hint">
        Free-choice, soft warning only on overspend. Repeatable evolutions (Ability Increase,
        Improved Natural Armor, Tentacle, Climb, Swim, …) can be added more than once.
      </p>

      {picks.length > 0 && (
        <div className="chips" style={{ marginBottom: 8 }}>
          {picks.map((pick, i) => {
            const def = EIDOLON_EVOLUTIONS[pick.id];
            if (!def) return null;
            return (
              <span
                key={i}
                className="chip display-only"
                style={{ display: "inline-flex", gap: 4 }}
              >
                {def.name}
                {def.kind === "ability" && (
                  <select
                    className="familiar-select"
                    style={{ marginLeft: 4 }}
                    value={(pick.choice as AbilityId) ?? "str"}
                    onChange={(e) => update((d) => setEidolonEvolutionChoice(d, i, e.target.value))}
                    aria-label={`Ability Increase target ${i + 1}`}
                  >
                    {ABILITY_OPTIONS.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                )}
              </span>
            );
          })}
        </div>
      )}

      <input
        className="search"
        type="text"
        placeholder="Search evolutions…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="scroll">
        {filtered.map((def) => {
          const count = eidolonEvolutionCount(doc, def.id);
          const alreadyPicked = count > 0;
          const canAddMore = def.repeatable || !alreadyPicked;
          return (
            <div key={def.id} className={`pick-row${alreadyPicked ? " is-selected" : ""}`}>
              <div className="pmain">
                <div className="pname">
                  {def.name}{" "}
                  <span className="hint">
                    ({def.cost} pt{def.cost > 1 ? "s" : ""})
                  </span>
                  {count > 0 && <span className="hint"> · ×{count}</span>}
                </div>
                <div className="preq">
                  <span className="desc-text">{def.summary}</span>
                </div>
                {(def.minLevel || def.baseForms) && (
                  <div className="hint" style={{ marginTop: 2 }}>
                    {def.minLevel ? `Requires summoner ${def.minLevel}th. ` : ""}
                    {def.baseForms ? `Base form: ${def.baseForms.join(", ")}.` : ""}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {alreadyPicked && (
                  <button
                    type="button"
                    className="pick-btn remove"
                    onClick={() => update((d) => removeLastEidolonEvolution(d, def.id))}
                  >
                    −
                  </button>
                )}
                <button
                  type="button"
                  className="pick-btn add"
                  disabled={!canAddMore}
                  onClick={() => update((d) => addEidolonEvolution(d, def.id))}
                >
                  + Add
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 ? <div className="empty">No evolutions match.</div> : null}
      </div>
    </div>
  );
}
