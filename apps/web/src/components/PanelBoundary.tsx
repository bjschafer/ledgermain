import type { ReactNode } from "react";

import { ErrorBoundary } from "./ErrorBoundary.js";

/**
 * Wraps one tracker panel so a render crash inside it costs only that panel.
 *
 * The root boundary is the wrong granularity in play: a bad buff or a
 * half-built companion that throws while rendering would otherwise blank the
 * whole sheet, taking HP, conditions and every other panel with it in the
 * middle of a fight. Here the rest of the tracker keeps working and the dead
 * panel says so in place.
 *
 * The fallback borrows `Panel`'s own markup rather than its component, so it
 * needs no collapse/resize state and can't crash for the same reason the panel
 * did. It names the panel because the player filing the report can't see the
 * component tree, and "Buffs" is most of the bug report.
 */
export function PanelBoundary({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ErrorBoundary
      label={label}
      fallback={(error) => (
        <section className="panel panel-crashed" role="alert">
          <header>
            <h2>{label}</h2>
          </header>
          <div className="body">
            <p className="hint">This panel stopped working. The rest of the sheet still works.</p>
            <p className="crash-detail">{error.message || String(error)}</p>
          </div>
        </section>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
