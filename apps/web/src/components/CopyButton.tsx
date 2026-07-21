import { useEffect, useState } from "react";

import { formulaPreview } from "../model/rollFormula.js";
import { showToast } from "../state/toast.js";
import { CheckIcon, CopyIcon } from "./icons.js";

/**
 * Write `text` to the clipboard. `navigator.clipboard` only exists in a secure
 * context, and a tablet at the table pointed at a dev box over plain http is a
 * real way this app gets used — so fall back to the old hidden-textarea
 * `execCommand` path rather than failing there.
 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the execCommand path
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copy one roll formula to the clipboard (issue #96) — the bridge between this
 * app's deliberate no-dice-roller stance and the VTT the table actually rolls
 * in. Sits in the top-right of an expanded stat's breakdown (and inline on
 * rows that don't expand), so the number you just checked is one click from
 * pasteable.
 */
export function CopyButton({
  text,
  label,
  className,
}: {
  /** The exact text placed on the clipboard, e.g. `"1d20 + 10"`. */
  text: string;
  /** What's being copied, e.g. `"Fortitude save"` — used for the accessible name and toast. */
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  // Revert the check-mark confirmation after a beat; the toast carries the
  // durable receipt, this is just the in-place acknowledgement.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      className={className ? `copy-btn ${className}` : "copy-btn"}
      data-copied={copied ? "true" : undefined}
      aria-label={`Copy ${label} to clipboard`}
      title={`Copy ${text.replace(/\n/g, " · ")}`}
      onClick={(e) => {
        // Some of these sit inside rows that toggle on click; copying should
        // never also collapse the thing you're reading.
        e.stopPropagation();
        void writeClipboard(text).then((ok) => {
          setCopied(ok);
          showToast({
            message: ok
              ? `Copied ${label} — ${formulaPreview(text)}`
              : "Couldn't reach the clipboard",
          });
        });
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}
