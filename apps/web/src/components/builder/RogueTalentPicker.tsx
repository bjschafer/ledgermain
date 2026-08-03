import { useMemo, useState } from "react";

import { mergedRogueTalentCatalog } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenRogueTalentCount,
  expectedRogueTalentCount,
  hasRogueTalent,
  rogueLevel,
  rogueTalentsNeedWarning,
  toggleRogueTalent,
} from "../../model/rogueTalents.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface RogueTalentPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Rogue talent selection, SHARED between the chained rogue and Rogue
 * (Unchained) — mirrors `HexPicker`'s flat-list shape. Most talents are
 * `displayOnly`; "Combat Trick" (bonus-feat slot) and the dozen `grantsFeat`
 * talents (Finesse Rogue's Weapon Finesse, Strong Impression's Intimidating
 * Prowess,... — see `@pf1/engine` `rogue-talents.ts`'s doc comment) are
 * auto-applied through `apps/web/src/model/feats.ts`, so those rows are
 * annotated instead of showing a "no automatic effect" note; Stony Skin
 * carries real `changes[]` (DR). Advanced talents (`minLevel` 10+) and the
 * `chainedOnly`/`unchainedOnly` list flags are soft-noted, never hidden.
 * Free-choice, never blocks past the expected count.
 *
 * Browses the full hand-authored catalog (`mergedRogueTalentCatalog`, at full
 * vendored parity since the Phase 5 extension).
 */
export function RogueTalentPicker({ doc, refData, update }: RogueTalentPickerProps) {
  const isRogue = doc.identity.classes.some((c) => c.tag === "rogue" || c.tag === "rogueUnchained");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Rogue Talents", false);

  const selected = useMemo(() => new Set(doc.build.rogueTalents ?? []), [doc.build.rogueTalents]);
  const catalog = useMemo(() => mergedRogueTalentCatalog(refData), [refData]);

  const talents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [catalog, query, selected]);

  const level = rogueLevel(doc);
  const chosen = chosenRogueTalentCount(doc);
  const expected = expectedRogueTalentCount(doc, refData);
  const warn = rogueTalentsNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isRogue) return null;

  return (
    <div className="subsection revelation-picker">
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
          Rogue Talents
          <span
            className={countClass}
            title={
              warn
                ? "More talents chosen than the progression (2nd level, then every 2 levels, plus Extra Rogue Talent feats) grants"
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
          <p className="hint revelation-picker-hint">
            Pick a talent at 2nd level and every 2 levels thereafter (+1 per Extra Rogue Talent
            feat). "Combat Trick" grants a bonus combat feat slot, talents marked "Grants a feat"
            apply their feat automatically, and Stony Skin's DR lands on the sheet: everything else
            is a reminder only. Advanced talents (10th+) and chained/Unchained-only talents are
            flagged, never hidden. Free-choice: never blocks past the expected count.
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
              const isSel = hasRogueTalent(doc, t.id);
              const belowLevel = level > 0 && level < t.minLevel;
              return (
                <div key={t.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {t.name}
                      {t.nameSuffix ? ` ${t.nameSuffix}` : ""}
                      {t.minLevel >= 10 ? <span className="tag-mystery">Advanced</span> : null}
                      {t.unchainedOnly ? <span className="tag-mystery">Unchained</span> : null}
                      {t.chainedOnly ? <span className="tag-mystery">Chained</span> : null}
                      {t.bonusFeatSlot || t.grantsFeat ? (
                        <span className="tag-mystery">Grants a feat</span>
                      ) : null}
                    </div>
                    <div className="preq">
                      <span className="desc-text">{t.summary}</span>
                    </div>
                    {belowLevel ? (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires rogue {t.minLevel}th (currently {level})
                      </div>
                    ) : null}
                    {t.contextNotes?.map((n, i) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {n.text}
                      </div>
                    ))}
                    {t.description ? <FeatureDescription html={t.description} /> : null}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleRogueTalent(d, t.id))}
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
