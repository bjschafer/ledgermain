import { stripNoteMarkup } from "../model/rulesNotes.js";
import { useInlineRolls } from "../state/rollData.js";

/**
 * One "apply this by hand" reminder line — the `ⓘ …` hint row every picker
 * renders under a selected entry. Callers drop notes `noteCoverage` reports
 * as "full": their bonus is already on the stat, so the line adds nothing.
 * Routes the text through the inline-roll
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
 */
export function RulesNote({ text, retiredBy }: { text: string; retiredBy?: string }) {
  const resolve = useInlineRolls();
  const line = stripNoteMarkup(resolve(text));
  if (retiredBy) {
    return (
      <div className="hint struck" style={{ marginTop: 2 }} title={`Retired by ${retiredBy}`}>
        ⓘ {line} (retired by {retiredBy})
      </div>
    );
  }
  return (
    <div className="hint" style={{ marginTop: 2 }}>
      ⓘ {line}
    </div>
  );
}
