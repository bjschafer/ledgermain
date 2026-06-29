import { setMaxHpOverride } from "../../model/doc.js";
import { NumberField } from "./NumberField.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

export function HitPointsSection({ doc, sheet, update }: BuilderProps) {
  const auto = sheet.hp.auto;
  const hasOverride = doc.build.maxHpOverride != null && doc.build.maxHpOverride > 0;

  return (
    <Panel
      title="Hit Points"
      step="★"
      right={<span className="hint">average {auto}</span>}
    >
      <div className="hp-override-row">
        <label className="hp-override-label" htmlFor="hp-override-input">
          Max HP
          {hasOverride ? (
            <span className="hp-override-badge">override active</span>
          ) : (
            <span className="hp-override-badge hp-override-badge--auto">using average</span>
          )}
        </label>
        <NumberField
          className="num hp-override-input"
          value={doc.build.maxHpOverride ?? auto}
          min={1}
          max={100000}
          onCommit={(n) => update((d) => setMaxHpOverride(d, n))}
          aria-label="Max HP override"
        />
        <button
          type="button"
          className="btn-ghost"
          disabled={!hasOverride}
          onClick={() => update((d) => setMaxHpOverride(d, null))}
        >
          reset to average
        </button>
      </div>
    </Panel>
  );
}
