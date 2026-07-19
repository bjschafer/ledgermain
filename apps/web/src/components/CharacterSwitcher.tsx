/**
 * Masthead control for switching between saved characters on this device, or
 * starting a new one. "Active" is whichever character was explicitly switched
 * to (see db/characters.ts) — this is just a thin view over that list.
 *
 * A styled custom dropdown (issue #63) replacing the original bare native
 * `<select>` — same two actions (switch to a saved character, or "+ New
 * character…"), just dressed to match the app instead of the browser's
 * default select chrome. Import/reset/delete live in the Settings tab and
 * were never part of this control, so there's nothing else to preserve.
 *
 * Follows the ARIA APG "collapsible dropdown listbox" pattern: a
 * `button[aria-haspopup="listbox"]` trigger, and — while open — a
 * `ul[role="listbox"]` that takes DOM focus itself and tracks the
 * "virtually focused" option via `aria-activedescendant` rather than moving
 * focus option-to-option. That keeps arrow/Home/End/Enter/Escape handling in
 * one `onKeyDown` on the list, and mouse/touch just click straight through
 * (`onClick` doesn't care whether the element is focusable).
 */
/* oxlint-disable jsx-a11y/no-noninteractive-element-to-interactive-role, jsx-a11y/click-events-have-key-events --
   False positives on the APG listbox pattern described above: ul/li carry the
   listbox/option roles by design, and keyboard events are handled once on the
   list container (aria-activedescendant), not per option. */
import { useEffect, useRef, useState } from "react";

import type { CharacterSummary } from "../db/characters.js";

const NEW_CHARACTER = "__new__";

interface SwitcherOption {
  id: string;
  label: string;
}

export function CharacterSwitcher({
  characters,
  activeId,
  disabled,
  onSwitch,
  onCreate,
}: {
  characters: CharacterSummary[];
  activeId: string;
  /** Disable while a character-management action is already in flight. */
  disabled?: boolean;
  onSwitch: (id: string) => void;
  onCreate: () => void;
}) {
  const options: SwitcherOption[] = [
    ...characters.map((c) => ({ id: c.id, label: c.name || "Unnamed" })),
    { id: NEW_CHARACTER, label: "+ New character…" },
  ];
  const activeLabel = characters.find((c) => c.id === activeId)?.name || "Unnamed";

  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openMenu = () => {
    if (disabled) return;
    const activeIndex = options.findIndex((o) => o.id === activeId);
    setHighlighted(activeIndex >= 0 ? activeIndex : 0);
    setOpen(true);
  };

  const closeMenu = (refocusTrigger: boolean) => {
    setOpen(false);
    if (refocusTrigger) triggerRef.current?.focus();
  };

  const commit = (option: SwitcherOption) => {
    if (option.id === NEW_CHARACTER) onCreate();
    else if (option.id !== activeId) onSwitch(option.id);
    closeMenu(true);
  };

  // Move DOM focus into the listbox the moment it opens, so arrow keys work
  // without an extra click/tab — matches how a native <select>'s popup
  // already has "focus" the instant it's open.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Click (or tap) anywhere outside the control closes it without refocusing
  // the trigger — the user's attention has already moved elsewhere.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeMenu(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div className="char-switcher" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="char-switcher-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? closeMenu(true) : openMenu())}
      >
        <span className="char-switcher-name">{activeLabel}</span>
        <span className="char-switcher-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <ul
          className="char-switcher-list"
          role="listbox"
          aria-label="Switch character"
          tabIndex={-1}
          ref={listRef}
          aria-activedescendant={
            options[highlighted] ? `char-switcher-opt-${highlighted}` : undefined
          }
          onKeyDown={(e) => {
            switch (e.key) {
              case "ArrowDown":
                e.preventDefault();
                setHighlighted((i) => Math.min(options.length - 1, i + 1));
                break;
              case "ArrowUp":
                e.preventDefault();
                setHighlighted((i) => Math.max(0, i - 1));
                break;
              case "Home":
                e.preventDefault();
                setHighlighted(0);
                break;
              case "End":
                e.preventDefault();
                setHighlighted(options.length - 1);
                break;
              case "Enter":
              case " ": {
                e.preventDefault();
                const option = options[highlighted];
                if (option) commit(option);
                break;
              }
              case "Escape":
                e.preventDefault();
                closeMenu(true);
                break;
              case "Tab":
                // Let focus continue moving (don't trap Tab in the popup),
                // but the popup itself should close as it goes.
                closeMenu(false);
                break;
              default:
                break;
            }
          }}
        >
          {options.map((o, i) => (
            <li
              key={o.id}
              id={`char-switcher-opt-${i}`}
              role="option"
              aria-selected={o.id === activeId}
              className={`char-switcher-opt${i === highlighted ? " is-highlighted" : ""}${
                o.id === NEW_CHARACTER ? " is-new" : ""
              }`}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => commit(o)}
            >
              <span className="char-switcher-opt-check" aria-hidden="true">
                {o.id === activeId ? "✓" : ""}
              </span>
              {o.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
