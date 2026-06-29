import { useMemo } from "react";

import { raceGrantsFlexibleAbility } from "@pf1/engine";
import { ABILITY_IDS } from "@pf1/schema";

import { setFlexibleAbility, setRace } from "../../model/doc.js";
import { ABILITY_ABBR } from "../../model/names.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function RaceSection({ doc, refData, update }: BuilderProps) {
  const races = useMemo(
    () =>
      Object.entries(refData.races).sort((a, b) => a[1].name.localeCompare(b[1].name)),
    [refData],
  );
  const selected = refData.races[doc.identity.race];
  const flexible = selected ? raceGrantsFlexibleAbility(selected) : false;

  return (
    <Panel title="Race" step="iii">
      <div className="chips">
        {races.map(([id, race]) => (
          <button
            key={id}
            type="button"
            className="chip"
            aria-pressed={doc.identity.race === id}
            onClick={() => update((d) => setRace(d, doc.identity.race === id ? "" : id))}
          >
            {race.name}
          </button>
        ))}
      </div>
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
