import type { ReactNode } from "react";

import { useCollapsed } from "../../state/useCollapsed.js";

/**
 * A titled builder panel. `step` is a short ledger-style marker (e.g. "i", "ii").
 *
 * When `storageKey` is provided the panel becomes collapsible: a caret appears in
 * the header and clicking the header toggles the body. The collapsed state is
 * persisted to localStorage so it survives reloads. Default is expanded.
 */
export function Panel({
  title,
  step,
  right,
  children,
  storageKey,
  defaultCollapsed = false,
}: {
  title: string;
  step?: string;
  right?: ReactNode;
  children: ReactNode;
  /** When present, makes the panel collapsible and persists state under this key. */
  storageKey?: string;
  /** Initial collapsed state when no localStorage value exists. Default false. */
  defaultCollapsed?: boolean;
}) {
  const [collapsed, toggle] = useCollapsed(
    storageKey ?? "",
    defaultCollapsed,
  );
  const isCollapsible = storageKey != null;

  const header = (
    <header
      onClick={isCollapsible ? toggle : undefined}
      role={isCollapsible ? "button" : undefined}
      tabIndex={isCollapsible ? 0 : undefined}
      aria-expanded={isCollapsible ? !collapsed : undefined}
      onKeyDown={
        isCollapsible
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") toggle();
            }
          : undefined
      }
    >
      <h2>
        {title}
        {step ? <span className="step">{step}</span> : null}
      </h2>
      {right}
      {isCollapsible ? (
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      ) : null}
    </header>
  );

  return (
    <section className={`panel${isCollapsible ? " collapsible" : ""}${isCollapsible && collapsed ? " is-collapsed" : ""}`}>
      {header}
      {(!isCollapsible || !collapsed) ? <div className="body">{children}</div> : null}
    </section>
  );
}
