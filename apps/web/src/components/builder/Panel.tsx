import type { MouseEvent, ReactNode } from "react";
import { useCallback, useRef } from "react";

import { useCollapsed } from "../../state/useCollapsed.js";
import { useResizableHeight } from "../../state/useResizableHeight.js";

/**
 * A titled builder panel. `step` is a short ledger-style marker (e.g. "i", "ii").
 *
 * When `storageKey` is provided the panel becomes collapsible: a caret appears in
 * the header and clicking the header toggles the body. The collapsed state is
 * persisted to localStorage so it survives reloads. Default is expanded.
 *
 * Every panel is also resizable: a corner grip in the bottom-right lets the
 * user drag the body taller/shorter (persisted per `storageKey`/title). Once
 * resized, a "reset size" control appears in the header to return to the
 * natural, content-driven height.
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
  const [collapsed, toggle] = useCollapsed(storageKey ?? "", defaultCollapsed);
  const isCollapsible = storageKey != null;

  const [height, setHeight, resetHeight] = useResizableHeight(storageKey ?? title);
  const bodyRef = useRef<HTMLDivElement>(null);

  const onResizeStart = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = bodyRef.current?.getBoundingClientRect().height ?? 0;

      const onMove = (moveEvent: globalThis.MouseEvent) => {
        setHeight(startHeight + (moveEvent.clientY - startY));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [setHeight],
  );

  const onHeaderClick = isCollapsible
    ? (e: MouseEvent<HTMLElement>) => {
        // Don't collapse when the user interacts with controls inside the header
        // (e.g. the "Advance round" or "Rest" buttons in tracker panels).
        // e.target can be a text node, so resolve to the nearest Element first.
        const node = e.target instanceof Element ? e.target : (e.target as Node).parentElement;
        const interactive = node?.closest(
          "button, input, select, textarea, [role='button'], [contenteditable='true']",
        );
        // The header itself has role="button", so exclude it from the guard.
        if (!interactive || interactive === e.currentTarget) toggle();
      }
    : undefined;

  const header = (
    <header
      onClick={onHeaderClick}
      role={isCollapsible ? "button" : undefined}
      tabIndex={isCollapsible ? 0 : undefined}
      aria-label={isCollapsible ? title : undefined}
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
      {height != null ? (
        <button type="button" className="btn-ghost" onClick={resetHeight}>
          reset size
        </button>
      ) : null}
      {isCollapsible ? (
        <span className="panel-caret" aria-hidden="true">
          {collapsed ? "▸" : "▾"}
        </span>
      ) : null}
    </header>
  );

  const bodyVisible = !isCollapsible || !collapsed;

  return (
    <section
      className={`panel${isCollapsible ? " collapsible" : ""}${isCollapsible && collapsed ? " is-collapsed" : ""}`}
    >
      {header}
      {bodyVisible ? (
        <div
          className="body"
          ref={bodyRef}
          style={height != null ? { height, overflowY: "auto" } : undefined}
        >
          {children}
          <div
            className="panel-resize-handle"
            onMouseDown={onResizeStart}
            role="separator"
            aria-orientation="horizontal"
            aria-label={`Resize ${title} panel`}
            title="Drag to resize"
          />
        </div>
      ) : null}
    </section>
  );
}
