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
 *
 * `appliedAutomatically`, when true, swaps the `⚠` for a `✓` and adds an
 * "applied to your saves" cue: the situational-saves promotion tables (see
 * `@pf1/engine`'s `saveNoteCoverage`) turn some of these notes into a real
 * structured bonus, and a note whose WHOLE benefit is now a number should
 * stop reading as a manual reminder — the text stays (it's still useful
 * table talk), only the affordance changes. Ignored when `retiredBy` is set;
 * a retired note is never "applied automatically" regardless.
 */
export function RulesNote({
  text,
  retiredBy,
  appliedAutomatically = false,
}: {
  text: string;
  retiredBy?: string;
  appliedAutomatically?: boolean;
}) {
  const resolve = useInlineRolls();
  if (retiredBy) {
    return (
      <div className="hint struck" style={{ marginTop: 2 }} title={`Retired by ${retiredBy}`}>
        ⚠ {resolve(text)} (retired by {retiredBy})
      </div>
    );
  }
  if (appliedAutomatically) {
    return (
      <div
        className="hint applied"
        style={{ marginTop: 2 }}
        title="This bonus is already added to your saves"
      >
        ✓ {resolve(text)} (applied to your saves)
      </div>
    );
  }
  return (
    <div className="hint" style={{ marginTop: 2 }}>
      ⚠ {resolve(text)}
    </div>
  );
}
