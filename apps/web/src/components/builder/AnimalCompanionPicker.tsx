import {
  BASE_COMPANIONS,
  companionAbilityIncreaseSlots,
  companionEffectiveLevel,
} from "@pf1/engine";
import type { AbilityId, CharacterDoc, RefData } from "@pf1/schema";

import {
  cavalierLevel,
  clearCompanion,
  companionFeatPrereqContext,
  deriveCompanionSheet,
  mountSpeciesHint,
  samuraiLevel,
  setCompanion,
  setCompanionAbilityIncrease,
  setCompanionNotes,
  setCompanionSkillRank,
  toggleCompanionFeat,
  toggleCompanionSource,
} from "../../model/companion.js";
import { COMPANION_SKILL_IDS } from "../../model/companionDisplay.js";
import { skillName } from "../../model/names.js";
import { evaluatePrereqs } from "../../model/prereqs.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { NumberField } from "./NumberField.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface AnimalCompanionPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

const ABILITY_OPTIONS: { id: AbilityId; label: string }[] = [
  { id: "str", label: "Str" },
  { id: "dex", label: "Dex" },
  { id: "con", label: "Con" },
  { id: "int", label: "Int" },
  { id: "wis", label: "Wis" },
  { id: "cha", label: "Cha" },
];

/**
 * Tracked animal companion (PF1 druid Nature Bond / ranger Hunter's Bond /
 * ACG Hunter's own Animal Companion feature / cavalier & samurai Mount,
 * issue #68) — species + name + which class feature(s) grant it, mirroring
 * `FamiliarPicker` closely. Unlike a familiar (class-agnostic — any feature
 * can grant one), a companion is ALWAYS sourced from a specific bond choice,
 * so this only renders for characters with druid levels (Nature Bond),
 * ranger levels ≥ 4 (Hunter's Bond), hunter levels (the ACG Hunter class's
 * own Animal Companion feature, issue #65 — distinct from the ranger's
 * similarly-named "Hunter's Bond", see `@pf1/engine`
 * `companionEffectiveLevel`'s doc comment), or cavalier/samurai levels (the
 * "Mount" class feature, granted at 1st level unlike the ranger's 4th-level
 * gate) — a druid choosing the domain option instead, and a ranger below
 * 4th level, simply see no picker yet.
 */
export function AnimalCompanionPicker({ doc, refData, update }: AnimalCompanionPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:AnimalCompanion", false);
  const druidLevel = doc.identity.classes.find((c) => c.tag === "druid")?.level ?? 0;
  const rangerLevel = doc.identity.classes.find((c) => c.tag === "ranger")?.level ?? 0;
  const hunterLevel = doc.identity.classes.find((c) => c.tag === "hunter")?.level ?? 0;
  const cavLevel = cavalierLevel(doc);
  const samLevel = samuraiLevel(doc);
  const canNatureBond = druidLevel >= 1;
  const canHuntersBond = rangerLevel >= 4;
  const canHunterCompanion = hunterLevel >= 1;
  const canCavalierMount = cavLevel >= 1;
  const canSamuraiMount = samLevel >= 1;
  if (
    !canNatureBond &&
    !canHuntersBond &&
    !canHunterCompanion &&
    !canCavalierMount &&
    !canSamuraiMount
  )
    return null;

  const companion = doc.build.animalCompanion;
  const species = companion ? BASE_COMPANIONS[companion.speciesId] : undefined;
  const sources = companion?.source ?? [];
  const effectiveLevel = companionEffectiveLevel(doc);
  const increaseSlots = companionAbilityIncreaseSlots(effectiveLevel);
  const abilityIncreases = companion?.abilityIncreases ?? [];
  const sizeIsSmall = refData.races[doc.identity.race]?.size === "sm";
  const mountHint = mountSpeciesHint(doc, refData).map((id) => BASE_COMPANIONS[id]?.name ?? id);
  // Full derived stat block (issue #68) — needed for the companion's OWN
  // hd/bab/abilities/skill totals/feat budget, none of which the raw
  // `AnimalCompanionBuild` alone carries.
  const derivedCompanion = deriveCompanionSheet(doc, refData);
  const chosenFeatIds = companion?.feats ?? [];
  const featCtx = derivedCompanion
    ? companionFeatPrereqContext(doc, derivedCompanion, refData)
    : undefined;

  return (
    <div className="subsection animal-companion-picker">
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
          Animal Companion
          {companion ? <span className="hint"> · {companion.name}</span> : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint animal-companion-hint">
            A tracked companion gets its own stat block on the Play tab — HD, BAB, saves, AC,
            attacks, and skills, derived from its effective druid level. Choose which class
            feature(s) grant it below.
          </p>
          <div className="chips animal-companion-source">
            {canNatureBond && (
              <button
                type="button"
                className="chip"
                aria-pressed={sources.includes("nature-bond")}
                onClick={() => update((d) => toggleCompanionSource(d, "nature-bond"))}
              >
                Nature Bond (druid {druidLevel})
              </button>
            )}
            {canHuntersBond && (
              <button
                type="button"
                className="chip"
                aria-pressed={sources.includes("hunters-bond")}
                onClick={() => update((d) => toggleCompanionSource(d, "hunters-bond"))}
              >
                Hunter's Bond (ranger {rangerLevel})
              </button>
            )}
            {canHunterCompanion && (
              <button
                type="button"
                className="chip"
                aria-pressed={sources.includes("hunter-companion")}
                onClick={() => update((d) => toggleCompanionSource(d, "hunter-companion"))}
              >
                Animal Companion (hunter {hunterLevel})
              </button>
            )}
            {canCavalierMount && (
              <button
                type="button"
                className="chip"
                aria-pressed={sources.includes("cavalier-mount")}
                onClick={() => update((d) => toggleCompanionSource(d, "cavalier-mount"))}
              >
                Mount (cavalier {cavLevel})
              </button>
            )}
            {canSamuraiMount && (
              <button
                type="button"
                className="chip"
                aria-pressed={sources.includes("samurai-mount")}
                onClick={() => update((d) => toggleCompanionSource(d, "samurai-mount"))}
              >
                Mount (samurai {samLevel})
              </button>
            )}
          </div>
          {(canCavalierMount || canSamuraiMount) &&
            (sources.includes("cavalier-mount") || sources.includes("samurai-mount")) && (
              <p className="hint animal-companion-mount-hint">
                RAW mount list for your size: {mountHint.join(", ")} (a GM may approve others).
                {sizeIsSmall ? " Boar and Dog additionally require 4th level." : ""}
              </p>
            )}

          {sources.length === 0 ? (
            <p className="hint">
              No companion source chosen yet — pick Nature Bond and/or Hunter's Bond above to add a
              companion.
            </p>
          ) : !companion ? (
            <button
              type="button"
              className="chip"
              onClick={() => update((d) => setCompanion(d, "wolf", "Companion"))}
            >
              Add a companion
            </button>
          ) : (
            <>
              <div className="familiar-fields animal-companion-fields">
                <select
                  className="familiar-select"
                  value={companion.speciesId}
                  onChange={(e) => update((d) => setCompanion(d, e.target.value, companion.name))}
                  aria-label="Companion species"
                >
                  {Object.entries(BASE_COMPANIONS).map(([id, def]) => (
                    <option key={id} value={id}>
                      {def.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="familiar-name"
                  placeholder="Name"
                  value={companion.name}
                  onChange={(e) =>
                    update((d) => setCompanion(d, companion.speciesId, e.target.value))
                  }
                  aria-label="Companion name"
                />
              </div>
              <textarea
                className="familiar-notes"
                placeholder="Notes (personality, tricks, house rules…)"
                value={companion.notes ?? ""}
                onChange={(e) => update((d) => setCompanionNotes(d, e.target.value))}
                aria-label="Companion notes"
              />
              {species && (
                <p className="hint familiar-effect">
                  {species.name}: {species.senses.join(", ")}. Speed{" "}
                  {Object.entries(species.speeds)
                    .map(([mode, ft]) => (mode === "land" ? `${ft} ft.` : `${mode} ${ft} ft.`))
                    .join(", ")}
                  . Effective level {effectiveLevel}.
                </p>
              )}
              {increaseSlots > 0 && (
                <div className="animal-companion-asi">
                  <span className="hint">Ability Score Increases:</span>
                  {Array.from({ length: increaseSlots }, (_, i) => (
                    <select
                      key={i}
                      className="familiar-select"
                      value={abilityIncreases[i] ?? "str"}
                      onChange={(e) =>
                        update((d) =>
                          setCompanionAbilityIncrease(d, i, e.target.value as AbilityId),
                        )
                      }
                      aria-label={`Ability Score Increase ${i + 1}`}
                    >
                      {ABILITY_OPTIONS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              )}
              {derivedCompanion && (
                <div className="animal-companion-skills">
                  <span
                    className={`hint${
                      derivedCompanion.skillPointsSpent > derivedCompanion.skillPointsAvailable
                        ? " warn-over"
                        : ""
                    }`}
                  >
                    Skill ranks: {derivedCompanion.skillPointsSpent} /{" "}
                    {derivedCompanion.skillPointsAvailable}
                  </span>
                  <div className="familiar-skill-grid">
                    {COMPANION_SKILL_IDS.map((id) => {
                      const skill = derivedCompanion.skills[id];
                      if (!skill) return null;
                      return (
                        <div key={id} className="companion-skill-rank-row">
                          <span className="fs-name">{skillName(id)}</span>
                          <NumberField
                            size={3}
                            value={skill.ranks}
                            min={0}
                            max={derivedCompanion.hd}
                            commitOnChange
                            onCommit={(n) => update((d) => setCompanionSkillRank(d, id, n))}
                            aria-label={`${skillName(id)} ranks`}
                          />
                          <span className="fs-val num">{skill.total}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {derivedCompanion && featCtx && (
                <div className="animal-companion-feats">
                  <span
                    className={`hint${
                      chosenFeatIds.length > derivedCompanion.bonusFeats ? " warn-over" : ""
                    }`}
                  >
                    Feats: {chosenFeatIds.length} / {derivedCompanion.bonusFeats}
                  </span>
                  <div className="chips">
                    {chosenFeatIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="chip"
                        aria-pressed
                        onClick={() => update((d) => toggleCompanionFeat(d, id))}
                        title="Remove"
                      >
                        {refData.feats[id]?.name ?? id} ✕
                      </button>
                    ))}
                  </div>
                  <select
                    className="familiar-select"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) update((d) => toggleCompanionFeat(d, e.target.value));
                    }}
                    aria-label="Add a companion feat"
                  >
                    <option value="">— add a feat —</option>
                    {Object.values(refData.feats)
                      .filter((f) => !chosenFeatIds.includes(f.id))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((f) => {
                        const blocked = evaluatePrereqs(f, featCtx).blocked;
                        return (
                          <option key={f.id} value={f.id} disabled={blocked}>
                            {f.name}
                            {blocked ? " (prereqs unmet)" : ""}
                          </option>
                        );
                      })}
                  </select>
                  <p className="hint">
                    Free pick from the full feat list (no animal-eligible filter in v1); prereqs
                    checked against the companion's own stats.
                  </p>
                </div>
              )}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => update((d) => clearCompanion(d))}
              >
                Remove companion
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
