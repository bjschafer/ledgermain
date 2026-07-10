import type {
  ButtonHTMLAttributes,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  RefObject,
} from "react";
import { useEffect, useId, useLayoutEffect, useReducer, useRef } from "react";
import { createPortal } from "react-dom";

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
  // Owned here (not by the component) because the outside-tap check below
  // must consult it: the bubble is portaled to document.body (see TipBubble),
  // so it is *not* a DOM descendant of rootRef — without the second contains()
  // a tap inside the bubble (e.g. selecting its text) would read as "outside"
  // and dismiss it.
  const bubbleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: globalThis.PointerEvent) => {
      const target = e.target as Node;
      const inTrigger = rootRef.current?.contains(target) ?? false;
      const inBubble = bubbleRef.current?.contains(target) ?? false;
      if (!inTrigger && !inBubble) dispatch({ type: "closeAll" });
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

  return { open, rootRef, bubbleRef, triggerProps };
}

/**
 * Positions an open bubble in the viewport, clamped so it's never clipped.
 *
 * The bubble is `position: fixed` *and* portaled to `document.body` (see
 * {@link TipBubble}) — both halves are needed to fully escape ancestors.
 * `fixed` alone defeats ancestor `overflow: hidden` clipping (e.g.
 * `.prestige-class-list`, `.granted-feats`, which clip for border-radius),
 * but an ancestor with `opacity < 1` (e.g. `.pick-row.is-blocked`) still
 * creates a stacking context that would trap the bubble under later sibling
 * rows and tint it translucent; the portal moves the bubble's paint layer
 * out of that subtree entirely. The cost is computing coordinates from the
 * trigger's `getBoundingClientRect()` in viewport space instead of relying
 * on CSS `top: 100%` percentages against the trigger. Measures after layout
 * (so the bubble's real rendered size is known) and nudges it horizontally
 * off its default trigger-centered position, or flips it above the trigger,
 * rather than letting it overflow the viewport edge. (See useTipState's
 * `onScroll` for why a fixed bubble is safe to leave un-tracked while open.)
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

/**
 * Portaled to `document.body` so no ancestor stacking context (opacity,
 * transform, …) or overflow clip can affect how the bubble paints — see
 * {@link useClampedPosition} for the positioning half of that escape.
 * `aria-describedby` still resolves (it's an ID lookup, not a tree walk),
 * and useTipState's outside-tap dismissal checks bubbleRef explicitly since
 * the bubble is no longer inside rootRef's DOM subtree.
 */
function TipBubble({
  id,
  content,
  bubbleRef,
}: {
  id: string;
  content: ReactNode;
  bubbleRef: RefObject<HTMLSpanElement>;
}) {
  return createPortal(
    <span role="tooltip" id={id} ref={bubbleRef} className="info-tip-bubble">
      {content}
    </span>,
    document.body,
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
  const { open, rootRef, bubbleRef, triggerProps } = useTipState();
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
  const { open, rootRef, bubbleRef, triggerProps } = useTipState();
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
