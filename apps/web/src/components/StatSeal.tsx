import { useId, useState } from "react";

import type { ModifierComponent } from "@pf1/schema";

import { Provenance } from "./Provenance.js";

/**
 * A gilded stat "seal" — the big tabular total for one derived value. When given
 * provenance `components`, it expands to reveal the modifier breakdown. The seal +
 * reveal is the design's signature element (see DESIGN_NOTES.md).
 */
export function StatSeal({
  label,
  value,
  foot,
  components,
  provTitle,
}: {
  label: string;
  value: string | number;
  foot?: string;
  components?: ModifierComponent[];
  provTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const expandable = components != null && components.length > 0;

  const inner = (
    <>
      {expandable ? <span className="caret">{open ? "▲" : "▼"}</span> : null}
      <div className="seal-label">{label}</div>
      <div className="seal-value num">{value}</div>
      {foot ? <div className="seal-foot">{foot}</div> : null}
    </>
  );

  if (!expandable) {
    return <div className="seal">{inner}</div>;
  }

  return (
    <div>
      <button
        type="button"
        className="seal"
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
