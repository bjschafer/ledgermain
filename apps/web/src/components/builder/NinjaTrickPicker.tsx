import { useMemo, useState } from "react";

import { mergedNinjaTrickCatalog } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  chosenNinjaTrickCount,
  expectedNinjaTrickCount,
  ninjaLevel as getNinjaLevel,
  ninjaTricksNeedWarning,
  toggleNinjaTrick,
} from "../../model/ninjaTricks.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface NinjaTrickPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

const TIER_LABEL: Record<string, string> = { trick: "Trick", master: "Master Trick" };

/**
 * Ninja trick selection (issue #65 wave B), mirroring `HexPicker` — tricks
 * are a flat picker over every trick the ninja's current level makes at
 * least soft-available. Gained at 2nd level and every two levels
 * thereafter; see `model/ninjaTricks.ts`'s budget math. Free-choice, never
 * blocks past the expected count — same hybrid-prereqs posture as
 * `HexPicker`.
 *
 * Master tricks (10th level) are soft-filtered by `minLevel` exactly like a
 * witch major/grand hex's own higher minimum — below-level master tricks
 * stay pickable, just annotated, never disabled; they're chosen "in place
 * of" a normal trick pick RAW, not counted as extra budget (see
 * `ninja-tricks.ts`'s doc comment).
 *
 * Picked tricks also show up in the sheet's Class Features list (tagged
 * "— Ninja Trick"), via `collectGrantedFeatures`/`resolveClassFeatures` in
 * `@pf1/engine` `archetypes.ts`.
 *
 * Browses the FULL published catalog (`mergedNinjaTrickCatalog` — issue #74
 * Phase 3b), not just the 44-entry hand-verified slice — every ninja trick
 * (hand-authored or vendored-only) is `displayOnly` (no flat always-on
 * number, see `ninja-tricks.ts`'s doc comment), so unlike `RagePowerPicker`
 * there is no "M" (modeled) badge to show here.
 */
export function NinjaTrickPicker({ doc, refData, update }: NinjaTrickPickerProps) {
  const isNinja = doc.identity.classes.some((c) => c.tag === "ninja");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:NinjaTricks", false);

  const selected = useMemo(() => new Set(doc.build.ninjaTricks ?? []), [doc.build.ninjaTricks]);
  const level = getNinjaLevel(doc);
  const catalog = useMemo(() => mergedNinjaTrickCatalog(refData), [refData]);

  const tricks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.minLevel - b.minLevel || a.name.localeCompare(b.name);
      });
  }, [catalog, query, selected]);

  const chosen = chosenNinjaTrickCount(doc);
  const expected = expectedNinjaTrickCount(doc, refData);
  const warn = ninjaTricksNeedWarning(doc, refData);
  const countClass = warn ? "hint warn-over" : "hint";

  if (!isNinja) return null;

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
          Ninja Tricks
          <span
            className={countClass}
            title={
              warn
                ? "More tricks chosen than the UC progression (2nd level and every two levels thereafter, plus Extra Ninja Trick feats) grants"
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
            Pick tricks as you level (2nd, 4th, 6th, …; +1 per Extra Ninja Trick feat). Master
            tricks unlock at 10th, chosen in place of a normal trick — Ultimate Combat tricks only.
            Free-choice — never blocks past the expected count.
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search tricks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {tricks.map((t) => {
              const isSel = selected.has(t.id);
              const belowLevel = level > 0 && level < t.minLevel;
              return (
                <div key={t.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {t.name}
                      {t.nameSuffix ? ` ${t.nameSuffix}` : ""}{" "}
                      <span className="tag-mystery">{TIER_LABEL[t.tier] ?? t.tier}</span>
                    </div>
                    <div className="preq">
                      <span className="desc-text">{t.summary}</span>
                    </div>
                    {belowLevel && (
                      <div className="hint" style={{ marginTop: 2 }}>
                        ⚠ Requires ninja {t.minLevel}
                        {t.minLevel === 2 ? "nd" : "th"} (currently {level})
                      </div>
                    )}
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
                    onClick={() => update((d) => toggleNinjaTrick(d, t.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {tricks.length === 0 ? <div className="empty">No tricks match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}
