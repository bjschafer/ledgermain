/**
 * Pure, display-only helpers for the sheet's Senses strip — formatting the
 * already-derived `DerivedSense[]` from `@pf1/engine`'s `computeSenses`. No
 * game logic lives here; this only labels what the engine already resolved.
 */

import type { DerivedSense } from "@pf1/schema";

/** "Darkvision 60 ft." for a ranged sense, bare "Low-light vision" for a flag. */
export function senseChipLabel(sense: DerivedSense): string {
  return sense.range === undefined ? sense.label : `${sense.label} ${sense.range} ft.`;
}

/**
 * Provenance line for a sense chip's tooltip: who granted it, and — when more
 * than one source did — which shorter-ranged grants it supersedes. PF1 senses
 * of a kind don't stack, so a player seeing "Darkvision 90 ft." on a half-orc
 * should be able to find out that their racial 60 ft. is the thing being
 * overridden rather than wonder where the 90 came from.
 */
export function senseTip(sense: DerivedSense): string {
  const applied = sense.components.filter((c) => c.applied).map((c) => c.source);
  const overridden = sense.components
    .filter((c) => !c.applied)
    .map((c) => (sense.range === undefined ? c.source : `${c.source} ${c.value} ft.`));

  const granted = `Granted by ${applied.join(", ")}`;
  return overridden.length > 0 ? `${granted} · overrides ${overridden.join(", ")}` : granted;
}
