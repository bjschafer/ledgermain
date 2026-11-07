import type { ReactNode } from "react";

/**
 * A settled choice (a race, a full set of domains) shown as one line with a
 * button to reopen its picker. Pickers that stay open after the choice is made
 * bury what you picked under every option you didn't.
 */
export function ChoiceSummary({
  children,
  actionLabel,
  onAction,
}: {
  children: ReactNode;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="choice-summary">
      <div className="choice-summary-main">{children}</div>
      <button type="button" className="btn-ghost" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

/** Heading over a reopened picker, with the way back out. */
export function ChoiceBrowseHead({
  title,
  closeLabel = "Cancel",
  onClose,
  children,
}: {
  title: string;
  closeLabel?: string;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="choice-browse-head">
      <div className="choice-browse-title">
        <span className="eyebrow">{title}</span>
        <button type="button" className="btn-ghost" onClick={onClose}>
          {closeLabel}
        </button>
      </div>
      {children ? <p className="hint choice-browse-hint">{children}</p> : null}
    </div>
  );
}
