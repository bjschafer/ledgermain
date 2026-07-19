import { useState, type ReactNode } from "react";
import { Caret } from "./Caret.js";

/**
 * Collapsed-by-default explainer block: a clickable `<summary>` line (with
 * the shared panel caret) that expands into a body of guidance
 * prose. Extracted from the Spellbook panel's original "How X spellcasting
 * works" idiom (`SpellsSection.tsx`'s prior `SpellHints`) so any panel with a
 * standing explainer paragraph can fold it away by default instead of always
 * rendering it, matching the house convention: reference prose stays out of
 * the way until asked for.
 */
export function Explainer({
  title,
  children,
  className,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className={`explainer${className ? ` ${className}` : ""}`}
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="explainer-summary">
        {title}
        <Caret open={open} />
      </summary>
      <div className="explainer-body">{children}</div>
    </details>
  );
}
