import { useMemo, useState } from "react";

import type { AbilityId } from "@pf1/schema";

import { featNameSlug } from "@pf1/engine";

import { casterLevel } from "../../model/casterLevel.js";
import { combatStyleFeatSlugs } from "../../model/ranger.js";
import { ABILITY_IDS, toggleFeat } from "../../model/doc.js";
import { assignFeatsToSlots, featEligibleForSlot, slotTypeBadge } from "../../model/featSlots.js";
import {
  chosenFeatCountExcludingGranted,
  expectedFeatCount,
  featChoiceDescriptor,
  featChoiceOptions,
  featDisplayName,
  grantedFeats,
  setFeatChoice,
} from "../../model/feats.js";
import {
  evaluatePrereqs,
  unqualifiedSelectedFeats,
  type PrereqContext,
  type PrereqResult,
} from "../../model/prereqs.js";
import { Panel } from "./Panel.js";
import type { BuilderProps } from "./types.js";

const FEAT_CATEGORIES = ["Combat", "General", "Metamagic", "Item Creation", "Teamwork"] as const;
type FeatCategory = (typeof FEAT_CATEGORIES)[number];

export function FeatsSection({ doc, sheet, refData, update }: BuilderProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FeatCategory | "All">("All");
  const [hideIneligible, setHideIneligible] = useState(false);
  const selected = useMemo(() => new Set(doc.build.feats), [doc.build.feats]);

  // Feats granted outright by class features (Scribe Scroll, Eschew
  // Materials): shown read-only, never budgeted, and counted as owned for
  // prerequisite checks.
  const granted = useMemo(() => grantedFeats(doc, refData), [doc, refData]);
  const grantedIds = useMemo(() => new Set(granted.map((g) => g.featId)), [granted]);

  // The chosen ranger combat style's feat tree (empty for non-rangers / no
  // style): these feats can be taken with prereqs waived, and are badged so the
  // tree is identifiable even when the character already meets the prereqs.
  const styleSlugs = useMemo(() => combatStyleFeatSlugs(doc), [doc]);

  const ctx: PrereqContext = useMemo(() => {
    const abilityTotals = {} as Record<AbilityId, number>;
    for (const id of ABILITY_IDS) abilityTotals[id] = sheet.abilities[id].total;
    return {
      abilityTotals,
      bab: sheet.bab,
      casterLevel: casterLevel(doc),
      selectedFeats: new Set([...selected, ...grantedIds]),
      refData,
      bypassBlockedSlugs: styleSlugs,
    };
  }, [sheet, doc, selected, grantedIds, refData, styleSlugs]);

  const { feats, prereqMap } = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Compute prereq results once; reused for both filtering and rendering.
    const map = new Map<string, PrereqResult>();
    for (const feat of Object.values(refData.feats)) {
      map.set(feat.id, evaluatePrereqs(feat, ctx));
    }

    const list = Object.values(refData.feats)
      .filter((f) => {
        if (q && !f.name.toLowerCase().includes(q)) return false;
        if (category !== "All" && !f.tags.includes(category)) return false;
        // Class-granted feats live in their own read-only block above the
        // picker — hide them here unless a legacy manual copy is selected
        // (so it can still be removed).
        if (grantedIds.has(f.id) && !selected.has(f.id)) return false;
        // Never hide a feat the character has already taken.
        if (hideIneligible && !selected.has(f.id) && map.get(f.id)?.blocked) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const sa = selected.has(a.id) ? 0 : 1;
        const sb = selected.has(b.id) ? 0 : 1;
        return sa - sb || a.name.localeCompare(b.name);
      });

    return { feats: list, prereqMap: map };
  }, [refData.feats, query, category, hideIneligible, selected, grantedIds, ctx]);

  // Already-taken feats whose structured prereqs no longer hold — typically a
  // required feat was later removed (issue #9). Never auto-removed; flagged
  // so the player notices instead of silently keeping the feat's effects.
  const unqualified = useMemo(
    () => new Set(unqualifiedSelectedFeats(doc.build.feats, ctx)),
    [doc.build.feats, ctx],
  );

  // Typed feat-slot budget (issue #54/#57): decomposes the feat count into
  // restricted buckets (Fighter combat, Wizard metamagic/item creation, a
  // ranger's chosen combat style, a sorcerer's chosen bloodline, monk's
  // limited list, …) and greedily assigns the character's chosen feats to
  // them, so the picker can flag unfilled restricted slots and feats that
  // don't fit any remaining slot at all. Soft-warning only — never blocks a
  // pick, matching the project's hybrid prereq posture.
  const slotAssignment = useMemo(() => assignFeatsToSlots(doc, refData), [doc, refData]);
  const restrictedSlotGroups = useMemo(
    () => slotAssignment.groups.filter((g) => g.type.kind !== "generic"),
    [slotAssignment],
  );
  const unassignedFeatNames = useMemo(
    () =>
      slotAssignment.unassignedFeatIds
        .map((id) => refData.feats[id]?.name)
        .filter((n): n is string => !!n),
    [slotAssignment, refData],
  );
  // Restricted slot groups (excluding generic) with unfilled capacity, for
  // per-row "fits your open X slot" badges.
  const openRestrictedGroups = useMemo(
    () => restrictedSlotGroups.filter((g) => g.filledFeatIds.length < g.total),
    [restrictedSlotGroups],
  );

  // Skill options for Skill Focus and any other "skill" choice feats. Computed
  // once per render cycle — the list is static (all skills, alphabetically).
  const skillOptions = useMemo(() => featChoiceOptions("skill", refData), [refData]);

  // Weapon options for Weapon Focus / Specialization / Improved Critical:
  // distinct group labels from doc.build.weapons. Returns empty when no
  // weapons have a group set — the UI shows a soft hint ("add a weapon with
  // a type first") in that case.
  const weaponOptions = useMemo(
    () => featChoiceOptions("weapon", refData, doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc.build.weapons, refData],
  );

  // School options for Spell Focus / Greater Spell Focus (issue #55) — a
  // fixed, static list.
  const schoolOptions = useMemo(() => featChoiceOptions("school", refData), [refData]);

  const chosen = chosenFeatCountExcludingGranted(doc, refData);
  const expected = expectedFeatCount(doc, refData);
  const featCountClass =
    chosen === expected ? "hint" : chosen > expected ? "hint warn-over" : "hint warn-under";

  return (
    <Panel
      title="Feats"
      step="vii"
      storageKey="panel:Feats"
      right={
        <>
          <span
            className={featCountClass}
            title={chosen !== expected ? "Feat count doesn't match expected" : undefined}
          >
            {chosen} / {expected} feats
          </span>
          {unqualified.size > 0 && (
            <span
              className="hint warn-over"
              title="These feats' prerequisites are no longer met (a required feat was likely removed) — they're kept per the hybrid prereq policy, but verify manually"
            >
              {" "}
              · ⚠ {unqualified.size} no longer qualif{unqualified.size === 1 ? "ies" : "y"}
            </span>
          )}
        </>
      }
    >
      <input
        className="search"
        type="text"
        placeholder="Search feats…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="feat-filters">
        <div className="chips">
          <button
            type="button"
            className="chip"
            aria-pressed={category === "All"}
            onClick={() => setCategory("All")}
          >
            All
          </button>
          {FEAT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className="chip"
              aria-pressed={category === cat}
              onClick={() => setCategory(category === cat ? "All" : cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        {/* Orthogonal toggle — visually separate from category filters */}
        <div className="feat-filter-toggle">
          <span className="hint" style={{ fontSize: 11 }}>
            FILTER
          </span>
          <button
            type="button"
            className="filter-toggle"
            aria-pressed={hideIneligible}
            onClick={() => setHideIneligible((v) => !v)}
          >
            {hideIneligible ? "▪ Hide ineligible" : "▫ Hide ineligible"}
          </button>
        </div>
      </div>
      {restrictedSlotGroups.length > 0 && (
        <div className="feat-slot-summary">
          {restrictedSlotGroups.map((g) => (
            <span
              key={g.key}
              className={`slot-chip${g.filledFeatIds.length < g.total ? " slot-chip-warn" : ""}`}
              title={
                g.filledFeatIds.length < g.total
                  ? `${g.label}: ${g.total - g.filledFeatIds.length} unfilled — take a feat from this restricted list to fill it`
                  : `${g.label}: fully filled`
              }
            >
              {g.filledFeatIds.length < g.total ? "⚠ " : ""}
              {g.label}: {g.filledFeatIds.length}/{g.total}
            </span>
          ))}
          {unassignedFeatNames.length > 0 && (
            <span
              className="slot-chip slot-chip-warn"
              title="These feats don't match any open feat slot for your class(es) — you may be over your feat budget, or they don't satisfy a class's feat-type restriction"
            >
              ⚠ doesn't fit an open slot: {unassignedFeatNames.join(", ")}
            </span>
          )}
        </div>
      )}
      {granted.length > 0 && (
        <div className="granted-feats">
          {granted.map((g) => (
            <div key={g.featId} className="pick-row is-selected">
              <div className="pmain">
                <div className="pname">{g.featName}</div>
                <div className="preq">
                  <span className="soft">Granted by {g.classTag} — no feat slot used</span>
                </div>
              </div>
              <button
                type="button"
                className="pick-btn"
                disabled
                title="Class feature grant — always on"
              >
                Granted
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="scroll">
        {feats.slice(0, 150).map((feat) => {
          const isSel = selected.has(feat.id);
          const res = prereqMap.get(feat.id)!;
          const blocked = res.blocked && !isSel;
          // Already taken, but a structured prereq (usually a required feat)
          // no longer holds — issue #9. Distinct from `blocked`, which only
          // ever applies to not-yet-taken feats.
          const isUnqualified = isSel && unqualified.has(feat.id);
          const inStyle = styleSlugs.has(featNameSlug(feat.name));
          // Other open restricted slots (combat, wizard bonus, bloodline,
          // monk list, …) this feat could fill — combat style already gets
          // its own dedicated badge above (tied to the prereq-waiver text).
          const eligibleOpenGroups = openRestrictedGroups.filter(
            (g) => g.type.kind !== "combatStyle" && featEligibleForSlot(feat, g.type),
          );
          // For selected feats: look up any player-choice descriptor and options.
          const choiceDesc = isSel ? featChoiceDescriptor(feat.name) : null;
          const choiceOpts =
            choiceDesc?.type === "skill"
              ? skillOptions
              : choiceDesc?.type === "weapon"
                ? weaponOptions
                : choiceDesc?.type === "school"
                  ? schoolOptions
                  : [];
          return (
            <div
              key={feat.id}
              className={`pick-row${isSel ? " is-selected" : ""}${blocked ? " is-blocked" : ""}${isUnqualified ? " is-unqualified" : ""}`}
            >
              <div className="pmain">
                <div className="pname">
                  {isSel ? featDisplayName(feat, doc, refData) : feat.name}
                  {isUnqualified ? (
                    <span
                      className="unqualified-badge"
                      title="A prerequisite (usually another feat) was removed — this feat is kept, but no longer qualifies. Verify manually or remove it."
                    >
                      ⚠ no longer qualifies
                    </span>
                  ) : null}
                  {inStyle ? (
                    <span
                      className="style-badge"
                      title={
                        res.bypassed
                          ? "Ranger combat style — you may take this feat even though its prerequisites are unmet"
                          : "In your ranger combat style's feat tree"
                      }
                    >
                      combat style{res.bypassed ? " · prereqs waived" : ""}
                    </span>
                  ) : null}
                  {!isSel &&
                    eligibleOpenGroups.map((g) => (
                      <span
                        key={g.key}
                        className="style-badge"
                        title={`Fills your open ${g.label} slot (${g.total - g.filledFeatIds.length} open)`}
                      >
                        {slotTypeBadge(g.type)} slot
                      </span>
                    ))}
                </div>
                {/* Inline choice picker for feats that require a selection */}
                {choiceDesc && choiceOpts.length > 0 && (
                  <div className="feat-choice">
                    <label className="feat-choice-label">
                      {choiceDesc.label}:
                      <select
                        className="feat-choice-select"
                        value={doc.build.featChoices?.[feat.id] ?? ""}
                        onChange={(e) =>
                          update((d) => setFeatChoice(d, feat.id, e.target.value || null))
                        }
                      >
                        <option value="">— choose a {choiceDesc.type} —</option>
                        {choiceOpts.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                {choiceDesc?.type === "weapon" && choiceOpts.length === 0 && (
                  <div className="feat-choice">
                    <span className="hint" style={{ fontSize: 11 }}>
                      Add a weapon with a type (in the Weapons section) to enable this picker.
                    </span>
                  </div>
                )}
                {(res.checks.length > 0 || res.softText) && (
                  <div className="preq">
                    {res.checks.map((c, i) => (
                      <span key={i} className={c.met ? "ck-met" : "ck-unmet"}>
                        {c.met ? "✓" : "✗"} {c.label}
                      </span>
                    ))}
                    {res.softText ? (
                      <span
                        className="desc-text"
                        title="Prerequisite text — verify manually (not auto-enforced)"
                      >
                        ⚠ {res.softText}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={`pick-btn ${isSel ? "remove" : "add"}`}
                disabled={blocked}
                title={blocked ? "Prerequisites not met" : undefined}
                onClick={() => update((d) => toggleFeat(d, feat.id))}
              >
                {isSel ? "Remove" : blocked ? "Locked" : "Add"}
              </button>
            </div>
          );
        })}
        {feats.length > 150 ? (
          <div className="empty">Showing first 150 — refine your search.</div>
        ) : null}
      </div>
    </Panel>
  );
}
