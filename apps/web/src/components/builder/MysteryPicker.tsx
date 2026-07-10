import { useMemo } from "react";

import { ORACLE_MYSTERIES, ORACLE_MYSTERY_TAGS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setOracleMystery } from "../../model/doc.js";
import { SKILL_NAMES } from "../../model/names.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface MysteryPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Oracle mystery selection (PF1 grants exactly one, chosen at L1, never
 * changed thereafter). Free-choice: the vendored data has no oracle-heritage
 * mapping, so validation is "soft warning only" per the project's
 * hybrid-prereqs philosophy — mirrors `BloodlinePicker`.
 *
 * Scope: the 10 Advanced Player's Guide "core" mysteries (Battle, Bones,
 * Flame, Heavens, Life, Lore, Nature, Stone, Waves, Wind) — see
 * `@pf1/engine` `oracle-mysteries.ts`'s doc comment. Revelations (the
 * mystery's menu of choosable powers) are NOT modeled.
 *
 * The chosen mystery grants one bonus spell known at oracle level 2 and
 * every two levels thereafter (see `model/spellcasting.mysterySpellsKnown`,
 * surfaced in the Spells section/tracker) plus a handful of bonus class
 * skills (display-only — see `ORACLE_MYSTERIES`'s doc comment for why
 * that isn't wired into the derived skill list).
 */
export function MysteryPicker({ doc, refData, update }: MysteryPickerProps) {
  const isOracle = doc.identity.classes.some((c) => c.tag === "oracle");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Mystery", false);

  const mysteries = useMemo(() => [...ORACLE_MYSTERY_TAGS].sort(), []);

  const chosen = doc.build.oracleMystery ?? "";
  const mysteryDef = ORACLE_MYSTERIES[chosen];

  if (!isOracle) return null;

  return (
    <div className="subsection mystery-picker">
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
          Mystery
          {mysteryDef ? <span className="hint"> · {mysteryDef.name}</span> : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint mystery-picker-hint">
            Pick one mystery (PF1 grants one at level 1, never changed thereafter). It grants one
            bonus spell known at oracle level 2 and every two levels thereafter, plus bonus class
            skills. Free-choice — no divine-calling validation. Revelations (the mystery's own menu
            of powers) aren't modeled here yet.
          </p>
          <select
            className="mystery-select"
            value={chosen}
            onChange={(e) => update((d) => setOracleMystery(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {mysteries.map((tag) => (
              <option key={tag} value={tag}>
                {ORACLE_MYSTERIES[tag]?.name ?? tag}
              </option>
            ))}
          </select>

          {mysteryDef && (
            <div className="mystery-preview">
              <div className="mystery-class-skills">
                <span className="hint">Bonus Class Skills</span>
                <p>{mysteryDef.classSkills.map((id) => SKILL_NAMES[id] ?? id).join(", ") || "—"}</p>
              </div>
              <ul className="mystery-bonus-spells">
                {mysteryDef.bonusSpells.map((sp) => (
                  <li key={sp.id}>
                    <span className="cf-level">Oracle Lv {sp.level}</span>{" "}
                    <span className="cf-name">{refData.spells[sp.id]?.name ?? sp.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
