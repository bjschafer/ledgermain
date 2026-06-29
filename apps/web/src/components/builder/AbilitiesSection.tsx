import { ABILITY_IDS, setAbility } from "../../model/doc.js";
import { ABILITY_ABBR, signed } from "../../model/names.js";
import { NumberField } from "./NumberField.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function AbilitiesSection({ doc, sheet, update }: BuilderProps) {
  return (
    <Panel
      title="Ability Scores"
      step="ii"
      right={<span className="hint">base scores · racial mods shown below</span>}
    >
      <div className="abilities-grid">
        {ABILITY_IDS.map((id) => {
          const score = sheet.abilities[id];
          const racial = score.total - score.base;
          return (
            <div className="ability-cell" key={id}>
              <div className="abbr">{ABILITY_ABBR[id]}</div>
              <NumberField
                value={doc.abilities[id]}
                min={1}
                max={50}
                onCommit={(n) => update((d) => setAbility(d, id, n))}
                aria-label={`${ABILITY_ABBR[id]} base score`}
              />
              <div className="mod">
                <b className="num">{signed(score.mod)}</b>
                {racial !== 0 ? ` · ${signed(racial)} race` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
