import { useMemo, useState } from "react";

import { ROGUE_TALENTS, ROGUE_TALENT_IDS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenRogueTalentCount,
  expectedRogueTalentCount,
  hasRogueTalent,
  rogueTalentsNeedWarning,
  toggleRogueTalent,
} from "../../model/rogueTalents.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface RogueTalentPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Rogue talent selection (issue #65), SHARED between the chained rogue and
 * Rogue (Unchained) — mirrors `HexPicker`'s flat-list shape. Most talents
 * are `displayOnly`; "Combat Trick" and "Finesse Rogue" carry a real
 * mechanical grant (a bonus-feat slot / Weapon Finesse outright — see
 * `@pf1/engine` `rogue-talents.ts`'s doc comment) auto-applied through
 * `apps/web/src/model/feats.ts`, so those two rows are annotated instead of
 * showing a "no automatic effect" note. Entries flagged `unchainedOnly`
 * (reference Debilitating Injury) are soft-noted, never hidden, for a
 * chained-rogue picker. Free-choice, never blocks past the expected count.
 */
export function RogueTalentPicker({ doc, refData, update }: RogueTalentPickerProps) {
  const isRogue = doc.identity.classes.some((c) => c.tag === "rogue" || c.tag === "rogueUnchained");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Rogue Talents", false);

  const selected = useMemo(() => new Set(doc.build.rogueTalents ?? []), [doc.build.rogueTalents]);

  const talents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ROGUE_TALENT_IDS.map((id) => ROGUE_TALENTS[id]!)
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [query, selected]);

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
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint revelation-picker-hint">
            Pick a talent at 2nd level and every 2 levels thereafter (+1 per Extra Rogue Talent
            feat). "Combat Trick" grants a bonus combat feat slot; "Finesse Rogue" grants Weapon
            Finesse outright — both apply automatically. Every other talent is a reminder only.
            Free-choice — never blocks past the expected count.
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
              return (
                <div key={t.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {t.name}
                      {t.unchainedOnly ? <span className="tag-mystery">Unchained</span> : null}
                      {t.bonusFeatSlot || t.grantsFeat ? (
                        <span className="tag-mystery">Grants a feat</span>
                      ) : null}
                    </div>
                    <div className="preq">
                      <span className="desc-text">{t.summary}</span>
                    </div>
                    {t.contextNotes?.map((n, i) => (
                      <div key={i} className="hint" style={{ marginTop: 2 }}>
                        ⚠ {n.text}
                      </div>
                    ))}
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
