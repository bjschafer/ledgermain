import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * A full-screen modal surface: portalled to `document.body`, closed by Escape,
 * by a backdrop click, or by the header's ✕. While open, the page behind is
 * scroll-locked and focus is moved into the dialog, then restored to whatever
 * was focused before on close.
 *
 * Deliberately not a `<dialog>` element — `showModal()` puts the element in the
 * top layer, where it escapes the app's CSS custom-property scope and the
 * ::backdrop is styled through a separate pseudo-element. A portalled div keeps
 * the theme variables and the existing `.feedback-backdrop` idiom.
 */
export function Dialog({
  title,
  subtitle,
  right,
  onClose,
  children,
  compact,
}: {
  title: string;
  subtitle?: ReactNode;
  /** Header content between the title and the close button. */
  right?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Shrink the surface to fit its content instead of filling the viewport
   *  (see `.dialog-surface.compact` in styles.css) — for short confirms
   *  rather than full-screen pickers. */
  compact?: boolean;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    surfaceRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="dialog-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={compact ? "dialog-surface compact" : "dialog-surface"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={surfaceRef}
      >
        <header className="dialog-header">
          <h2 className="dialog-title">{title}</h2>
          {subtitle ? <span className="dialog-subtitle">{subtitle}</span> : null}
          <div className="dialog-header-right">{right}</div>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <div className="dialog-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
