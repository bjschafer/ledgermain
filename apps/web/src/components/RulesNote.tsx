import { useInlineRolls } from "../state/rollData.js";

/**
 * One "apply this by hand" reminder line — the `⚠ …` hint row every picker
 * renders under a selected entry. Routes the text through the inline-roll
 * resolver so a vendored note's `[[5 + @attributes.hd.total]]` reads as the
 * character's actual number instead of raw Foundry syntax.
 *
 * `retiredBy`, when given, marks the note as struck through with a "retired
 * by X" cue instead of dropping it — same visual language as
 * `Provenance`/`ClassFeaturesList`'s `.struck` for an overridden bonus or a
 * swapped-out class feature, so a note an active alternate racial trait has
 * replaced doesn't just silently vanish mid-session.
 */
export function RulesNote({ text, retiredBy }: { text: string; retiredBy?: string }) {
  const resolve = useInlineRolls();
  return (
    <div
      className={`hint${retiredBy ? " struck" : ""}`}
      style={{ marginTop: 2 }}
      title={retiredBy ? `Retired by ${retiredBy}` : undefined}
    >
      ⚠ {resolve(text)}
      {retiredBy ? ` (retired by ${retiredBy})` : ""}
    </div>
  );
}
