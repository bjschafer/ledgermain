import { useMemo } from "react";

import { mergedOracleMysteryCatalog } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setOracleMystery } from "../../model/doc.js";
import { SKILL_NAMES } from "../../model/names.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

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
 * Browses the FULL published mystery catalog (`mergedOracleMysteryCatalog`,
 * issue #74 Phase 3c) — the 10 Advanced Player's Guide "core" mysteries
 * (Battle, Bones, Flame, Heavens, Life, Lore, Nature, Stone, Waves, Wind)
 * keep their hand-verified class-skill/bonus-spell mechanics (marked
 * `badge-modeled` "M"); the ~24 other vendored-only mysteries (Ancestor,
 * Apocalypse, Dragon, Lunar, ...) show their full vendored prose instead,
 * including revelations — which are NOT modeled as discrete picks anywhere
 * in this app (see `@pf1/schema` `OracleMystery`'s doc comment); a mystery's
 * Revelations panel below only lists picks for the 10 core mysteries.
 */
export function MysteryPicker({ doc, refData, update }: MysteryPickerProps) {
  const isOracle = doc.identity.classes.some((c) => c.tag === "oracle");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Mystery", false);

  const catalog = useMemo(
    () => [...mergedOracleMysteryCatalog(refData)].sort((a, b) => a.name.localeCompare(b.name)),
    [refData],
  );

  const chosen = doc.build.oracleMystery ?? "";
  const mysteryDef = catalog.find((m) => m.tag === chosen);

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
          {mysteryDef ? (
            <span className="hint">
              {" "}
              · {mysteryDef.name}
              {!mysteryDef.displayOnly && <span className="badge-modeled"> M</span>}
            </span>
          ) : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint mystery-picker-hint">
            Pick one mystery (PF1 grants one at level 1, never changed thereafter). Browses the full
            published catalog; entries marked <span className="badge-modeled">M</span> carry
            hand-verified class skills/bonus spells — the rest show their full published prose,
            revelations included. Free-choice — no divine-calling validation.
          </p>
          <select
            className="mystery-select"
            value={chosen}
            onChange={(e) => update((d) => setOracleMystery(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {catalog.map((m) => (
              <option key={m.tag} value={m.tag}>
                {m.name}
                {m.displayOnly ? "" : " (M)"}
              </option>
            ))}
          </select>

          {mysteryDef &&
            (mysteryDef.displayOnly ? (
              mysteryDef.description ? (
                <FeatureDescription html={mysteryDef.description} />
              ) : null
            ) : (
              <div className="mystery-preview">
                <div className="mystery-class-skills">
                  <span className="hint">Bonus Class Skills</span>
                  <p>
                    {mysteryDef.classSkills.map((id) => SKILL_NAMES[id] ?? id).join(", ") || "—"}
                  </p>
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
            ))}
        </>
      )}
    </div>
  );
}
