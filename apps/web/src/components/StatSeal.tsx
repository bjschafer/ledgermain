import { useId, useState } from "react";

import type { ModifierComponent } from "@pf1/schema";

import { useFlashKey } from "../hooks/useFlashKey.js";
import { Provenance } from "./Provenance.js";

/**
 * A gilded stat "seal" — the big tabular total for one derived value. When given
 * provenance `components`, it expands to reveal the modifier breakdown. The seal +
 * reveal is the design's signature element (see DESIGN_NOTES.md).
 *
 * Pass `className` to append extra classes to the `.seal` element (e.g.
 * `"seal--compact"` for de-emphasised secondary stats).
 *
 * Two "living sheet" cues layer on top of the static seal (the audit's point:
 * recompute is invisible today — toggling a condition changes AC but nothing
 * *shows* it changed):
 *
 * 1. **Recompute shimmer** — whenever `value` changes after mount, a brief
 *    gold wash plays once and fades. Tracked via a ref against the previous
 *    `value`; `resetKey` (pass `doc.id`) lets the caller resync that ref
 *    silently on a character switch instead of flashing every seal at once.
 * 2. **Baseline tint** — when `baseline` is given and differs from the
 *    seal's current numeric total, the numeral tints sage (higher) or
 *    oxblood (lower) with a small corner arrow. `numericValue` supplies that
 *    numeric total when `value` itself is a formatted string (an attack
 *    sequence like "+11/+6") rather than a bare number — never parsed out of
 *    the string. Every stat this is wired to is higher-is-better.
 */
export function StatSeal({
  label,
  value,
  foot,
  components,
  provTitle,
  className,
  resetKey,
  baseline,
  numericValue,
}: {
  label: string;
  value: string | number;
  foot?: string;
  components?: ModifierComponent[];
  provTitle?: string;
  className?: string;
  /** Identity key (e.g. `doc.id`) — changing it resyncs the shimmer tracker without flashing. */
  resetKey?: string | number;
  /** Unconditioned baseline total for this stat (see `model/baseline.ts`); omit to skip the tint. */
  baseline?: number;
  /** Raw numeric total to compare against `baseline`, for string-valued seals (attack sequences). */
  numericValue?: number;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const expandable = components != null && components.length > 0;
  const sealClass = className ? `seal ${className}` : "seal";

  const flashKey = useFlashKey(value, resetKey);

  const current = numericValue ?? (typeof value === "number" ? value : undefined);
  const tinted = baseline !== undefined && current !== undefined && current !== baseline;
  const tint = tinted ? (current! > baseline! ? "higher" : "lower") : undefined;

  const inner = (
    <>
      {expandable ? <span className="caret">{open ? "▲" : "▼"}</span> : null}
      {tint ? (
        <span className="seal-tint-marker" data-tint={tint} aria-hidden="true">
          {tint === "higher" ? "▲" : "▼"}
        </span>
      ) : null}
      <div className="seal-label">{label}</div>
      <div className="seal-value num" data-tint={tint}>
        {value}
      </div>
      {foot ? <div className="seal-foot">{foot}</div> : null}
      {flashKey > 0 ? <span key={flashKey} className="seal-flash" aria-hidden="true" /> : null}
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
