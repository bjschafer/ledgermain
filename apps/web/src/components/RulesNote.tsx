import { stripNoteMarkup } from "../model/rulesNotes.js";
import { useInlineRolls } from "../state/rollData.js";

/**
 * One "apply this by hand" reminder line — the `ⓘ …` hint row every picker
 * renders under a selected entry. Routes the text through the inline-roll
 * resolver so a vendored note's `[[5 + @attributes.hd.total]]` reads as the
 * character's actual number instead of raw Foundry syntax, and through
 * `stripNoteMarkup` so the HTML emphasis a few source notes carry doesn't
 * print as literal tags.
 *
 * `retiredBy`, when given, marks the note as struck through with a "retired
 * by X" cue instead of dropping it — same visual language as
 * `Provenance`/`ClassFeaturesList`'s `.struck` for an overridden bonus or a
 * swapped-out class feature, so a note an active alternate racial trait has
 * replaced doesn't just silently vanish mid-session.
 *
 * `appliedTo`, when given, names the sheet surface the note's bonus already
 * lands on ("saves", "touch AC") and swaps the `ⓘ` for a `✓`: the promotion
 * tables (see `@pf1/engine`'s `noteAppliedSurface`) turn some of these notes
 * into a real structured bonus, and a note whose WHOLE benefit is a number
 * should stop reading as a manual reminder — the text stays (it's still
 * useful table talk), only the affordance changes. Ignored when `retiredBy`
 * is set; a retired note is never applied regardless.
 */
export function RulesNote({
  text,
  retiredBy,
  appliedTo,
}: {
  text: string;
  retiredBy?: string;
  appliedTo?: string;
}) {
  const resolve = useInlineRolls();
  const line = stripNoteMarkup(resolve(text));
  if (retiredBy) {
    return (
      <div className="hint struck" style={{ marginTop: 2 }} title={`Retired by ${retiredBy}`}>
        ⓘ {line} (retired by {retiredBy})
      </div>
    );
  }
  if (appliedTo) {
    return (
      <div
        className="hint applied"
        style={{ marginTop: 2 }}
        title={`This bonus is already added to your ${appliedTo}`}
      >
        ✓ {line} (applied to your {appliedTo})
      </div>
    );
  }
  return (
    <div className="hint" style={{ marginTop: 2 }}>
      ⓘ {line}
    </div>
  );
}
