import { useInlineRolls } from "../state/rollData.js";

/**
 * One "apply this by hand" reminder line — the `⚠ …` hint row every picker
 * renders under a selected entry. Routes the text through the inline-roll
 * resolver so a vendored note's `[[5 + @attributes.hd.total]]` reads as the
 * character's actual number instead of raw Foundry syntax.
 */
export function RulesNote({ text }: { text: string }) {
  const resolve = useInlineRolls();
  return (
    <div className="hint" style={{ marginTop: 2 }}>
      ⚠ {resolve(text)}
    </div>
  );
}
