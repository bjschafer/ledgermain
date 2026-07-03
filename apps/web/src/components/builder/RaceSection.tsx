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
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function RaceSection({ doc, sheet, refData, update }: BuilderProps) {
  const [pendingRaceId, setPendingRaceId] = useState<string | null>(null);
  const [langInput, setLangInput] = useState("");

  const races = useMemo(
    () =>
      Object.entries(refData.races).sort((a, b) => a[1].name.localeCompare(b[1].name)),
    [refData],
  );
  const selected = refData.races[doc.identity.race];
  const flexible = selected ? raceGrantsFlexibleAbility(selected) : false;
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

  return (
    <Panel title="Race" step="iii" storageKey="panel:Race">
      <div className="chips">
        {races.map(([id, race]) => (
          <button
            key={id}
            type="button"
            className="chip"
            aria-pressed={doc.identity.race === id}
            onClick={() => {
              const target = doc.identity.race === id ? "" : id;
              // Switching away from a race that's already applied resets its
              // modifiers, so require confirmation; picking an initial race
              // (nothing chosen yet) is free.
              if (doc.identity.race && doc.identity.race !== id) {
                setPendingRaceId(id);
              } else if (doc.identity.race === id) {
                setPendingRaceId("");
              } else {
                update((d) => setRace(d, target));
              }
            }}
          >
            {race.name}
          </button>
        ))}
      </div>
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
          {selected.name} · size {selected.size} · speed {selected.speeds.land ?? 30} ft.
          Racial ability and skill bonuses flow into the sheet automatically.
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
        <div className="lang-add-row" style={{ marginTop: 6, display: "flex", gap: 8 }}>
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
    </Panel>
  );
}
