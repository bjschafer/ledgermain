import { isHomebrewId } from "../model/homebrew.js";
import { InfoTip } from "./InfoTip.js";

const TOOLTIP_TEXT = "Homebrew — authored on this character, not part of the vendored ruleset";

/**
 * Subtle "this is homebrew, not vendored content" marker — dropped next to a
 * race/feat name wherever one renders (picker chips/rows, the live sheet
 * header, the tracker's read-only feat list). Renders nothing for a vendored
 * id, so call sites can drop it in unconditionally.
 *
 * `interactive` (default `true`) picks the tap-friendly `InfoTip` popover.
 * Set it `false` when the badge's only available slot is INSIDE another
 * interactive control (e.g. `RaceSection`'s whole-chip `<button>`) — nesting
 * `InfoTip`'s own `role="button"` trigger in there would be a real
 * nested-interactive-control violation, not just a lint nit, so that spot
 * gets a plain `<span>` with a native `title` tooltip instead.
 */
export function HomebrewBadge({ id, interactive = true }: { id: string; interactive?: boolean }) {
  if (!isHomebrewId(id)) return null;
  if (!interactive) {
    return (
      <span className="homebrew-badge" title={TOOLTIP_TEXT}>
        homebrew
      </span>
    );
  }
  return (
    <InfoTip className="homebrew-badge" content={TOOLTIP_TEXT}>
      homebrew
    </InfoTip>
  );
}
