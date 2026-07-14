import { useMemo, useState } from "react";

import {
  EIDOLON_BASE_FORMS,
  EIDOLON_EVOLUTION_IDS,
  EIDOLON_EVOLUTIONS,
  EIDOLON_SUBTYPE_IDS,
  EIDOLON_SUBTYPES,
  eidolonVariant,
  type DerivedEidolon,
} from "@pf1/engine";
import type { AbilityId, CharacterDoc, RefData } from "@pf1/schema";

import {
  addEidolonEvolution,
  clearEidolon,
  deriveEidolonSheet,
  eidolonEvolutionCount,
  eidolonEvolutionPointsAvailable,
  eidolonEvolutionPointsSpent,
  eidolonEvolutionPoolNeedsWarning,
  eidolonFeatPrereqContext,
  eidolonSubtypeAlignmentWarning,
  eidolonSubtypeFormWarning,
  eidolonSummonerLevel,
  removeLastEidolonEvolution,
  setEidolon,
  setEidolonAbilityIncrease,
  setEidolonEvolutionChoice,
  setEidolonNotes,
  setEidolonSubtype,
  setEidolonSubtypeGrantChoice,
  toggleEidolonFeat,
} from "../../model/eidolon.js";
import { evaluatePrereqs } from "../../model/prereqs.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface EidolonPickerProps {
  doc: CharacterDoc;
  refData: RefData;
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
export function EidolonPicker({ doc, refData, update }: EidolonPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Eidolon", false);
  const summonerLevel = eidolonSummonerLevel(doc);
  if (summonerLevel < 1) return null;

  const eidolon = doc.build.eidolon;
  // Full derived stat block — needed for the eidolon's OWN
  // hd/bab/abilities/feat budget, none of which the raw `EidolonBuild` alone
  // carries.
  const derivedEidolon = deriveEidolonSheet(doc, refData);
  const chosenFeatIds = eidolon?.feats ?? [];
  const featCtx = derivedEidolon
    ? eidolonFeatPrereqContext(doc, derivedEidolon, refData)
    : undefined;

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
              {eidolonVariant(doc) === "unchained" && (
                <SubtypeSection doc={doc} update={update} derivedEidolon={derivedEidolon} />
              )}
              <textarea
                className="familiar-notes"
                placeholder="Notes (personality, tactics, house rules…)"
                value={eidolon.notes ?? ""}
                onChange={(e) => update((d) => setEidolonNotes(d, e.target.value))}
                aria-label="Eidolon notes"
              />
              <EvolutionSection doc={doc} update={update} />
              {derivedEidolon && featCtx && (
                <div className="animal-companion-feats">
                  <span
                    className={`hint${
                      chosenFeatIds.length > derivedEidolon.bonusFeats ? " warn-over" : ""
                    }`}
                  >
                    Feats: {chosenFeatIds.length} / {derivedEidolon.bonusFeats}
                  </span>
                  <div className="chips">
                    {chosenFeatIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="chip"
                        aria-pressed
                        onClick={() => update((d) => toggleEidolonFeat(d, id))}
                        title="Remove"
                      >
                        {refData.feats[id]?.name ?? id} ✕
                      </button>
                    ))}
                  </div>
                  <select
                    className="familiar-select"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) update((d) => toggleEidolonFeat(d, e.target.value));
                    }}
                    aria-label="Add an eidolon feat"
                  >
                    <option value="">— add a feat —</option>
                    {Object.values(refData.feats)
                      .filter((f) => !chosenFeatIds.includes(f.id))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((f) => {
                        const blocked = evaluatePrereqs(f, featCtx).blocked;
                        return (
                          <option key={f.id} value={f.id} disabled={blocked}>
                            {f.name}
                            {blocked ? " (prereqs unmet)" : ""}
                          </option>
                        );
                      })}
                  </select>
                  <p className="hint">
                    Free pick from the full feat list; prereqs checked against the eidolon's own
                    stats.
                  </p>
                </div>
              )}
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

/** 1 -> "1st", everything else in this domain (4/8/12/16/20) -> "Nth" — the subtype grant table never lands on 2nd/3rd/22nd/etc, so this doesn't need the general ordinal-suffix logic `classPrereqs.ts`'s private `ordinal` has. */
function grantOrdinal(level: number): string {
  return level === 1 ? "1st" : `${level}th`;
}

/**
 * Pathfinder Unchained-only subtype UI: subtype select, soft form/alignment
 * warnings (never blocking — mirrors `alignment.ts`'s `classAlignmentWarnings`
 * posture), automatic Ability Score Increase slot selects (5th/10th/15th,
 * copying `PhantomPicker`'s ability-increase-slot pattern), a target-ability
 * select for each unlocked subtype +2 ability-increase grant, and
 * granted-evolution chips with locked/unlocked styling (`aria-disabled` reuses
 * the existing `.chip[aria-disabled="true"]` dimming rather than new CSS).
 */
function SubtypeSection({
  doc,
  update,
  derivedEidolon,
}: {
  doc: CharacterDoc;
  update: Updater;
  derivedEidolon: DerivedEidolon | undefined;
}) {
  const eidolon = doc.build.eidolon!;
  const subtypeId = eidolon.subtype;
  const subtype = subtypeId ? EIDOLON_SUBTYPES[subtypeId] : undefined;
  const formWarning = eidolonSubtypeFormWarning(doc);
  const alignmentWarning = eidolonSubtypeAlignmentWarning(doc);
  const level = derivedEidolon?.level ?? 0;
  const abilityIncreaseSlots = derivedEidolon?.abilityIncreaseSlots ?? 0;
  const abilityIncreases = eidolon.abilityIncreases ?? [];
  const grantedEvolutions = derivedEidolon?.grantedEvolutions ?? [];
  const abilityIncreaseGrants = (subtype?.grants ?? []).filter(
    (g) => g.abilityIncrease && g.level <= level,
  );

  return (
    <div className="subsection">
      <h4 className="tracker-sub">Subtype</h4>
      <div className="familiar-fields">
        <select
          className="familiar-select"
          value={subtypeId ?? ""}
          onChange={(e) => update((d) => setEidolonSubtype(d, e.target.value || undefined))}
          aria-label="Eidolon subtype"
        >
          <option value="">— none —</option>
          {EIDOLON_SUBTYPE_IDS.map((id) => {
            const def = EIDOLON_SUBTYPES[id]!;
            return (
              <option key={id} value={id}>
                {def.name} ({def.alignmentText})
              </option>
            );
          })}
        </select>
      </div>

      {formWarning && <p className="hint warn-over">{formWarning}</p>}
      {alignmentWarning && <p className="hint warn-over">{alignmentWarning}</p>}

      {abilityIncreaseSlots > 0 && (
        <div className="animal-companion-asi">
          <span className="hint">Ability Score Increases:</span>
          {Array.from({ length: abilityIncreaseSlots }, (_, i) => (
            <select
              key={i}
              className="familiar-select"
              value={abilityIncreases[i] ?? "str"}
              onChange={(e) =>
                update((d) => setEidolonAbilityIncrease(d, i, e.target.value as AbilityId))
              }
              aria-label={`Ability Score Increase ${i + 1}`}
            >
              {ABILITY_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}

      {abilityIncreaseGrants.map((g) => (
        <div key={g.level} className="animal-companion-asi">
          <span className="hint">Subtype +2 ability ({grantOrdinal(g.level)}):</span>
          <select
            className="familiar-select"
            value={eidolon.subtypeGrantChoices?.[String(g.level)] ?? "str"}
            onChange={(e) =>
              update((d) => setEidolonSubtypeGrantChoice(d, g.level, e.target.value as AbilityId))
            }
            aria-label={`Subtype ability increase target (${grantOrdinal(g.level)})`}
          >
            {ABILITY_OPTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {grantedEvolutions.length > 0 && (
        <div className="chips" style={{ marginTop: 8 }}>
          {grantedEvolutions.map((g) => (
            <span
              key={g.level}
              className="chip display-only"
              aria-disabled={g.unlocked ? undefined : "true"}
              title={g.note}
            >
              {grantOrdinal(g.level)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
