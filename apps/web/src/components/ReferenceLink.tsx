import { referenceSiteUrl } from "../model/referenceSite.js";
import { BookIcon } from "./icons.js";

/**
 * Masthead link out to the companion reference site (`apps/reference`) — the
 * lookup half of the product, for reading a spell or feat you don't have on
 * your sheet. Opens in a new tab so an in-play sheet, live session state and
 * all, is never navigated away from mid-lookup.
 */
export function ReferenceLink() {
  return (
    <a
      className="btn-ghost ref-link"
      href={referenceSiteUrl()}
      target="_blank"
      rel="noopener noreferrer"
      title="Look up spells, feats, gear, monsters, and conditions (opens in a new tab)"
      // The label is hidden on phones (styles.css), where the glyph alone
      // would otherwise leave this control unnamed.
      aria-label="Reference site"
    >
      <BookIcon />
      <span className="ref-link-label">Reference</span>
    </a>
  );
}
