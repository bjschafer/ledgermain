import type { DerivedAbilityDC } from "@pf1/schema";

import { StatSeal } from "./StatSeal.js";

/**
 * The character's own enemy-facing ability DCs (hex, channel energy, bomb,
 * cruelty, mesmerist trick, Stunning Fist, Quivering Palm) — see
 * `DerivedSheet.abilityDCs`. One `StatSeal` per entry, keyed by `label` since
 * a multiclass witch/shaman's two "Hex DC (Witch)"/"Hex DC (Shaman)" lines
 * already disambiguate that way. Shared between `Sheet.tsx`'s builder stat
 * group and the tracker's own panel so the two never drift in markup.
 *
 * Renders an empty grid for an empty `abilityDCs` list rather than `null` —
 * callers that already know they have a nonempty list (or want the grid
 * chrome to show regardless) don't need a redundant length check; callers
 * that want to hide the whole section on empty (`Sheet.tsx`'s stat-group)
 * check `sheet.abilityDCs` themselves before rendering this at all.
 */
export function AbilityDcList({
  abilityDCs,
  baselineDCs,
  resetKey,
  gridClassName = "stat-group-grid stat-group-grid--3",
}: {
  abilityDCs: DerivedAbilityDC[];
  /** The character's unconditioned baseline DCs (`model/baseline.ts`) for the seal's tint; omit to skip it. */
  baselineDCs?: DerivedAbilityDC[];
  /** Identity key (e.g. `doc.id`) — see `StatSeal`'s prop of the same name. */
  resetKey?: string | number;
  /** Grid wrapper class; the tracker panel overrides this to fit its own layout. */
  gridClassName?: string;
}) {
  return (
    <div className={gridClassName}>
      {abilityDCs.map((d) => (
        <StatSeal
          key={d.label}
          label={d.label}
          value={d.dc}
          foot={d.save}
          resetKey={resetKey}
          baseline={baselineDCs?.find((b) => b.label === d.label)?.dc}
          numericValue={d.dc}
        />
      ))}
    </div>
  );
}
