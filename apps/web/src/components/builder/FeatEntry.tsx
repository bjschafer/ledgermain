import { useMemo } from "react";

import type { AbilityId, CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { featNameSlug, resolveFeatEffect } from "@pf1/engine";

import { effectiveCasterLevel } from "../../model/casterLevel.js";
import { combatStyleFeatSlugs } from "../../model/ranger.js";
import { ABILITY_IDS, addFeatInstance, removeFeatInstance } from "../../model/doc.js";
import { assignFeatsToSlots, featEligibleForSlot, slotTypeBadge } from "../../model/featSlots.js";
import {
  chosenFeatCountExcludingGranted,
  expectedFeatCount,
  featChoiceDescriptor,
  featChoiceOptions,
  featContextNotes,
  featInstanceDisplayName,
  featInstances,
  grantedFeats,
  setExtraFeatChoice,
  setFeatChoice,
} from "../../model/feats.js";
import {
  evaluatePrereqs,
  unqualifiedSelectedFeats,
  type PrereqContext,
  type PrereqResult,
} from "../../model/prereqs.js";
import { isRepeatableFeat } from "../../model/repeatableFeats.js";
import { HomebrewBadge } from "../HomebrewBadge.js";
import { InfoTip } from "../InfoTip.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Feat = RefData["feats"][string];
type FeatChoiceOption = ReturnType<typeof featChoiceOptions>[number];
type SlotGroup = ReturnType<typeof assignFeatsToSlots>["groups"][number];

/**
 * The shared derived state a feat surface needs to render its rows: prereq
 * results, the taken/granted sets, slot-budget assignment, and the player-choice
 * option lists. Both the builder panel (`FeatsSection`) and the full-screen
 * `FeatManager` compute this once via `useFeatRenderContext` and hand it to
 * `FeatEntry`, so a single rendering path backs both surfaces.
 */
export interface FeatRenderContext {
  selected: Set<string>;
  prereqMap: Map<string, PrereqResult>;
  unqualified: Set<string>;
  granted: ReturnType<typeof grantedFeats>;
  grantedIds: Set<string>;
  styleSlugs: ReadonlySet<string>;
  instancesByFeatId: Map<string, ReturnType<typeof featInstances>>;
  openRestrictedGroups: SlotGroup[];
  restrictedSlotGroups: SlotGroup[];
  unassignedFeatNames: string[];
  skillOptions: FeatChoiceOption[];
  weaponOptions: FeatChoiceOption[];
  schoolOptions: FeatChoiceOption[];
  chosen: number;
  expected: number;
}

export function useFeatRenderContext(
  doc: CharacterDoc,
  sheet: DerivedSheet,
  refData: RefData,
): FeatRenderContext {
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

  // Every taken feat instance (primary + `build.extraFeats`), grouped by feat
  // id — a repeatable feat taken more than once renders one row per instance.
  const instancesByFeatId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof featInstances>>();
    for (const inst of featInstances(doc)) {
      const arr = map.get(inst.featId);
      if (arr) arr.push(inst);
      else map.set(inst.featId, [inst]);
    }
    return map;
  }, [doc]);

  const ctx: PrereqContext = useMemo(() => {
    const abilityTotals = {} as Record<AbilityId, number>;
    for (const id of ABILITY_IDS) abilityTotals[id] = sheet.abilities[id].total;
    return {
      abilityTotals,
      bab: sheet.bab,
      casterLevel: effectiveCasterLevel(doc, refData),
      selectedFeats: new Set([...selected, ...grantedIds]),
      refData,
      bypassBlockedSlugs: styleSlugs,
    };
  }, [sheet, doc, selected, grantedIds, refData, styleSlugs]);

  const prereqMap = useMemo(() => {
    const map = new Map<string, PrereqResult>();
    for (const feat of Object.values(refData.feats)) {
      map.set(feat.id, evaluatePrereqs(feat, ctx));
    }
    return map;
  }, [refData.feats, ctx]);

  // Already-taken feats whose structured prereqs no longer hold — typically a
  // required feat was later removed (issue #9). Never auto-removed; flagged so
  // the player notices instead of silently keeping the feat's effects.
  const unqualified = useMemo(
    () => new Set(unqualifiedSelectedFeats(doc.build.feats, ctx)),
    [doc.build.feats, ctx],
  );

  // Typed feat-slot budget (issue #54/#57): decomposes the feat count into
  // restricted buckets and greedily assigns chosen feats to them, so the UI can
  // flag unfilled restricted slots and feats that fit no remaining slot. Soft
  // warning only — never blocks a pick.
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
  const openRestrictedGroups = useMemo(
    () => restrictedSlotGroups.filter((g) => g.filledFeatIds.length < g.total),
    [restrictedSlotGroups],
  );

  const skillOptions = useMemo(() => featChoiceOptions("skill", refData), [refData]);
  const weaponOptions = useMemo(
    () => featChoiceOptions("weapon", refData, doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc.build.weapons, refData],
  );
  const schoolOptions = useMemo(() => featChoiceOptions("school", refData), [refData]);

  const chosen = chosenFeatCountExcludingGranted(doc, refData);
  const expected = expectedFeatCount(doc, refData);

  return {
    selected,
    prereqMap,
    unqualified,
    granted,
    grantedIds,
    styleSlugs,
    instancesByFeatId,
    openRestrictedGroups,
    restrictedSlotGroups,
    unassignedFeatNames,
    skillOptions,
    weaponOptions,
    schoolOptions,
    chosen,
    expected,
  };
}

/**
 * One feat row (or, for a taken repeatable feat, its instance group). The whole
 * per-feat rendering lives here so the builder panel and the full-screen manager
 * share exactly one code path — see `FeatRenderContext`.
 */
export function FeatEntry({
  feat,
  fx,
  doc,
  refData,
  update,
}: {
  feat: Feat;
  fx: FeatRenderContext;
  doc: CharacterDoc;
  refData: RefData;
  update: (fn: (doc: CharacterDoc) => CharacterDoc) => void;
}) {
  const isSel = fx.selected.has(feat.id);
  const res = fx.prereqMap.get(feat.id)!;
  const blocked = res.blocked && !isSel;
  // Already taken, but a structured prereq (usually a required feat) no longer
  // holds — issue #9. Distinct from `blocked`, which only ever applies to
  // not-yet-taken feats.
  const isUnqualified = isSel && fx.unqualified.has(feat.id);
  const inStyle = fx.styleSlugs.has(featNameSlug(feat.name));
  // Issue #62: machine-extracted feats get the same hollow "M" badge that
  // extracted-tier archetype effects use.
  const extractedEffect = resolveFeatEffect(featNameSlug(feat.name))?.source === "extracted";
  // Other open restricted slots (combat, wizard bonus, bloodline, monk list…)
  // this feat could fill — combat style gets its own dedicated badge below.
  const eligibleOpenGroups = fx.openRestrictedGroups.filter(
    (g) => g.type.kind !== "combatStyle" && featEligibleForSlot(feat, g.type),
  );
  const choiceDesc = isSel ? featChoiceDescriptor(feat.name) : null;
  const choiceOpts =
    choiceDesc?.type === "skill"
      ? fx.skillOptions
      : choiceDesc?.type === "weapon"
        ? fx.weaponOptions
        : choiceDesc?.type === "school"
          ? fx.schoolOptions
          : [];

  const prereqBlock = (res.checks.length > 0 || res.softText) && (
    <div className="preq">
      {res.checks.map((c, i) => (
        <span key={i} className={c.met ? "ck-met" : "ck-unmet"}>
          {c.met ? "✓" : "✗"} {c.label}
        </span>
      ))}
      {res.softText ? (
        <InfoTip
          className="desc-text"
          content="Prerequisite text — verify manually (not auto-enforced)"
        >
          ⚠ {res.softText}
        </InfoTip>
      ) : null}
    </div>
  );

  const description = feat.description;
  const repeatable = isRepeatableFeat(feat.name);
  const instances = isSel ? (fx.instancesByFeatId.get(feat.id) ?? []) : [];

  // Issue #58: a RAW-repeatable feat that's already taken renders one row PER
  // instance (its own choice picker + its own remove), plus a trailing "take
  // again" row.
  if (isSel && repeatable) {
    // Same non-empty choice picked on two instances is legal to store but has
    // no additional RAW effect — flag it as a soft warning rather than blocking.
    const choiceCounts = new Map<string, number>();
    for (const inst of instances) {
      if (inst.choiceId) {
        choiceCounts.set(inst.choiceId, (choiceCounts.get(inst.choiceId) ?? 0) + 1);
      }
    }
    return (
      <div className="feat-instance-group">
        {instances.map((inst, idx) => {
          const dupChoice = !!inst.choiceId && (choiceCounts.get(inst.choiceId) ?? 0) > 1;
          return (
            <div
              key={inst.instanceId}
              className={`pick-row is-selected${idx === 0 && isUnqualified ? " is-unqualified" : ""}`}
            >
              <div className="pmain">
                <div className="pname">
                  {featInstanceDisplayName(feat, inst.choiceId, doc, refData)}
                  {idx === 0 ? <HomebrewBadge id={feat.id} /> : null}
                  {instances.length > 1 ? (
                    <span className="hint" style={{ marginLeft: 6 }}>
                      #{idx + 1}
                    </span>
                  ) : null}
                  {dupChoice ? (
                    <InfoTip
                      className="unqualified-badge"
                      content="Another instance already has this exact choice — RAW this instance has no additional effect"
                    >
                      ⚠ duplicate choice
                    </InfoTip>
                  ) : null}
                  {idx === 0 && isUnqualified ? (
                    <InfoTip
                      className="unqualified-badge"
                      content="A prerequisite (usually another feat) was removed — this feat is kept, but no longer qualifies. Verify manually or remove it."
                    >
                      ⚠ no longer qualifies
                    </InfoTip>
                  ) : null}
                  {idx === 0 && inStyle ? (
                    <InfoTip
                      className="style-badge"
                      content={
                        res.bypassed
                          ? "Ranger combat style — you may take this feat even though its prerequisites are unmet"
                          : "In your ranger combat style's feat tree"
                      }
                    >
                      combat style{res.bypassed ? " · prereqs waived" : ""}
                    </InfoTip>
                  ) : null}
                  {idx === 0 && extractedEffect ? (
                    <InfoTip
                      className="badge-modeled badge-modeled--extracted"
                      content="Carries a machine-extracted numeric effect, not yet hand-verified"
                    >
                      {" "}
                      M
                    </InfoTip>
                  ) : null}
                </div>
                {choiceDesc && choiceOpts.length > 0 && (
                  <div className="feat-choice">
                    <label className="feat-choice-label">
                      {choiceDesc.label}:
                      <select
                        className="feat-choice-select"
                        value={inst.choiceId ?? ""}
                        onChange={(e) => {
                          const choiceId = e.target.value || null;
                          update((d) =>
                            inst.isExtra
                              ? setExtraFeatChoice(d, inst.instanceId, choiceId)
                              : setFeatChoice(d, feat.id, choiceId),
                          );
                        }}
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
                    <span className="hint" style={{ fontSize: "0.6875rem" }}>
                      Add a weapon with a type (in the Weapons section) to enable this picker.
                    </span>
                  </div>
                )}
                {idx === 0 ? prereqBlock : null}
                {idx === 0 &&
                  featContextNotes(feat.name).map((n, i) => (
                    <div key={i} className="hint" style={{ marginTop: 2 }}>
                      ⚠ {n.text}
                    </div>
                  ))}
                {idx === 0 && description ? <FeatureDescription html={description} /> : null}
              </div>
              <button
                type="button"
                className="pick-btn remove"
                onClick={() =>
                  update((d) =>
                    removeFeatInstance(d, feat.id, inst.isExtra ? inst.instanceId : undefined),
                  )
                }
              >
                Remove
              </button>
            </div>
          );
        })}
        <div className="pick-row feat-take-again-row">
          <div className="pmain">
            <span className="hint">Take {feat.name} again?</span>
          </div>
          <button
            type="button"
            className="pick-btn add"
            onClick={() => update((d) => addFeatInstance(d, feat.id))}
          >
            + Take again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pick-row${isSel ? " is-selected" : ""}${blocked ? " is-blocked" : ""}${isUnqualified ? " is-unqualified" : ""}`}
    >
      <div className="pmain">
        <div className="pname">
          {isSel
            ? featInstanceDisplayName(feat, doc.build.featChoices?.[feat.id], doc, refData)
            : feat.name}
          <HomebrewBadge id={feat.id} />
          {isUnqualified ? (
            <InfoTip
              className="unqualified-badge"
              content="A prerequisite (usually another feat) was removed — this feat is kept, but no longer qualifies. Verify manually or remove it."
            >
              ⚠ no longer qualifies
            </InfoTip>
          ) : null}
          {inStyle ? (
            <InfoTip
              className="style-badge"
              content={
                res.bypassed
                  ? "Ranger combat style — you may take this feat even though its prerequisites are unmet"
                  : "In your ranger combat style's feat tree"
              }
            >
              combat style{res.bypassed ? " · prereqs waived" : ""}
            </InfoTip>
          ) : null}
          {!isSel &&
            eligibleOpenGroups.map((g) => (
              <InfoTip
                key={g.key}
                className="style-badge"
                content={`Fills your open ${g.label} slot (${g.total - g.filledFeatIds.length} open)`}
              >
                {slotTypeBadge(g.type)} slot
              </InfoTip>
            ))}
          {extractedEffect ? (
            <InfoTip
              className="badge-modeled badge-modeled--extracted"
              content="Carries a machine-extracted numeric effect, not yet hand-verified"
            >
              {" "}
              M
            </InfoTip>
          ) : null}
        </div>
        {/* Inline choice picker for feats that require a selection */}
        {choiceDesc && choiceOpts.length > 0 && (
          <div className="feat-choice">
            <label className="feat-choice-label">
              {choiceDesc.label}:
              <select
                className="feat-choice-select"
                value={doc.build.featChoices?.[feat.id] ?? ""}
                onChange={(e) => update((d) => setFeatChoice(d, feat.id, e.target.value || null))}
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
            <span className="hint" style={{ fontSize: "0.6875rem" }}>
              Add a weapon with a type (in the Weapons section) to enable this picker.
            </span>
          </div>
        )}
        {prereqBlock}
        {featContextNotes(feat.name).map((n, i) => (
          <div key={i} className="hint" style={{ marginTop: 2 }}>
            ⚠ {n.text}
          </div>
        ))}
        {description ? <FeatureDescription html={description} /> : null}
      </div>
      <button
        type="button"
        className={`pick-btn ${isSel ? "remove" : "add"}`}
        disabled={blocked}
        title={blocked ? "Prerequisites not met" : undefined}
        onClick={() =>
          update((d) => (isSel ? removeFeatInstance(d, feat.id) : addFeatInstance(d, feat.id)))
        }
      >
        {isSel ? "Remove" : blocked ? "Locked" : "Add"}
      </button>
    </div>
  );
}
