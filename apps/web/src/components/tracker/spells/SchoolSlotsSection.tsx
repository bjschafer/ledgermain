/**
 * The wizard's arcane school slot track: one bonus slot per spell level,
 * restricted to the specialist's chosen school.
 */

import { useMemo } from "react";

import type { RefData, WizardSchoolTag } from "@pf1/schema";

import {
  isSchoolSlotEligible,
  prepareSchoolSpell,
  preparedSpells,
  removePreparedAt,
  schoolSlotCapacity,
  setExpendedAt,
  spellLevelMap,
} from "../../../model/preparedSpells.js";
import {
  ELEMENTAL_SCHOOL_LABELS,
  isElementalSchoolTag,
  SCHOOL_LABELS,
  spellSlotsByLevel,
} from "../../../model/spellcasting.js";
import type { BuilderProps } from "../../builder/types.js";
import { TipButton } from "../../InfoTip.js";
import { SpellDetail } from "../../SpellDetail.js";
import { ApplyBuffButton } from "./rowControls.js";

/**
 * The bonus school-slot grid for a specialist wizard. PF1 grants ONE school
 * spell slot per accessible spell level 1–9 (never cantrips, never a
 * Universalist);
 * the picker is filtered to spells whose `Spell.school` matches the chosen
 * specialization. Each school-prepare instance stores `kind: "school"` on the
 * doc, keeping it out of the class-slot capacity check in {@link PreparedView}
 * (mirrors {@link DomainSlotsSection}).
 */
export function SchoolSlotsSection({
  doc,
  refData,
  update,
  slots,
  abilityMod,
  casterLevel,
  classTag,
}: {
  doc: BuilderProps["doc"];
  refData: RefData;
  update: BuilderProps["update"];
  slots: ReturnType<typeof spellSlotsByLevel>;
  abilityMod: number;
  casterLevel: number;
  /** Stored class tag (see `model/spellcasting.ts` `storedClassTag`) — wizard school slots are always the wizard's own, but this scopes the bucketing correctly for a wizard that isn't the document's primary caster class. */
  classTag?: string;
}) {
  const school = doc.build.wizardSchool;
  const levelMap = useMemo(() => spellLevelMap(refData, "wizard"), [refData]);

  // Bucket school-kind prepared instances by their wizard spell level.
  type Row = { index: number; spellId: string; name: string; expended: boolean };
  const preparedByLevel = new Map<number, Row[]>();
  const prepared = preparedSpells(doc);
  prepared.forEach((p, index) => {
    if ((p.classTag ?? undefined) !== classTag) return;
    if ((p.kind ?? "normal") !== "school") return;
    const lvl = levelMap.get(p.spellId);
    if (lvl === undefined) return;
    const row: Row = {
      index,
      spellId: p.spellId,
      name: refData.spells[p.spellId]?.name ?? p.spellId,
      expended: p.expended,
    };
    (preparedByLevel.get(lvl) ?? preparedByLevel.set(lvl, []).get(lvl)!).push(row);
  });
  for (const arr of preparedByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

  // Per accessible spell level (1–9), the wizard's spellbook spells of the
  // chosen school (in-school AND already known — PF1 RAW requires the bonus
  // slot to be filled from the spellbook, not any spell of that school).
  const pickableByLevel = useMemo(() => {
    const out = new Map<number, { id: string; name: string }[]>();
    if (!school || school === "uni") return out;
    for (const slot of slots) {
      if (slot.level < 1 || slot.base === null) continue;
      const ids = refData.spellLists["wizard"]?.[slot.level] ?? [];
      const entries: { id: string; name: string }[] = [];
      for (const id of ids) {
        const sp = refData.spells[id];
        if (sp && isSchoolSlotEligible(sp, doc, refData)) entries.push({ id, name: sp.name });
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      out.set(slot.level, entries);
    }
    return out;
  }, [slots, school, refData, doc]);

  const accessibleLevels = [...pickableByLevel.keys()].sort((a, b) => a - b);
  if (!school || school === "uni" || accessibleLevels.length === 0) return null;

  const schoolLabel = isElementalSchoolTag(school)
    ? ELEMENTAL_SCHOOL_LABELS[school]
    : (SCHOOL_LABELS[school as WizardSchoolTag] ?? school);

  return (
    <div className="school-slots">
      <header className="school-slots-head">
        <h4 className="school-slots-title">School Slots ({schoolLabel})</h4>
        <p className="hint school-slots-hint">
          One bonus prepare-slot per accessible spell level, exclusive to {schoolLabel} spells (a
          Universalist gets none).
        </p>
      </header>

      {accessibleLevels.map((level) => {
        const rows = preparedByLevel.get(level) ?? [];
        const total = schoolSlotCapacity(level);
        const full = rows.length >= total;
        const pickable = pickableByLevel.get(level) ?? [];

        return (
          <section key={level} className="prep-level is-school">
            <header className="prep-head">
              <span className="prep-head-label">School L{level}</span>
              <span className={`prep-count${rows.length > total ? " is-over" : ""}`}>
                {rows.length}/{total} prepared
                {rows.length > 0 && ` · ${rows.filter((r) => !r.expended).length} ready`}
              </span>
            </header>

            {rows.length > 0 ? (
              <div className="prep-rows">
                {rows.map((r) => {
                  const spellData = refData.spells[r.spellId];
                  return (
                    <div key={r.index} className={`prep-row${r.expended ? " is-expended" : ""}`}>
                      <div className="prep-row-main">
                        <span className="prep-name">{r.name}</span>
                        {spellData && (
                          <SpellDetail
                            spell={spellData}
                            spellLevel={level}
                            abilityMod={abilityMod}
                            casterLevel={casterLevel}
                          />
                        )}
                      </div>
                      {spellData && (
                        <ApplyBuffButton
                          spell={spellData}
                          refData={refData}
                          doc={doc}
                          update={update}
                          casterLevel={casterLevel}
                          onCast={(d) => setExpendedAt(d, r.index, true)}
                        />
                      )}
                      {r.expended ? (
                        <button
                          type="button"
                          className="pick-btn add prep-cast"
                          onClick={() => update((d) => setExpendedAt(d, r.index, false))}
                        >
                          Recover
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="pick-btn remove prep-cast"
                          onClick={() => update((d) => setExpendedAt(d, r.index, true))}
                        >
                          Cast
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-ghost prep-x"
                        aria-label={`unprepare ${r.name}`}
                        onClick={() => update((d) => removePreparedAt(d, r.index))}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="prep-none">School slot empty.</p>
            )}

            {pickable.length > 0 ? (
              <details className="prep-add">
                <summary>
                  Prepare from {schoolLabel} level-{level} list…
                  {full && <span className="prep-full"> school slot filled</span>}
                </summary>
                <div className="prep-add-list">
                  {pickable.map((sp) => {
                    const count = rows.filter((r) => r.spellId === sp.id && !r.expended).length;
                    const spellData = refData.spells[sp.id];
                    return (
                      <div key={sp.id} className="prep-add-row">
                        <div className="prep-row-main">
                          <span className="prep-name">{sp.name}</span>
                          {spellData && (
                            <SpellDetail
                              spell={spellData}
                              spellLevel={level}
                              abilityMod={abilityMod}
                              casterLevel={casterLevel}
                            />
                          )}
                        </div>
                        {count > 0 && <span className="prep-have">prepared</span>}
                        <TipButton
                          className="pick-btn add"
                          aria-label={`prepare ${sp.name} in the school slot`}
                          disabled={full}
                          disabledReason="School slot is filled. Unprepare the current spell first."
                          onClick={() => update((d) => prepareSchoolSpell(d, sp.id, classTag))}
                        >
                          Prepare
                        </TipButton>
                      </div>
                    );
                  })}
                </div>
              </details>
            ) : (
              <p className="prep-none">
                No level-{level} {schoolLabel} spells on the wizard list.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shaman Spirit Magic — a bonus spontaneous slot per accessible spell level.
// ---------------------------------------------------------------------------
