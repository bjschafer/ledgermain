import { useState, type ReactNode } from "react";

import { ChoiceBrowseHead, ChoiceSummary } from "./ChoiceSummary.js";

/**
 * Folds a budgeted pick list (hexes, rage powers, exploits…) down to the
 * names you chose once every pick is spent, with a button to reopen it. While
 * picks are still owed the list stays open, since choosing is the next thing
 * to do there.
 */
export function PickFold({
  noun,
  catalog,
  selected,
  owed,
  children,
}: {
  /** Plural, lower-case: "hexes", "rage powers". */
  noun: string;
  catalog: readonly { id: string; name: string }[];
  selected: ReadonlySet<string>;
  /** Picks still unspent: keeps the list open. */
  owed: boolean;
  children: ReactNode;
}) {
  const [reopened, setReopened] = useState(false);

  if (owed || reopened) {
    return (
      <>
        {reopened && !owed ? (
          <ChoiceBrowseHead
            title={`Change ${noun}`}
            closeLabel="Done"
            onClose={() => setReopened(false)}
          />
        ) : null}
        {children}
      </>
    );
  }

  const names = catalog.filter((c) => selected.has(c.id)).map((c) => c.name);
  return (
    <ChoiceSummary actionLabel={`Change ${noun}`} onAction={() => setReopened(true)}>
      {names.length > 0 ? (
        <span className="choice-summary-name">{names.join(", ")}</span>
      ) : (
        <span className="hint">None chosen.</span>
      )}
    </ChoiceSummary>
  );
}
