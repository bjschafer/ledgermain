import type { ModifierComponent } from "@pf1/schema";

import { signed } from "../model/names.js";

/**
 * The provenance breakdown straight from `compute()` — each contributor with its
 * source + stacking type. Overridden (non-stacking) bonuses are struck through,
 * exactly as the engine flags them via `applied`. This reveal is the product's
 * signature: it shows *why* a number is what it is.
 */
export function Provenance({
  title,
  components,
}: {
  title: string;
  components: ModifierComponent[];
}) {
  if (components.length === 0) {
    return (
      <div className="prov">
        <div className="prov-title">{title}</div>
        <div className="empty">No modifiers — base value only.</div>
      </div>
    );
  }
  return (
    <div className="prov">
      <div className="prov-title">{title}</div>
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
