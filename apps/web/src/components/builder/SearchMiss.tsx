import { feedbackEnabled } from "../../feedback/config.js";
import { buildSearchMissDraft } from "../../model/feedback.js";
import { escapeHatchFor, pickerLabel, type SearchMissPicker } from "../../model/searchMiss.js";
import { requestFeedbackPrefill } from "../../state/feedbackPrefill.js";

/**
 * Shared empty-search affordance (issue #88). Content gaps are inevitable
 * (3rd-party material, subdomains, later-splat options — see the "What's not
 * covered" note in Settings); today a picker search that misses just shows
 * nothing, so a player can't tell "not covered yet" from "the app is
 * broken". Renders in place of the plain "No X match." empty state whenever
 * the miss followed an actual typed query — quiet, muted styling matching
 * the existing `.empty` idiom, with up to two affordances: report the gap
 * (only when the feedback form is actually configured — see
 * `feedback/config.ts`) and, where the category has one, a pointer to its
 * homebrew/custom-entry door.
 */
export function SearchMiss({ query, picker }: { query: string; picker: SearchMissPicker }) {
  const hatch = escapeHatchFor(picker);
  return (
    <div className="empty search-miss">
      <p>No matches for &ldquo;{query}&rdquo; — it may not be in Ledgermain yet.</p>
      <div className="search-miss-actions">
        {feedbackEnabled() && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => requestFeedbackPrefill(buildSearchMissDraft(query, pickerLabel(picker)))}
          >
            Report this gap
          </button>
        )}
        {hatch && <span className="hint">{hatch}</span>}
      </div>
    </div>
  );
}
