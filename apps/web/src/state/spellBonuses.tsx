/**
 * The active character's Spell Focus / Spell Penetration-family bonuses
 * (`DerivedSheet.spellDCs` / `clChecks`), shared with every spell row.
 *
 * A context rather than a prop for the same reason as `state/rollData.tsx`:
 * `SpellDetail` renders at ~two dozen call sites across the tracker's
 * prepared/spontaneous/hybrid views and the builder's spell-list references,
 * most of them several layers below anything that holds the sheet — and a
 * missed site would show a player a DC the feat they took doesn't reach.
 *
 * Outside the provider (tests) the value is empty, which adjusts nothing
 * rather than adjusting wrongly. The print view doesn't consume this — it
 * folds the same sheet fields in directly (`model/printSheet.ts`).
 *
 * `summonFeats` rides along here rather than in its own context for the same
 * reason: it's more per-character data every `SpellDetail` needs to build its
 * summon-helper deep link, and a second context for one string array would
 * just be more places to remember to provide it.
 */
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import type {
  CharacterDoc,
  DerivedClChecks,
  DerivedSheet,
  DerivedSpellDCs,
  RefData,
} from "@pf1/schema";

import { summonFeatSlugs } from "../model/summonLink.js";

export interface SpellBonuses {
  spellDCs?: DerivedSpellDCs;
  clChecks?: DerivedClChecks;
  /** Reference-site feat slugs among Augment Summoning / Superior Summoning; empty outside the provider. */
  summonFeats: string[];
}

const EMPTY: SpellBonuses = { summonFeats: [] };

const SpellBonusesContext = createContext<SpellBonuses>(EMPTY);

export function SpellBonusesProvider({
  doc,
  sheet,
  refData,
  children,
}: {
  doc: CharacterDoc;
  sheet: DerivedSheet;
  refData: RefData;
  children: ReactNode;
}) {
  const value = useMemo<SpellBonuses>(
    () => ({
      ...(sheet.spellDCs ? { spellDCs: sheet.spellDCs } : {}),
      ...(sheet.clChecks ? { clChecks: sheet.clChecks } : {}),
      summonFeats: summonFeatSlugs(doc, refData),
    }),
    [doc, refData, sheet.spellDCs, sheet.clChecks],
  );
  return <SpellBonusesContext.Provider value={value}>{children}</SpellBonusesContext.Provider>;
}

/** The sheet's spell-DC / CL-check bonuses; empty outside the provider. */
export function useSpellBonuses(): SpellBonuses {
  return useContext(SpellBonusesContext);
}

/**
 * Re-provides the EMPTY bonus set beneath the app-wide provider — for spell
 * rows that are NOT spells being cast. Spell-like abilities are the case:
 * PF1 RAW, Spell Focus and the rest of the spell-feat family do not apply
 * to SLAs, so their `SpellDetail` strips must not fold the sheet's spell-DC
 * or CL-check bonuses in.
 */
export function SpellBonusesExclusion({ children }: { children: ReactNode }) {
  return <SpellBonusesContext.Provider value={EMPTY}>{children}</SpellBonusesContext.Provider>;
}
