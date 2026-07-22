import { useMemo } from "react";

import { mergedOracleCurseCatalog } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setOracleCurse } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface CursePickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Oracle's curse selection (PF1 grants exactly one, chosen at L1, never
 * changed thereafter). Free-choice, soft-warning posture, mirrors
 * `MysteryPicker`.
 *
 * Browses the FULL published curse catalog (`mergedOracleCurseCatalog`,
 * issue #74 Phase 3c) — the 6 base Advanced Player's Guide curses (Clouded
 * Vision, Deaf, Haunted, Lame, Tongues, Wasting) keep their hand-verified
 * mechanics (marked `badge-modeled` "M"; Wasting/Lame apply a real numeric
 * `Change` via `collectModifiers`, the rest are tiered display-only prose);
 * the ~35 other vendored-only curses show their full vendored prose instead.
 */
export function CursePicker({ doc, refData, update }: CursePickerProps) {
  const isOracle = doc.identity.classes.some((c) => c.tag === "oracle");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Curse", false);

  const catalog = useMemo(
    () => [...mergedOracleCurseCatalog(refData)].sort((a, b) => a.name.localeCompare(b.name)),
    [refData],
  );

  const chosen = doc.build.oracleCurse ?? "";
  const curseDef = catalog.find((c) => c.tag === chosen);

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
          {curseDef ? (
            <span className="hint">
              {" "}
              · {curseDef.name}
              {!curseDef.displayOnly && <span className="badge-modeled"> M</span>}
            </span>
          ) : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint curse-picker-hint">
            Pick one curse (PF1 grants one at level 1, never changed thereafter). Browses the full
            published catalog; entries marked <span className="badge-modeled">M</span> carry
            hand-verified mechanics — the rest show their full published prose. Free-choice — no
            validation.
          </p>
          <select
            className="curse-select"
            value={chosen}
            onChange={(e) => update((d) => setOracleCurse(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {catalog.map((c) => (
              <option key={c.tag} value={c.tag}>
                {c.name}
                {c.displayOnly ? "" : " (M)"}
              </option>
            ))}
          </select>

          {curseDef &&
            (curseDef.displayOnly ? (
              curseDef.description ? (
                <FeatureDescription html={curseDef.description} />
              ) : null
            ) : (
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
            ))}
        </>
      )}
    </div>
  );
}
