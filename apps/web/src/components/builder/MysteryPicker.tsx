import { useMemo } from "react";

import { mergedOracleMysteryCatalog } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { oracleMysteryChoice, setOracleMystery, setOracleMysteryChoice } from "../../model/doc.js";
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
 * Browses the FULL published mystery catalog (`mergedOracleMysteryCatalog`).
 * All 34 published mysteries carry hand-verified class-skill/bonus-spell
 * mechanics (marked `badge-modeled` "M") and their own revelation pick lists
 * in the Revelations panel below; a vendored-only mystery (one a future data
 * bump adds before the hand table catches up) would show its full vendored
 * prose instead. A mystery that RAW gives a choose-one made at selection time
 * (Dragon's associated element) shows that dropdown here — the pick is stored
 * in `pickChoices["oracleMystery:<tag>"]` and read by the revelations keyed
 * off it.
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
            hand-verified class skills/bonus spells, the rest show their full published prose,
            revelations included. Free-choice, no divine-calling validation.
          </p>
          <select
            className="mystery-select"
            value={chosen}
            onChange={(e) => update((d) => setOracleMystery(d, e.target.value || null))}
          >
            <option value="">None chosen</option>
            {catalog.map((m) => (
              <option key={m.tag} value={m.tag}>
                {m.name}
                {m.displayOnly ? "" : " (M)"}
              </option>
            ))}
          </select>

          {mysteryDef?.choice ? (
            // Mystery-level choose-one (RAW: made when the mystery is
            // selected — the Dragon mystery's associated element). Stored in
            // pickChoices["oracleMystery:<tag>"]; revelations keyed off it
            // (Draconic Resistance) apply nothing until one is chosen.
            <label className="hint" style={{ marginTop: 4, display: "block" }}>
              {mysteryDef.choice.label}:{" "}
              <select
                value={oracleMysteryChoice(doc, mysteryDef.tag) ?? ""}
                onChange={(e) =>
                  update((d) =>
                    setOracleMysteryChoice(d, mysteryDef.tag, e.target.value || undefined),
                  )
                }
              >
                <option value="">Choose…</option>
                {mysteryDef.choice.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

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
