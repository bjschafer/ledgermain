import { useId, useState } from "react";

import type { ModifierComponent } from "@pf1/schema";

import { Provenance } from "./Provenance.js";

/**
 * A gilded stat "seal" — the big tabular total for one derived value. When given
 * provenance `components`, it expands to reveal the modifier breakdown. The seal +
 * reveal is the design's signature element (see DESIGN_NOTES.md).
 *
 * Pass `className` to append extra classes to the `.seal` element (e.g.
 * `"seal--compact"` for de-emphasised secondary stats).
 */
export function StatSeal({
  label,
  value,
  foot,
  components,
  provTitle,
  className,
}: {
  label: string;
  value: string | number;
  foot?: string;
  components?: ModifierComponent[];
  provTitle?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const expandable = components != null && components.length > 0;
  const sealClass = className ? `seal ${className}` : "seal";

  const inner = (
    <>
      {expandable ? <span className="caret">{open ? "▲" : "▼"}</span> : null}
      <div className="seal-label">{label}</div>
      <div className="seal-value num">{value}</div>
      {foot ? <div className="seal-foot">{foot}</div> : null}
    </>
  );

  if (!expandable) {
    return <div className={sealClass}>{inner}</div>;
  }

  return (
    <div className="seal-cell">
      <button
        type="button"
        className={sealClass}
        data-expandable="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {inner}
      </button>
      {open ? (
        <div id={panelId}>
          <Provenance title={provTitle ?? `${label} breakdown`} components={components} />
        </div>
      ) : null}
    </div>
  );
}
