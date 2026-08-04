import { useMemo, useState } from "react";

import { mergedWitchPatronCatalog, type MergedWitchPatronEntry } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setWitchPatron } from "../../model/doc.js";
import { patronSpellsKnown } from "../../model/spellcasting.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { Explainer } from "../Explainer.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface PatronPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

const CATEGORY_LABEL: Record<string, string> = { basic: "Basic", unique: "Unique" };

function patronSearchText(p: MergedWitchPatronEntry): string {
  return `${p.name} ${p.description ?? ""}`.toLowerCase();
}

/**
 * One-line, unleveled summary for a row that isn't the current selection — the
 * full level-ordered breakdown only renders once a row is chosen (see the
 * component doc comment). Spells are separated by `·` rather than commas
 * because a compendium spell name carries its own comma ("Cat's Grace, Mass"),
 * and a comma-joined list reads as twice as many spells as it holds.
 */
function patronRowSummary(p: MergedWitchPatronEntry): string {
  if (p.themeInfo) {
    return `Grants the ${p.themeInfo.grantedHex} hex. Themes: ${p.themeInfo.availableThemes.join(", ")}`;
  }
  if (p.bonusSpells.length > 0) {
    return p.bonusSpells.map((sp) => sp.name).join(" · ");
  }
  return "No structured bonus-spell data for this patron.";
}

/**
 * Witch patron selection: a searchable card list, one row per published
 * patron, following `HexPicker`/`ImplementPicker`'s `.search` + `.scroll` +
 * `.pick-row` shape rather than a bare `<select>` (61 entries is too many for
 * a dropdown to browse). PF1 grants exactly one patron, chosen at L1, never
 * changed thereafter — picking a row replaces the current choice; picking the
 * already-chosen row clears it. Free-choice: no vendored patron-to-witch
 * mapping exists, so validation is "soft warning only" per the project's
 * hybrid-prereqs philosophy — same posture as `MysteryPicker`/`BloodlinePicker`.
 *
 * Browses the FULL published catalog (`mergedWitchPatronCatalog`), sorted by
 * the vendored "basic"/"unique" `category` with the current pick first. Only
 * "unique" gets a pill: nearly every basic patron is modeled, so a badge on
 * 52 of 61 rows would carry no information — which is also why this picker
 * skips the `badge-modeled` "M" its siblings use.
 *
 * - 52 "basic" patrons (17 hand-verified against the published rules, ~35
 *   more with a progression the engine's parser extracted from the vendored
 *   prose — see `@pf1/engine` `witch-patrons.ts`'s doc comment) all carry a
 *   real bonus-spell progression: one spell added to the familiar's known
 *   list at witch level 2 and every two levels thereafter, shown
 *   level-ordered once the row is chosen (via `patronSpellsKnown`).
 * - 9 "unique" patrons are themed TEMPLATES, not a 9-spell list: each grants
 *   a named hex at 1st level, imposes a drawback, and restricts you to a
 *   small set of "Available Patron Themes" whose own progression it
 *   overrides at a few levels. That structure (`MergedWitchPatronEntry.themeInfo`)
 *   is shown once chosen, but isn't turned into a real `bonusSpells`
 *   progression — there isn't one without a theme sub-choice this app
 *   doesn't yet collect, so applying it (picking a theme, swapping in the
 *   overridden spells) is left to the player.
 */
export function PatronPicker({ doc, refData, update }: PatronPickerProps) {
  const isWitch = doc.identity.classes.some((c) => c.tag === "witch");
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Patron", false);

  const catalog = useMemo(() => mergedWitchPatronCatalog(refData), [refData]);
  const chosen = doc.build.witchPatron ?? "";
  const chosenDef = catalog.find((p) => p.tag === chosen);
  const witchLevel = doc.identity.classes.find((c) => c.tag === "witch")?.level ?? 0;

  const patrons = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog
      .filter((p) => !q || patronSearchText(p).includes(q))
      .sort((a, b) => {
        const sa = a.tag === chosen ? 0 : 1;
        const sb = b.tag === chosen ? 0 : 1;
        if (sa !== sb) return sa - sb;
        const ca = a.category ?? "";
        const cb = b.category ?? "";
        return ca !== cb ? ca.localeCompare(cb) : a.name.localeCompare(b.name);
      });
  }, [catalog, query, chosen]);

  if (!isWitch) return null;

  return (
    <div className="subsection patron-picker">
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
          Patron
          {chosenDef ? <span className="hint"> · {chosenDef.name}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint patron-picker-hint">Pick one patron. You get it at 1st level.</p>
          <Explainer title="How patrons work" className="patron-picker-explainer">
            <p>
              A basic patron adds one spell to your familiar's known spells at witch level 2 and
              every two levels after, up to 18th. Choosing another patron replaces your pick, and
              choosing your current one clears it. Nothing here is enforced.
            </p>
            <p>
              A patron tagged Unique is a template rather than a spell list: it grants a named hex
              at 1st level, comes with a drawback, and limits you to a few themes whose own spells
              it overrides at a level or two. Those are shown for you to apply by hand.
            </p>
          </Explainer>
          <input
            className="search"
            type="text"
            placeholder="Search patrons…"
            aria-label="Search patrons"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {patrons.map((p) => {
              const isSel = p.tag === chosen;
              return (
                <div key={p.tag} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {p.name}
                      {p.category === "unique" ? (
                        <span
                          className="tag-mystery"
                          title="A template over a theme rather than a spell list of its own"
                        >
                          {CATEGORY_LABEL.unique}
                        </span>
                      ) : null}
                    </div>
                    {!isSel && (
                      <div className="preq">
                        <span className="desc-text">{patronRowSummary(p)}</span>
                      </div>
                    )}
                    {isSel && (
                      <div className="mystery-preview">
                        {!p.displayOnly ? (
                          <ul className="mystery-bonus-spells">
                            {patronSpellsKnown(refData, p.tag, 18).map((sp) => (
                              <li key={`${sp.level}-${sp.id}`}>
                                <span className="cf-level">Witch Lv {sp.level}</span>{" "}
                                <span className="cf-name">
                                  {sp.name}
                                  {sp.level > witchLevel && witchLevel > 0
                                    ? " (not yet unlocked)"
                                    : ""}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : p.themeInfo ? (
                          <>
                            <div className="mystery-class-skills">
                              <span className="hint">Grants Hex</span>
                              <p>{p.themeInfo.grantedHex}</p>
                            </div>
                            <div className="mystery-class-skills">
                              <span className="hint">Drawback</span>
                              <p>{p.themeInfo.drawback}</p>
                            </div>
                            <div className="mystery-class-skills">
                              <span className="hint">Available Patron Themes</span>
                              <p>{p.themeInfo.availableThemes.join(", ")}</p>
                            </div>
                            {p.themeInfo.spellChanges.length > 0 && (
                              <div className="mystery-class-skills">
                                <span className="hint">
                                  Spell Changes (override the chosen theme's own list)
                                </span>
                                <ul className="mystery-bonus-spells">
                                  {p.themeInfo.spellChanges.map((c) => (
                                    <li key={c.level}>
                                      <span className="cf-level">Lv {c.level}</span>{" "}
                                      <span className="cf-name">{c.text}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </>
                        ) : p.description ? (
                          <FeatureDescription html={p.description} />
                        ) : null}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    aria-pressed={isSel}
                    aria-label={isSel ? `Clear ${p.name} as patron` : `Choose ${p.name} as patron`}
                    onClick={() => update((d) => setWitchPatron(d, isSel ? null : p.tag))}
                  >
                    {isSel ? "Chosen" : "Choose"}
                  </button>
                </div>
              );
            })}
            {patrons.length === 0 ? <div className="empty">No patrons match.</div> : null}
          </div>
        </>
      )}
    </div>
  );
}
