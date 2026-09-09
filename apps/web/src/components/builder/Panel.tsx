import type { MouseEvent, ReactNode } from "react";
import { useCallback, useRef } from "react";

import { useCollapsed } from "../../state/useCollapsed.js";
import { useResizableHeight } from "../../state/useResizableHeight.js";
import { Caret } from "../Caret.js";

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
  icon,
  right,
  children,
  storageKey,
  defaultCollapsed = false,
}: {
  title: string;
  step?: string;
  /** Small decorative glyph shown before the title, e.g. from `../icons.js`. */
  icon?: ReactNode;
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
        // (e.g. the "Advance round" or "Rest" buttons in tracker panels, or the
        // caret, which toggles on its own). e.target can be a text node, so
        // resolve to the nearest Element first.
        const node = e.target instanceof Element ? e.target : (e.target as Node).parentElement;
        const interactive = node?.closest(
          "button, input, select, textarea, [role='button'], [contenteditable='true']",
        );
        if (!interactive) toggle();
      }
    : undefined;

  // The caret is the real toggle; the header's click handler is a mouse/touch
  // convenience on top of it. The header used to BE the button, but several
  // panels put their own buttons ("Rest", "Advance round") in that header, and
  // a control nested inside a control is a WCAG 4.1.2 failure that leaves the
  // inner button unreachable to assistive tech (axe `nested-interactive`, see
  // e2e/a11y.spec.ts).
  const header = (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <header onClick={onHeaderClick}>
      <h2>
        {icon ? (
          <span className="panel-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
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
        <button
          type="button"
          className="panel-caret-btn"
          aria-label={title}
          aria-expanded={!collapsed}
          onClick={toggle}
        >
          <Caret open={!collapsed} />
        </button>
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
