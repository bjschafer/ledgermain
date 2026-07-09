import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { classAlignmentWarnings } from "../../model/alignment.js";
import { type ClassCategory, groupClassesByCategory } from "../../model/classCategory.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import {
  addClass,
  removeClass,
  setClassLevel,
  setFavoredClass,
  setFavoredClass2,
  setFavoredClassBonus,
} from "../../model/doc.js";
import { favoredClassBonusLevels, isMultitalented } from "../../model/race.js";
import { AnimalCompanionPicker } from "./AnimalCompanionPicker.js";
import { ArcaneBondPicker } from "./ArcaneBondPicker.js";
import { ArcanistExploitPicker } from "./ArcanistExploitPicker.js";
import { ArchetypePicker } from "./ArchetypePicker.js";
import { BloodlinePicker } from "./BloodlinePicker.js";
import { BloodragerBloodlinePicker } from "./BloodragerBloodlinePicker.js";
import { ClassFeaturesList } from "./ClassFeaturesList.js";
import { CrueltyPicker } from "./CrueltyPicker.js";
import { CursePicker } from "./CursePicker.js";
import { DisciplinePicker } from "./DisciplinePicker.js";
import { DiscoveryPicker } from "./DiscoveryPicker.js";
import { DomainPicker } from "./DomainPicker.js";
import { FiendishBoonPicker } from "./FiendishBoonPicker.js";
import { HexPicker } from "./HexPicker.js";
import { ImplementPicker } from "./ImplementPicker.js";
import { InvestigatorTalentPicker } from "./InvestigatorTalentPicker.js";
import { KiPowerPicker } from "./KiPowerPicker.js";
import { MagusArcanaPicker } from "./MagusArcanaPicker.js";
import { MesmeristBoldStarePicker } from "./MesmeristBoldStarePicker.js";
import { MesmeristTrickPicker } from "./MesmeristTrickPicker.js";
import { MysteryPicker } from "./MysteryPicker.js";
import { NinjaTrickPicker } from "./NinjaTrickPicker.js";
import { PatronPicker } from "./PatronPicker.js";
import { PhrenicAmplificationPicker } from "./PhrenicAmplificationPicker.js";
import { FamiliarPicker } from "./FamiliarPicker.js";
import { PhantomPicker } from "./PhantomPicker.js";
import { ShifterAspectPicker } from "./ShifterAspectPicker.js";
import { TipButton } from "../InfoTip.js";
import { NumberField } from "./NumberField.js";
import { OrderPicker } from "./OrderPicker.js";
import { Panel } from "./Panel.js";
import { RagePowerPicker } from "./RagePowerPicker.js";
import { RangerPicker } from "./RangerPicker.js";
import { RevelationPicker } from "./RevelationPicker.js";
import { RogueFinesseWeaponsPicker } from "./RogueFinesseWeaponsPicker.js";
import { RogueSkillUnlocksPicker } from "./RogueSkillUnlocksPicker.js";
import { RogueTalentPicker } from "./RogueTalentPicker.js";
import { SchoolPicker } from "./SchoolPicker.js";
import { ShamanHexPicker } from "./ShamanHexPicker.js";
import { SpiritPicker } from "./SpiritPicker.js";
import { StyleStrikePicker } from "./StyleStrikePicker.js";
import type { BuilderProps } from "./types.js";
import { VigilanteSpecializationPicker } from "./VigilanteSpecializationPicker.js";
import { VigilanteTalentPicker } from "./VigilanteTalentPicker.js";
import { WeaponTrainingPicker } from "./WeaponTrainingPicker.js";

/**
 * One collapsible category tier in the class picker (Core / Base / Hybrid) —
 * the same shape as the race picker's `RaceGroupSection`. Rendered per group
 * (a stable set), so `useCollapsed` inside a list is fine. All tiers default
 * open: 31 chips across three sections is small enough not to declutter.
 */
function ClassGroupSection({
  category,
  label,
  count,
  children,
}: {
  category: ClassCategory;
  label: string;
  count: number;
  children: ReactNode;
}) {
  const [collapsed, toggle] = useCollapsed(`class-category:${category}`, false);
  const open = !collapsed;
  return (
    <div className="race-group">
      <div
        className="race-group-header"
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggle();
        }}
      >
        <span className="section-label">{label}</span>
        <span className="race-group-count">{count}</span>
        <span className="panel-caret">{open ? "▾" : "▸"}</span>
      </div>
      {open ? <div className="chips">{children}</div> : null}
    </div>
  );
}

export function ClassesSection({ doc, sheet, refData, update }: BuilderProps) {
  const [fcbOpen, setFcbOpen] = useState(true);
  const [confirmRemoveTag, setConfirmRemoveTag] = useState<string | null>(null);

  const baseClasses = useMemo(
    () =>
      Object.values(refData.classes)
        .filter((c) => c.subType === "base")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [refData],
  );
  // Core / Base / Hybrid sections (published Paizo categories, see
  // model/classCategory.ts) — alphabetical within each, mirroring the race
  // picker's rarity tiers.
  const classGroups = useMemo(() => groupClassesByCategory(baseClasses), [baseClasses]);

  const chosen = new Set(doc.identity.classes.map((c) => c.tag));
  const totalLevel = doc.identity.classes.reduce((s, c) => s + c.level, 0);

  const fcbHouserule = doc.build.settings?.fcbHouserule ?? false;
  const fcbChoices = doc.build.favoredClassBonus ?? [];
  // Half-Elf's Multitalented (issue #4): two favored classes instead of one —
  // see model/race.ts. Keyed off race name; no structured RefData flag exists.
  const multitalented = isMultitalented(doc, refData);
  // FCB slots = level of the favored class(es) (0 when none chosen; both
  // classes' levels for a Multitalented half-elf with a 2nd pick).
  const fcbLevel = favoredClassBonusLevels(doc, refData);

  // Standard options; house-rule replaces "hp"+"skill" with "both"
  const standardOptions = [
    { value: "hp" as const, label: "+1 HP" },
    { value: "skill" as const, label: "+1 Skill" },
    { value: "other" as const, label: "Alternate" },
  ];
  const houseruleOptions = [
    { value: "both" as const, label: "+1 HP & Skill" },
    { value: "alternate" as const, label: "Alternate" },
  ];
  const fcbOptions = fcbHouserule ? houseruleOptions : standardOptions;

  // Alignment restriction warnings (issue #53) — soft-warning only, never
  // blocks; suppressed entirely when the "unrestricted alignments" house
  // rule is on (see model/alignment.ts).
  const alignmentWarnings = classAlignmentWarnings(doc, refData);

  return (
    <Panel
      title="Classes"
      step="iv"
      right={<span className="hint">multiclass-capable · total level {totalLevel}</span>}
      storageKey="panel:Classes"
    >
      <div style={{ marginBottom: 14 }}>
        {classGroups.map((group) => (
          <ClassGroupSection
            key={group.category}
            category={group.category}
            label={group.label}
            count={group.items.length}
          >
            {group.items.map((c) => (
              <button
                key={c.tag}
                type="button"
                className="chip"
                aria-pressed={chosen.has(c.tag)}
                onClick={() =>
                  chosen.has(c.tag) ? setConfirmRemoveTag(c.tag) : update((d) => addClass(d, c.tag))
                }
              >
                {c.name}
              </button>
            ))}
          </ClassGroupSection>
        ))}
      </div>

      {doc.identity.classes.length === 0 ? (
        <p className="empty">No class chosen. Pick one or more above.</p>
      ) : (
        doc.identity.classes.map((cls) => {
          const def = baseClasses.find((c) => c.tag === cls.tag);
          const isFav = doc.identity.favoredClass === cls.tag;
          const isFav2 = doc.identity.favoredClass2 === cls.tag;
          return (
            <div className="class-row" key={cls.tag}>
              <button
                type="button"
                className="favstar"
                aria-pressed={isFav}
                title="Favored class"
                onClick={() => update((d) => setFavoredClass(d, cls.tag))}
              >
                {isFav ? "★" : "☆"}
              </button>
              {multitalented && (
                <TipButton
                  className="favstar favstar2"
                  aria-pressed={isFav2}
                  disabled={isFav}
                  disabledReason="Already your primary favored class"
                  title="2nd favored class (Half-Elf Multitalented)"
                  onClick={() => update((d) => setFavoredClass2(d, isFav2 ? null : cls.tag))}
                >
                  {isFav2 ? "✪" : "✩"}
                </TipButton>
              )}
              <span className="cname">{def?.name ?? cls.tag}</span>
              <span className="cls-hd-label">Hit Die d{def?.hd ?? "?"}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="cls-lv-label">Lv</span>
                <NumberField
                  className="num"
                  size={2}
                  readOnly
                  value={cls.level}
                  min={1}
                  max={20}
                  onCommit={(n) => update((d) => setClassLevel(d, cls.tag, n))}
                  aria-label={`${def?.name ?? cls.tag} level`}
                />
              </div>
              {confirmRemoveTag === cls.tag ? (
                <>
                  <span className="prep-clear-confirm-label">
                    Remove {def?.name ?? cls.tag} (lv {cls.level})?
                  </span>
                  <button
                    type="button"
                    className="pick-btn remove"
                    onClick={() => {
                      update((d) => removeClass(d, cls.tag));
                      setConfirmRemoveTag(null);
                    }}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setConfirmRemoveTag(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setConfirmRemoveTag(cls.tag)}
                >
                  remove
                </button>
              )}
            </div>
          );
        })
      )}

      {alignmentWarnings.map((w) => (
        <p key={w.classTag} className="hint affliction-warn">
          ⚠ {w.message}
        </p>
      ))}

      {/* Favored-class bonus picker — only when a favored class is chosen */}
      {fcbLevel > 0 && (
        <div className="subsection">
          <div
            className="subsection-header"
            onClick={() => setFcbOpen((o) => !o)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setFcbOpen((o) => !o);
            }}
            aria-expanded={fcbOpen}
          >
            <h3>Favored Class Bonus</h3>
            <span className="panel-caret">{fcbOpen ? "▾" : "▸"}</span>
          </div>
          {fcbOpen && (
            <div className="fcb-list">
              {multitalented && doc.identity.favoredClass2 != null && (
                <p className="hint">
                  Multitalented: slots below cover levels in both favored classes combined, not just
                  the starred primary.
                </p>
              )}
              {fcbLevel > 1 && (
                <div className="fcb-row fcb-row-all">
                  <span className="fcb-level">All levels</span>
                  <div className="fcb-chips">
                    {fcbOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className="fcb-chip fcb-chip-all"
                        title={`Set all ${fcbLevel} favored-class-bonus levels to "${opt.label}"`}
                        onClick={() =>
                          update((d) => {
                            let next = d;
                            for (let i = 0; i < fcbLevel; i++) {
                              next = setFavoredClassBonus(next, i, opt.value);
                            }
                            return next;
                          })
                        }
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {Array.from({ length: fcbLevel }, (_, i) => {
                const chosen = fcbChoices[i];
                return (
                  <div className="fcb-row" key={i}>
                    <span className="fcb-level">Lv {i + 1}</span>
                    <div className="fcb-chips">
                      {fcbOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className="fcb-chip"
                          aria-pressed={chosen === opt.value}
                          onClick={() => update((d) => setFavoredClassBonus(d, i, opt.value))}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Domain picker — cleric only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "cleric") && (
        <DomainPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Bloodline picker — sorcerer only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "sorcerer") && (
        <BloodlinePicker doc={doc} refData={refData} update={update} />
      )}

      {/* Bloodline picker — bloodrager only (issue #65; free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "bloodrager") && (
        <BloodragerBloodlinePicker doc={doc} refData={refData} update={update} />
      )}

      {/* Arcane school picker — wizard only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "wizard") && (
        <SchoolPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Arcane bond picker — wizard only (familiar or bonded object). */}
      {doc.identity.classes.some((c) => c.tag === "wizard") && (
        <ArcaneBondPicker doc={doc} update={update} />
      )}

      {/* Arcanist exploit picker — arcanist only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "arcanist") && (
        <ArcanistExploitPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Magus arcana picker — magus only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "magus") && (
        <MagusArcanaPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Mystery + curse + revelation pickers — oracle only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "oracle") && (
        <>
          <MysteryPicker doc={doc} refData={refData} update={update} />
          <CursePicker doc={doc} refData={refData} update={update} />
          <RevelationPicker doc={doc} refData={refData} update={update} />
        </>
      )}

      {/* Discipline + Phrenic Amplification pickers — psychic only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "psychic") && (
        <>
          <DisciplinePicker doc={doc} refData={refData} update={update} />
          <PhrenicAmplificationPicker doc={doc} refData={refData} update={update} />
        </>
      )}

      {/* Patron + hex pickers — witch only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "witch") && (
        <>
          <PatronPicker doc={doc} refData={refData} update={update} />
          <HexPicker doc={doc} refData={refData} update={update} />
        </>
      )}

      {/* Discovery picker — alchemist only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "alchemist") && (
        <DiscoveryPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Spirit + hex pickers — shaman only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "shaman") && (
        <>
          <SpiritPicker doc={doc} refData={refData} update={update} />
          <ShamanHexPicker doc={doc} refData={refData} update={update} />
        </>
      )}

      {/* Order picker — cavalier/samurai only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "cavalier" || c.tag === "samurai") && (
        <OrderPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Cruelty + Fiendish Boon pickers — antipaladin only (issue #65 wave B). */}
      {doc.identity.classes.some((c) => c.tag === "antipaladin") && (
        <>
          <CrueltyPicker doc={doc} update={update} />
          <FiendishBoonPicker doc={doc} update={update} />
        </>
      )}

      {/* Ninja trick picker — ninja only (issue #65 wave B, free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "ninja") && (
        <NinjaTrickPicker doc={doc} refData={refData} update={update} />
      )}
      {/* Rage power picker — barbarian (chained) OR barbarianUnchained; shared table (free-choice, soft warning only). */}
      {doc.identity.classes.some(
        (c) => c.tag === "barbarian" || c.tag === "barbarianUnchained",
      ) && <RagePowerPicker doc={doc} refData={refData} update={update} />}
      {/* Ki power + style strike pickers — Monk (Unchained) only (issue #65, free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "monkUnchained") && (
        <>
          <KiPowerPicker doc={doc} update={update} />
          <StyleStrikePicker doc={doc} update={update} />
        </>
      )}

      {/* Rogue talent picker — chained rogue AND Rogue (Unchained), shared field (issue #65, free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "rogue" || c.tag === "rogueUnchained") && (
        <RogueTalentPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Finesse Training weapon-type picks + Rogue's Edge (UC) skill unlock picks — Rogue (Unchained) only (issue #65). */}
      {doc.identity.classes.some((c) => c.tag === "rogueUnchained") && (
        <>
          <RogueFinesseWeaponsPicker doc={doc} update={update} />
          <RogueSkillUnlocksPicker doc={doc} update={update} />
        </>
      )}

      {/* Investigator talent picker — investigator only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "investigator") && (
        <InvestigatorTalentPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Specialization + talent pickers — vigilante only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "vigilante") && (
        <>
          <VigilanteSpecializationPicker doc={doc} update={update} />
          <VigilanteTalentPicker doc={doc} update={update} />
        </>
      )}

      {/* Aspect picker — shifter only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "shifter") && (
        <ShifterAspectPicker doc={doc} update={update} />
      )}

      {/* Trick + Bold Stare pickers — mesmerist only (issue #65 follow-through, free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "mesmerist") && (
        <>
          <MesmeristTrickPicker doc={doc} refData={refData} update={update} />
          <MesmeristBoldStarePicker doc={doc} update={update} />
        </>
      )}

      {/* Implement school + focus power pickers — occultist only (issue #65, free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "occultist") && (
        <ImplementPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Tracked familiar — class-agnostic (see FamiliarPicker's doc comment). */}
      <FamiliarPicker doc={doc} update={update} />

      {/* Tracked animal companion — druid Nature Bond / ranger Hunter's Bond / ACG Hunter's own Animal Companion. */}
      <AnimalCompanionPicker doc={doc} update={update} />

      {/* Tracked phantom — spiritualist's own Phantom class feature (issue #65). */}
      <PhantomPicker doc={doc} update={update} />

      {/* Ranger selections — favored enemy/terrain + combat style (ranger only). */}
      <RangerPicker doc={doc} update={update} />

      {/* Weapon Training group picks — fighter only, hidden once L5 or if an archetype replaced it. */}
      <WeaponTrainingPicker doc={doc} update={update} />

      {/* Archetype picker — only classes covered by the vendored dataset show options. */}
      <ArchetypePicker doc={doc} refData={refData} update={update} />

      <ClassFeaturesList sheet={sheet} refData={refData} />
    </Panel>
  );
}
