import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import type { CharacterDoc, RacialTrait, RefData } from "@pf1/schema";
import { saveNoteCoverage, vendoredTraitFullyHandled } from "@pf1/engine";

import {
  groupRacialTraitsByCategory,
  type RacialTraitCategory,
} from "../../model/racialTraitCategory.js";
import {
  availableVendoredRacialTraits,
  hasVendoredRacialTrait,
  openChangeTargetOptions,
  racialTraitConflictReason,
  racialTraitConflicts,
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
 * One collapsible category section inside the picker, the same shape (and
 * classes) as the race picker's `RaceGroupSection`, including its
 * search-forces-open behavior so a match is never hidden inside a section the
 * player left closed. Rows are full-width, so `children` render directly
 * rather than in the `.chips` pill grid that picker uses.
 */
function TraitGroupSection({
  category,
  label,
  count,
  forceOpen,
  children,
}: {
  category: RacialTraitCategory;
  label: string;
  count: number;
  forceOpen: boolean;
  children: ReactNode;
}) {
  const [collapsed, toggle] = useCollapsed(`racial-trait-category:${category}`);
  const open = forceOpen || !collapsed;
  return (
    <div className="race-group">
      <div
        className="race-group-header"
        onClick={forceOpen ? undefined : toggle}
        role="button"
        tabIndex={forceOpen ? -1 : 0}
        aria-expanded={open}
        onKeyDown={(e) => {
          if (!forceOpen && (e.key === "Enter" || e.key === " ")) toggle();
        }}
      >
        <span className="section-label">{label}</span>
        <span className="race-group-count">{count}</span>
        {forceOpen ? null : <Caret open={open} />}
      </div>
      {open ? children : null}
    </div>
  );
}

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
 * Four of the catalog's fields need a surface here and nowhere else:
 * `traitCategory` splits the list into collapsible sections
 * (`model/racialTraitCategory.ts`), since a big race vendors dozens of
 * entries; a heritage variant carries its heritage as a chip (only correct for a
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
  const traitConflicts = racialTraitConflicts(doc, refData);
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

  // Grouped after filtering and sorting, so a search narrows the sections
  // themselves (empty ones drop out) and chosen picks still lead their own
  // section.
  const groups = useMemo(() => groupRacialTraitsByCategory(traits), [traits]);
  const searchActive = query.trim().length > 0;

  if (all.length === 0) return null;

  function renderTrait(t: RacialTrait) {
    const isSel = hasVendoredRacialTrait(doc, t.id);
    const openChanges = t.openChanges ?? [];
    const fullyHandled = raceName != null && vendoredTraitFullyHandled(t, raceName);
    const conflicts = traitConflicts.get(t.id);
    const reason = conflicts ? racialTraitConflictReason(conflicts) : null;
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
            {reason ? (
              <span className="soft" title={reason}>
                {isSel ? "⚠ conflict" : "⚠ unavailable"}
              </span>
            ) : null}
          </div>
          {reason ? <div className="preq">{reason}</div> : null}
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
                          setVendoredRacialTraitTarget(d, t.id, i, e.target.value || null),
                        )
                      }
                    >
                      <option value="">(choose)</option>
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
                    {chosenTarget ? null : " (nothing applies until you choose)"}
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
          disabled={!isSel && reason != null}
          title={!isSel && reason != null ? reason : undefined}
          onClick={() => update((d) => toggleVendoredRacialTrait(d, t.id))}
        >
          {isSel ? "Remove" : "Add"}
        </button>
      </div>
    );
  }

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
          More alternate racial traits
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
            Effects the catalog states as structured numbers apply to your sheet automatically. A
            "replaces" tag says "applied automatically" when every named standard trait is verified
            to retire on its own; otherwise it's a reminder only, so retire the named standard
            trait(s) yourself. Either way each standard trait can only be traded once, so an entry
            wanting one you've already traded can't be added. Heritage-tagged entries are only yours
            if that's your heritage: nothing checks it. Sections follow the published trait
            categories; entries the catalog left untagged sit under Uncategorized.
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
            {groups.map((group) => (
              <TraitGroupSection
                key={group.category}
                category={group.category}
                label={group.label}
                count={group.items.length}
                forceOpen={searchActive}
              >
                {group.items.map(renderTrait)}
              </TraitGroupSection>
            ))}
            {groups.length === 0 ? (
              <div className="empty">No alternate racial traits match.</div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
