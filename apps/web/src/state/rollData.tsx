/**
 * The active character's roll data, shared with any component that renders
 * vendored rules text.
 *
 * A context rather than a prop: the strings that still carry Foundry's
 * `[[formula]]` inline-roll syntax (see `model/inlineRolls.ts`) surface deep
 * in pickers and note rows that otherwise have no reason to know the
 * character exists, and a missed site shows the player raw syntax. Read-only
 * derived state with many scattered consumers is the case a context is
 * actually for — unlike `state/toast.ts`, whose pub/sub deliberately avoids
 * one because a transient notification has no such tree-shaped dependency.
 *
 * Outside the provider (the print view, tests) the value is empty roll data,
 * which resolves nothing rather than resolving wrongly.
 */
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

import { buildRollData } from "@pf1/engine";
import type { RollData } from "@pf1/engine";
import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { resolveInlineRolls } from "../model/inlineRolls.js";

const EMPTY: RollData = {};

const RollDataContext = createContext<RollData>(EMPTY);

export function RollDataProvider({
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
  // The same roll-data shape compute() evaluated this character's changes
  // against, so a resolved inline roll agrees with the numbers on the sheet.
  const rollData = useMemo(
    () => buildRollData(doc, refData, sheet.abilities, sheet.speeds),
    [doc, refData, sheet.abilities, sheet.speeds],
  );
  return <RollDataContext.Provider value={rollData}>{children}</RollDataContext.Provider>;
}

/**
 * A resolver for vendored rules text — pass any string that may carry inline
 * rolls and render what comes back. Stable per roll-data identity, so it can
 * be called in a list render without re-memoizing per row.
 */
export function useInlineRolls(): (text: string) => string {
  const rollData = useContext(RollDataContext);
  return useMemo(() => (text: string) => resolveInlineRolls(text, rollData), [rollData]);
}
