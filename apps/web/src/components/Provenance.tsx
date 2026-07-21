import type { ModifierComponent } from "@pf1/schema";

import { signed } from "../model/names.js";
import { CopyButton } from "./CopyButton.js";

/** A roll formula offered for copying from a breakdown's header (issue #96). */
export interface ProvenanceCopy {
  /** The pasteable text, e.g. `"1d20 + 10"`. */
  formula: string;
  /** What it is, for the accessible name and toast, e.g. `"Fortitude save"`. */
  label: string;
}

/**
 * The provenance breakdown straight from `compute()` — each contributor with its
 * source + stacking type. Overridden (non-stacking) bonuses are struck through,
 * exactly as the engine flags them via `applied`. This reveal is the product's
 * signature: it shows *why* a number is what it is.
 *
 * `copy`, when given, puts a copy-to-clipboard button in the header — the
 * expanded breakdown is where a player already is when the GM calls for a roll.
 */
export function Provenance({
  title,
  components,
  copy,
}: {
  title: string;
  components: ModifierComponent[];
  copy?: ProvenanceCopy;
}) {
  const header = (
    <div className="prov-title">
      <span>{title}</span>
      {copy ? <CopyButton text={copy.formula} label={copy.label} /> : null}
    </div>
  );
  if (components.length === 0) {
    return (
      <div className="prov">
        {header}
        <div className="empty">No modifiers — base value only.</div>
      </div>
    );
  }
  return (
    <div className="prov">
      {header}
      {components.map((c, i) => (
        <div key={`${c.source}-${c.type}-${i}`} className={`prov-row${c.applied ? "" : " struck"}`}>
          <span className="src">
            {c.source} {c.type ? <span className="type">[{c.type}]</span> : null}
          </span>
          <span className="val">{signed(c.value)}</span>
        </div>
      ))}
    </div>
  );
}
