import { BookIcon } from "./icons.js";

/**
 * Masthead link out to the companion reference site (`apps/reference`) — the
 * lookup half of the product, for reading a spell or feat you don't have on
 * your sheet. Opens in a new tab so an in-play sheet, live session state and
 * all, is never navigated away from mid-lookup.
 *
 * The only place in `apps/web` that knows where the reference site lives,
 * mirroring `sync/config.ts`'s convention; the env override is for pointing a
 * local `apps/reference` dev server at a local app.
 */
function referenceSiteUrl(): string {
  const raw = import.meta.env.VITE_REFERENCE_URL as string | undefined;
  return raw?.trim() || "https://ref.ledgermain.whizkid.dev/";
}

export function ReferenceLink() {
  return (
    <a
      className="btn-ghost ref-link"
      href={referenceSiteUrl()}
      target="_blank"
      rel="noopener noreferrer"
      title="Look up spells, feats, gear, and conditions (opens in a new tab)"
      // The label is hidden on phones (styles.css), where the glyph alone
      // would otherwise leave this control unnamed.
      aria-label="Reference site"
    >
      <BookIcon />
      <span className="ref-link-label">Reference</span>
    </a>
  );
}
