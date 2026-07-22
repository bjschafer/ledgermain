import { useMemo, useState } from "react";

import { isAdvancedSlayerTalent, slayerTalentCatalog } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenSlayerTalentCount,
  expectedSlayerTalentCount,
  hasSlayerTalent,
  slayerLevel as getSlayerLevel,
  slayerTalentsNeedWarning,
  toggleSlayerTalent,
} from "../../model/slayerTalents.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface SlayerTalentPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Slayer talent selection (issue #74 Phase 3b) — slayer only. UNLIKE
 * `RogueTalentPicker`/`NinjaTrickPicker`/`VigilanteTalentPicker`, there is no
 * hand-authored mechanics table here: browses the full vendored catalog
 * (`slayerTalentCatalog`) straight, so no row ever carries a "M" (modeled)
 * badge today — every entry is a reminder only (see `@pf1/engine`
 * `slayer-talents.ts`'s doc comment). "Advanced" tagged entries (10th level+)
 * are chosen in place of a normal pick, same as ninja master tricks — not an
 * extra budget slot. Free-choice, never blocks past the expected count.
 */
export function SlayerTalentPicker({ doc, refData, update }: SlayerTalentPickerProps) {
  const isSlayer = doc.identity.classes.some((c) => c.tag === "slayer");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Slayer Talents", false);

  const selected = useMemo(() => new Set(doc.build.slayerTalents ?? []), [doc.build.slayerTalents]);
  const level = getSlayerLevel(doc);

  const catalog = useMemo(() => slayerTalentCatalog(refData), [refData]);

  const talents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || Number(a.advanced) - Number(b.advanced) || a.name.localeCompare(b.name);
      });
  }, [catalog, query, selected]);

  const chosen = chosenSlayerTalentCount(doc);
  const expected = expectedSlayerTalentCount(doc, refData);
  const warn = slayerTalentsNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isSlayer) return null;

  return (
    <div className="subsection magus-arcana-picker">
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
          Slayer Talents
          <span
            className={countClass}
            title={
              warn
                ? "More talents chosen than the progression (2nd level, then every 2 levels, plus Extra Slayer Talent feats) grants"
                : undefined
            }
          >
            {" "}
            · {chosen} / {expected}
          </span>
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint magus-arcana-picker-hint">
            Pick a talent at 2nd level and every 2 levels thereafter (+1 per Extra Slayer Talent
            feat). Advanced talents unlock at 10th, chosen in place of a normal talent. Browses the
            full published catalog — every entry is a reminder only (no hand-verified mechanics
            yet). Free-choice — never blocks past the expected count.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search talents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {talents.map((t) => {
              const isSel = hasSlayerTalent(doc, t.id);
              const belowLevel = level > 0 && isAdvancedSlayerTalent(t.category) && level < 10;
              return (
                <div key={t.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {t.name}
                      {t.nameSuffix ? ` ${t.nameSuffix}` : ""}
                      {t.advanced && <span className="tag-mystery">Advanced</span>}
                    </div>
                    <div className="preq">
                      <span className="desc-text">{t.summary}</span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires slayer 10th (currently {level})
                      </div>
                    )}
                    {t.description ? <FeatureDescription html={t.description} /> : null}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleSlayerTalent(d, t.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {talents.length === 0 ? <div className="empty">No talents match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}
