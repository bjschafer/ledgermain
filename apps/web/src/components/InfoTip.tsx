import type {
  ButtonHTMLAttributes,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  RefObject,
} from "react";
import { useEffect, useId, useLayoutEffect, useReducer, useRef } from "react";

/**
 * Visibility is the OR of three independent sources, not one shared boolean —
 * that's the part that's easy to get wrong here. A real mouse click is
 * *always* preceded by a `pointerenter` (the cursor has to be over the
 * element to click it), so if "click" toggled the same flag "hover" sets,
 * every click would read the just-opened-by-hover state and immediately
 * flip it back off. Keeping hover/click/focus separate means a click while
 * hovering still visibly does nothing (already open) and a tap on a
 * touchscreen — which never sets `hover` (gated to `pointerType==="mouse"`)
 * — toggles cleanly on `click` alone.
 */
type TipState = { hover: boolean; click: boolean; focus: boolean };
type TipAction =
  | { type: "hover" | "focus"; value: boolean }
  | { type: "toggleClick" }
  | { type: "closeAll" };

function tipReducer(state: TipState, action: TipAction): TipState {
  switch (action.type) {
    case "hover":
      return { ...state, hover: action.value };
    case "focus":
      return { ...state, focus: action.value };
    case "toggleClick":
      return { ...state, click: !state.click };
    case "closeAll":
      return { hover: false, click: false, focus: false };
  }
}

/**
 * Shared open/dismiss state for the tap-friendly tooltip primitives below
 * (issue #60: `title=` is invisible on touch — no hover). Opens on tap/click
 * or Enter/Space (toggles independently of hover — see {@link TipState}), and
 * shows on hover/focus for desktop convenience. Dismisses on tap-outside,
 * Escape, or blur/mouseleave for those respective sources. One tip open at a
 * time is enough — no global registry.
 */
function useTipState() {
  const [state, dispatch] = useReducer(tipReducer, { hover: false, click: false, focus: false });
  const open = state.hover || state.click || state.focus;
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: globalThis.PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        dispatch({ type: "closeAll" });
      }
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "closeAll" });
    };
    // The bubble is `position: fixed`, positioned once (on open) from the
    // trigger's rect — see useClampedPosition. It doesn't track the trigger
    // as the page scrolls, so leaving it open through a scroll would let it
    // drift away from the thing it's annotating. Closing on scroll (capture:
    // true so this also catches scroll on a nested scrollable container, not
    // just the window) is simpler than re-measuring on every scroll tick and
    // matches how transient tooltips normally behave.
    const onScroll = () => dispatch({ type: "closeAll" });
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const triggerProps = {
    onPointerEnter: (e: PointerEvent) => {
      if (e.pointerType === "mouse") dispatch({ type: "hover", value: true });
    },
    onPointerLeave: (e: PointerEvent) => {
      if (e.pointerType === "mouse") dispatch({ type: "hover", value: false });
    },
    onFocus: () => dispatch({ type: "focus", value: true }),
    onBlur: () => dispatch({ type: "focus", value: false }),
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      dispatch({ type: "toggleClick" });
    },
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        dispatch({ type: "toggleClick" });
      }
    },
  };

  return { open, rootRef, triggerProps };
}

/**
 * Positions an open bubble in the viewport, clamped so it's never clipped.
 *
 * The bubble is `position: fixed` (not `absolute` inside the `position:
 * relative` trigger) specifically so ancestor `overflow: hidden` containers
 * — e.g. `.prestige-class-list`, `.granted-feats` (rounded-corner clipping) —
 * can't truncate it. `fixed` escapes every ancestor's clipping/scrolling
 * box, at the cost of needing to compute coordinates from the trigger's
 * `getBoundingClientRect()` in viewport space instead of relying on CSS
 * `top: 100%` percentages against the trigger. Measures after layout (so the
 * bubble's real rendered size is known) and nudges it horizontally off its
 * default trigger-centered position, or flips it above the trigger, rather
 * than letting it overflow the viewport edge. (See useTipState's `onScroll`
 * for why a fixed bubble is safe to leave un-tracked while open.)
 */
function useClampedPosition(
  open: boolean,
  bubbleRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const el = bubbleRef.current;
    const trigger = triggerRef.current;
    if (!open || !el || !trigger) return;
    const margin = 8;
    const triggerRect = trigger.getBoundingClientRect();
    el.style.position = "fixed";
    el.style.left = `${triggerRect.left + triggerRect.width / 2}px`;
    el.style.top = `${triggerRect.bottom + margin}px`;
    el.style.bottom = "auto";
    el.style.transform = "translateX(-50%)";
    const rect = el.getBoundingClientRect();
    let shiftX = 0;
    if (rect.left < margin) shiftX = margin - rect.left;
    else if (rect.right > window.innerWidth - margin)
      shiftX = window.innerWidth - margin - rect.right;
    let translate = `translateX(calc(-50% + ${shiftX}px))`;
    if (rect.bottom > window.innerHeight - margin) {
      // Flip above the trigger: anchor at its top edge and translate the
      // bubble fully back over itself, mirroring the below-trigger case.
      el.style.top = `${triggerRect.top - margin}px`;
      translate += " translateY(-100%)";
    }
    el.style.transform = translate;
  }, [open, bubbleRef, triggerRef]);
}

function TipBubble({
  id,
  content,
  bubbleRef,
}: {
  id: string;
  content: ReactNode;
  bubbleRef: RefObject<HTMLSpanElement>;
}) {
  return (
    <span role="tooltip" id={id} ref={bubbleRef} className="info-tip-bubble">
      {content}
    </span>
  );
}

/**
 * A tap-friendly info trigger: wraps `children` (the visible label/badge/icon)
 * and reveals `content` in a small popover on click/tap, Enter/Space, or
 * hover/focus. Use for load-bearing info that previously lived only in a
 * `title=` attribute on a non-interactive element (badges, chip breakdowns,
 * warning explanations) — invisible on touch devices with no hover.
 *
 * Don't nest this inside another interactive element (e.g. a toggle
 * `<button>`) — the trigger renders `role="button"`, and nested interactive
 * controls both break the HTML content model and cause click events to
 * bubble into the outer control. For info attached to an already-interactive
 * control (a disabled button explaining why), use {@link TipButton} instead.
 */
export function InfoTip({
  content,
  children,
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { open, rootRef, triggerProps } = useTipState();
  const bubbleRef = useRef<HTMLSpanElement>(null);
  useClampedPosition(open, bubbleRef, rootRef);
  const id = useId();

  return (
    <span
      ref={rootRef as RefObject<HTMLSpanElement>}
      className={`info-tip${className ? ` ${className}` : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-describedby={open ? id : undefined}
      {...triggerProps}
    >
      {children}
      {open ? <TipBubble id={id} content={content} bubbleRef={bubbleRef} /> : null}
    </span>
  );
}

/**
 * A `<button>` that, when `disabled` with a `disabledReason`, stays tappable
 * and focusable (via `aria-disabled` rather than the native `disabled`
 * attribute — which browsers exclude from focus/click entirely) so touch
 * users can reveal *why* it's disabled instead of getting silence. Tapping
 * only opens the reason; it never fires `onClick`. When enabled, this is a
 * plain button — `onClick` fires normally and `title` (if given) is a native
 * tooltip for desktop hover, same as before.
 *
 * Matches the shape already used across the app: `disabled={cond} title={cond
 * ? reason : undefined}`. Swap in `disabledReason={reason}` alongside it.
 */
export function TipButton({
  disabled,
  disabledReason,
  title,
  className,
  onClick,
  children,
  ...rest
}: {
  disabled?: boolean;
  disabledReason?: ReactNode;
  title?: string;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "disabled" | "title" | "className" | "onClick" | "children" | "type"
>) {
  const { open, rootRef, triggerProps } = useTipState();
  const bubbleRef = useRef<HTMLSpanElement>(null);
  useClampedPosition(open, bubbleRef, rootRef);
  const id = useId();

  if (disabled && disabledReason != null) {
    return (
      <span ref={rootRef as RefObject<HTMLSpanElement>} className="info-tip-wrap">
        <button
          type="button"
          className={className}
          aria-disabled="true"
          aria-describedby={open ? id : undefined}
          {...triggerProps}
          {...rest}
        >
          {children}
        </button>
        {open ? <TipBubble id={id} content={disabledReason} bubbleRef={bubbleRef} /> : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      title={title}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
