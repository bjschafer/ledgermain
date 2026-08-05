import { BRAWLER_STRIKE_ALIGNMENT_LEVEL, type BrawlerStrikeAlignment } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import { setBrawlerStrikeAlignment } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface BrawlerStrikePickerProps {
  doc: CharacterDoc;
  update: Updater;
}

const ALIGNMENTS: { id: BrawlerStrikeAlignment; label: string }[] = [
  { id: "chaotic", label: "Chaotic" },
  { id: "evil", label: "Evil" },
  { id: "good", label: "Good" },
  { id: "lawful", label: "Lawful" },
];

/**
 * Brawler's Strike alignment component (ACG, 12th level). Mirrors
 * `FiendishBoonPicker`'s chip shape, and unlike that one the choice drives a
 * real derived value: it's the alignment the Attacks section then shows the
 * character's unarmed strikes bypassing DR with.
 *
 * RAW the pick can't oppose the brawler's own alignment. That stays a hint
 * rather than a filter, since `identity.alignment` is a free-text code and a
 * table that has houseruled around it shouldn't find the option missing.
 */
export function BrawlerStrikePicker({ doc, update }: BrawlerStrikePickerProps) {
  const level = doc.identity.classes.find((c) => c.tag === "brawler")?.level ?? 0;
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:BrawlerStrike", false);
  if (level < BRAWLER_STRIKE_ALIGNMENT_LEVEL) return null;

  const chosen = doc.build.brawlerStrikeAlignment;
  const label = ALIGNMENTS.find((a) => a.id === chosen)?.label;

  return (
    <div className="subsection">
      <div
        className="subsection-header"
        onClick={toggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleCollapsed();
        }}
        aria-expanded={!collapsed}
      >
        <h3>
          Brawler's Strike
          {label ? <span className="hint"> · {label}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint">
            At 12th level, pick one alignment component your unarmed strikes also count as for
            getting through damage reduction. It can't be the opposite of your own alignment.
          </p>
          <div className="chips">
            {ALIGNMENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                className="chip"
                aria-pressed={chosen === a.id}
                onClick={() =>
                  update((d) => setBrawlerStrikeAlignment(d, chosen === a.id ? null : a.id))
                }
              >
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
