import { useState } from "react";

import {
  getPreviewNoticeDismissed,
  setPreviewNoticeDismissed,
  shouldShowPreviewNotice,
} from "../model/previewNotice.js";
import { apiBaseUrl } from "../sync/config.js";

/** One-time disclaimer shown on deployed (non-localhost) builds. */
export function PreviewNotice() {
  const [dismissed, setDismissed] = useState(getPreviewNoticeDismissed);

  if (!shouldShowPreviewNotice(window.location.hostname, dismissed)) return null;

  const dismiss = () => {
    setPreviewNoticeDismissed();
    setDismissed(true);
  };

  // Without an API configured there's genuinely nowhere to sync to, so the
  // stronger "this browser only" warning is still the honest one.
  const syncEnabled = apiBaseUrl() !== undefined;

  return (
    <div className="preview-notice-backdrop" role="presentation">
      <div className="preview-notice" role="alertdialog" aria-labelledby="preview-notice-title">
        <div id="preview-notice-title" className="preview-notice-title">
          ⚠ Preview build
        </div>
        {syncEnabled ? (
          <p>
            Ledgermain is under active development. Your characters are saved{" "}
            <strong>in this browser</strong> until you sign in. Signing in (top right) backs them up
            and syncs them to your other devices; without it, clearing site data or switching
            devices loses them for good.
          </p>
        ) : (
          <p>
            Ledgermain is under active development. Everything is saved{" "}
            <strong>locally in this browser only</strong>, with no account, no sync, and no backup.
            Clearing site data or switching devices loses it for good, so don't track anything here
            you'd be upset to lose.
          </p>
        )}
        <p>
          A pre-built sample character is included in the character picker (top right) if you'd like
          to poke around before building your own.
        </p>
        <button type="button" className="btn-ghost" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
