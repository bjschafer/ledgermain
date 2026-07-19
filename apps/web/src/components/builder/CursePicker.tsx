import { useMemo } from "react";

import { ORACLE_CURSES, ORACLE_CURSE_TAGS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setOracleCurse } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface CursePickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Oracle's curse selection (PF1 grants exactly one, chosen at L1, never
 * changed thereafter). Free-choice, soft-warning posture, mirrors
 * `MysteryPicker`. Scope: the 6 base Advanced Player's Guide curses
 * (Clouded Vision, Deaf, Haunted, Lame, Tongues, Wasting) — see `@pf1/engine`
 * `oracle-curses.ts`'s doc comment. Most curses are display-only tiered
 * prose; Wasting (-4 Cha-based skills) and Lame (variable land-speed
 * penalty) apply a real numeric `Change` via `collectModifiers`.
 */
export function CursePicker({ doc, refData, update }: CursePickerProps) {
  const isOracle = doc.identity.classes.some((c) => c.tag === "oracle");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Curse", false);

  const curses = useMemo(() => [...ORACLE_CURSE_TAGS].sort(), []);

  const chosen = doc.build.oracleCurse ?? "";
  const curseDef = ORACLE_CURSES[chosen];

  if (!isOracle) return null;

  return (
    <div className="subsection curse-picker">
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
          Curse
          {curseDef ? <span className="hint"> · {curseDef.name}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint curse-picker-hint">
            Pick one curse (PF1 grants one at level 1, never changed thereafter). Free-choice — no
            validation.
          </p>
          <select
            className="curse-select"
            value={chosen}
            onChange={(e) => update((d) => setOracleCurse(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {curses.map((tag) => (
              <option key={tag} value={tag}>
                {ORACLE_CURSES[tag]?.name ?? tag}
              </option>
            ))}
          </select>

          {curseDef && (
            <div className="curse-preview">
              <p>{curseDef.summary}</p>
              {curseDef.bonusSpells && curseDef.bonusSpells.length > 0 && (
                <ul className="curse-bonus-spells">
                  {curseDef.bonusSpells.map((sp) => (
                    <li key={sp.id}>
                      <span className="cf-level">Oracle Lv {sp.level}</span>{" "}
                      <span className="cf-name">{refData.spells[sp.id]?.name ?? sp.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
