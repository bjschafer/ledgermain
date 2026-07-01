import { useMemo, useState } from "react";

import { raceGrantsFlexibleAbility } from "@pf1/engine";
import { ABILITY_IDS } from "@pf1/schema";

import { setFlexibleAbility, setRace } from "../../model/doc.js";
import { ABILITY_ABBR } from "../../model/names.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function RaceSection({ doc, refData, update }: BuilderProps) {
  const [pendingRaceId, setPendingRaceId] = useState<string | null>(null);

  const races = useMemo(
    () =>
      Object.entries(refData.races).sort((a, b) => a[1].name.localeCompare(b[1].name)),
    [refData],
  );
  const selected = refData.races[doc.identity.race];
  const flexible = selected ? raceGrantsFlexibleAbility(selected) : false;
  const pendingRace = pendingRaceId != null ? refData.races[pendingRaceId] : undefined;

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
    </Panel>
  );
}
