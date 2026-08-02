import { useMemo, useState } from "react";

import type { CharacterDoc, RefData } from "@pf1/schema";
import { saveNoteCoverage, vendoredTraitFullyHandled } from "@pf1/engine";

import {
  availableVendoredRacialTraits,
  hasVendoredRacialTrait,
  openChangeTargetOptions,
  setVendoredRacialTraitTarget,
  toggleVendoredRacialTrait,
  unfilledVendoredRacialTraitTargets,
  vendoredRacialTraitPoints,
  vendoredRacialTraitTarget,
} from "../../model/racialTraits.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { RulesNote } from "../RulesNote.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

/** `<optgroup>` order for an `openChanges` target select. */
const TARGET_GROUPS = ["Ability score", "Skill"] as const;

/**
 * The ~80-race vendored alternate-racial-trait catalog (fill plan), scoped to
 * the character's current race. Mirrors `RagePowerPicker`'s
 * collapsible-search-list shape, but the honesty posture is different: unlike
 * the hand-authored picker inline in `RaceSection` (which enforces a real
 * standard-trait swap), a vendored pick's `replacedTraitNames` is a verified
 * swap only for the races/names in `@pf1/engine`'s
 * `VENDORED_STANDARD_TRAIT_TARGETS`/`VENDORED_STANDARD_TRAIT_NOTES` maps — the
 * "replaces" tag says so ("applied automatically") when
 * `vendoredTraitFullyHandled` confirms every named standard trait is covered,
 * and keeps the soft "verify manually" wording everywhere else, where the
 * catalog only names WHAT the trait replaces without a verified mapping to
 * suppress it (see `RacialTrait`'s doc comment in `@pf1/schema` for why).
 * Entries that duplicate a hand-authored trait by name are excluded
 * (`availableVendoredRacialTraits`) so the two pickers never offer the same
 * trait under two different guarantees.
 *
 * Three of the catalog's fields need a surface here and nowhere else: a
 * heritage variant carries its heritage as a chip (only correct for a
 * character of that heritage — unmodeled, so it's a label, not a gate); an
 * entry with `openChanges` gets one target select per "choose one" blank, and
 * grants nothing for a blank left unchosen; and `racePoints` shows per-entry
 * and as a header total, a GM-facing reference figure rather than a budget.
 */
export function VendoredRacialTraitPicker({
  doc,
  refData,
  update,
}: {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}) {
  const [query, setQuery] = useState("");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:VendoredRacialTraits", true);

  const raceName = refData.races[doc.identity.race]?.name;
  const all = useMemo(() => availableVendoredRacialTraits(doc, refData), [doc, refData]);
  const points = vendoredRacialTraitPoints(doc, refData);
  const unfilled = unfilledVendoredRacialTraitTargets(doc, refData);
  const targetOptions = useMemo(() => openChangeTargetOptions(doc), [doc]);

  const traits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter(
        (t) =>
          !q ||
          t.name.toLowerCase().includes(q) ||
          t.heritage?.toLowerCase().includes(q) ||
          t.replacedTraitNames.some((r) => r.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        const sa = hasVendoredRacialTrait(doc, a.id) ? 0 : 1;
        const sb = hasVendoredRacialTrait(doc, b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });
  }, [all, query, doc]);

  if (all.length === 0) return null;

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
          More alternate racial traits (vendored)
          <span className="hint">
            {" "}
            · {points.chosen} chosen
            {points.tagged > 0 ? ` · ${points.total} RP` : ""}
            {unfilled.size > 0 ? ` · ⚠ ${unfilled.size} needing a choice` : ""}
          </span>
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint magus-arcana-picker-hint">
            Sourced from the wider published catalog, not hand-verified like the traits above.
            `Changes` apply automatically when structured. A "replaces" tag says "applied
            automatically" when every named standard trait is verified to retire on its own;
            otherwise it's a reminder only, so retire the named standard trait(s) yourself.
            Heritage-tagged entries are only yours if that's your heritage: nothing checks it.
            {points.tagged > 0 ? (
              <>
                {" "}
                The RP total sums the Race Builder cost of the {points.tagged} tagged pick
                {points.tagged === 1 ? "" : "s"}, a reference figure for GM approval, not a budget.
                A swap is meant to be roughly cost-neutral against the standard trait it replaces,
                which the catalog doesn't price.
              </>
            ) : null}
          </p>
          <input
            className="search"
            type="text"
            placeholder="Search alternate racial traits…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="scroll">
            {traits.map((t) => {
              const isSel = hasVendoredRacialTrait(doc, t.id);
              const openChanges = t.openChanges ?? [];
              const fullyHandled = raceName != null && vendoredTraitFullyHandled(t, raceName);
              return (
                <div key={t.id} className={`pick-row${isSel ? " is-selected" : ""}`}>
                  <div className="pmain">
                    <div className="pname">
                      {t.name}
                      {t.heritage ? <span className="tag-bloodline">{t.heritage}</span> : null}
                      {t.replacedTraitNames.length > 0 ? (
                        <span
                          className="tag-bloodline"
                          title={
                            fullyHandled
                              ? `Replaces ${t.replacedTraitNames.join(", ")}. Applied automatically.`
                              : `Replaces ${t.replacedTraitNames.join(", ")}. Verify manually.`
                          }
                        >
                          replaces {t.replacedTraitNames.join(", ")}
                          {fullyHandled ? " (auto)" : null}
                        </span>
                      ) : null}
                      {t.racePoints !== undefined ? (
                        <span className="tag-bloodline" title="Race Builder point cost">
                          {t.racePoints} RP
                        </span>
                      ) : null}
                    </div>
                    {isSel
                      ? t.contextNotes.map((note, i) => (
                          <RulesNote
                            key={i}
                            text={note.text}
                            appliedAutomatically={
                              saveNoteCoverage({ catalog: "racialTrait" }, note) === "full"
                            }
                          />
                        ))
                      : null}
                    {isSel && openChanges.length > 0 ? (
                      <div style={{ marginTop: 4 }}>
                        {openChanges.map((ch, i) => {
                          const chosenTarget = vendoredRacialTraitTarget(doc, t.id, i);
                          return (
                            <label key={i} className="hint" style={{ display: "block" }}>
                              Apply {ch.formula.startsWith("-") ? "" : "+"}
                              {ch.formula} ({ch.type}) to{" "}
                              <select
                                value={chosenTarget}
                                onChange={(e) =>
                                  update((d) =>
                                    setVendoredRacialTraitTarget(
                                      d,
                                      t.id,
                                      i,
                                      e.target.value || null,
                                    ),
                                  )
                                }
                              >
                                <option value="">— choose —</option>
                                {TARGET_GROUPS.map((group) => (
                                  <optgroup key={group} label={group}>
                                    {targetOptions
                                      .filter((o) => o.group === group)
                                      .map((o) => (
                                        <option key={o.value} value={o.value}>
                                          {o.label}
                                        </option>
                                      ))}
                                  </optgroup>
                                ))}
                              </select>
                              {chosenTarget ? null : " — nothing applies until you choose"}
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                    {t.description ? <FeatureDescription html={t.description} /> : null}
                  </div>
                  <button
                    type="button"
                    className={`pick-btn ${isSel ? "remove" : "add"}`}
                    onClick={() => update((d) => toggleVendoredRacialTrait(d, t.id))}
                  >
                    {isSel ? "Remove" : "Add"}
                  </button>
                </div>
              );
            })}
            {traits.length === 0 ? (
              <div className="empty">No alternate racial traits match.</div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
