import { useState } from "react";

import {
  getPreviewNoticeDismissed,
  setPreviewNoticeDismissed,
  shouldShowPreviewNotice,
} from "../model/previewNotice.js";

/** One-time disclaimer shown on deployed (non-localhost) builds. */
export function PreviewNotice() {
  const [dismissed, setDismissed] = useState(getPreviewNoticeDismissed);

  if (!shouldShowPreviewNotice(window.location.hostname, dismissed)) return null;

  const dismiss = () => {
    setPreviewNoticeDismissed();
    setDismissed(true);
  };

  return (
    <div className="preview-notice-backdrop" role="presentation">
      <div
        className="preview-notice"
        role="alertdialog"
        aria-labelledby="preview-notice-title"
      >
        <div id="preview-notice-title" className="preview-notice-title">
          ⚠ Preview build
        </div>
        <p>
          Ledgermain is under active development. Everything is saved{" "}
          <strong>locally in this browser only</strong> — there's no account,
          no sync, and no backup. Clearing site data or switching devices
          loses it for good, so don't track anything here you'd be upset to
          lose.
        </p>
        <p>
          A pre-built sample character is included in the character picker
          (top right) if you'd like to poke around before building your own.
        </p>
        <button type="button" className="btn-ghost" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
