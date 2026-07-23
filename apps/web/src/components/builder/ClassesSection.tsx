import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { classAlignmentWarnings } from "../../model/alignment.js";
import { type ClassCategory, groupClassesByCategory } from "../../model/classCategory.js";
import { evaluateClassPrereqs } from "../../model/classPrereqs.js";
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
import { BonusClassSkillsPicker } from "./BonusClassSkillsPicker.js";
import { BloodragerBloodlinePicker } from "./BloodragerBloodlinePicker.js";
import { CastingAdvancementPicker } from "./CastingAdvancementPicker.js";
import { ClassFeaturesList } from "./ClassFeaturesList.js";
import { CrueltyPicker } from "./CrueltyPicker.js";
import { CursePicker } from "./CursePicker.js";
import { DisciplinePicker } from "./DisciplinePicker.js";
import { DiscoveryPicker } from "./DiscoveryPicker.js";
import { DomainPicker } from "./DomainPicker.js";
import { DruidDomainPicker } from "./DruidDomainPicker.js";
import { EidolonPicker } from "./EidolonPicker.js";
import { FiendishBoonPicker } from "./FiendishBoonPicker.js";
import { HexPicker } from "./HexPicker.js";
import { ImplementPicker } from "./ImplementPicker.js";
import { InvestigatorTalentPicker } from "./InvestigatorTalentPicker.js";
import { KiPowerPicker } from "./KiPowerPicker.js";
import { KineticistPicker } from "./KineticistPicker.js";
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
import { SlayerTalentPicker } from "./SlayerTalentPicker.js";
import { ConfirmDialog } from "../ConfirmDialog.js";
import { InfoTip, TipButton } from "../InfoTip.js";
import { ShieldIcon } from "../icons.js";
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
import { SearchMiss } from "./SearchMiss.js";
import { ShamanHexPicker } from "./ShamanHexPicker.js";
import { SpiritPicker } from "./SpiritPicker.js";
import { StyleStrikePicker } from "./StyleStrikePicker.js";
import type { BuilderProps } from "./types.js";
import { VigilanteSpecializationPicker } from "./VigilanteSpecializationPicker.js";
import { VigilanteTalentPicker } from "./VigilanteTalentPicker.js";
import { WeaponTrainingPicker } from "./WeaponTrainingPicker.js";
import { Caret } from "../Caret.js";

/**
 * One collapsible category tier in the class picker (Core / Base / Hybrid) —
 * the same shape as the race picker's `RaceGroupSection`, including its
 * search-forces-open behavior: an active search (`forceOpen`) expands every
 * tier regardless of its own collapsed state, so a match is never hidden
 * inside a tier the player happened to leave closed. Every tier but Prestige
 * defaults open (31 chips across six sections is small enough not to
 * declutter); Prestige defaults COLLAPSED — issue #74 phase 2c grew it from
 * 11 hand-authored entries to 119 (the CRB ten + Student of War + ~108
 * vendored splatbook classes), the same "big tier starts closed" call the
 * race picker already makes for its 40+-entry "exotic" rarity tier.
 *
 * `plain` (issue #66 chunk 3): the Prestige tier needs a richer per-class row
 * (entry-requirement checks, not just a name) that doesn't fit the compact
 * flex-wrap `.chips` pill layout every other tier uses — `plain` renders
 * `children` directly instead of wrapping them in `.chips`, so the caller can
 * supply its own full-width list container for that one section.
 */
function ClassGroupSection({
  category,
  label,
  count,
  plain,
  forceOpen,
  children,
}: {
  category: ClassCategory;
  label: string;
  count: number;
  plain?: boolean;
  forceOpen: boolean;
  children: ReactNode;
}) {
  const [collapsed, toggle] = useCollapsed(`class-category:${category}`, category === "prestige");
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
      {open ? plain ? children : <div className="chips">{children}</div> : null}
    </div>
  );
}

export function ClassesSection({ doc, sheet, refData, update }: BuilderProps) {
  const [fcbOpen, setFcbOpen] = useState(true);
  const [confirmRemoveTag, setConfirmRemoveTag] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // "base" = every ordinary (non-prestige, non-NPC) playable class; "prestige"
  // = the hand-authored CRB prestige classes plus Student of War (issue #66
  // chunks 1 + 4) AND the ~108 vendored splatbook prestige classes (issue #74
  // phase 2c) — both flow through the same `subType === "prestige"` filter,
  // no separate wiring needed. Both render in the picker below
  // (`groupClassesByCategory` already sorts prestige into its own "Prestige"
  // tier by name, see model/classCategory.ts); npc/other Foundry subTypes
  // stay excluded, same as before. Also doubles as the class-def lookup for
  // the "already added" rows below, so a prestige class's name/HD/etc.
  // resolve there too — kept UNFILTERED by search so an already-added class
  // still resolves its name/HD while the picker above is mid-search.
  const pickerClasses = useMemo(
    () =>
      Object.values(refData.classes)
        .filter((c) => c.subType === "base" || c.subType === "prestige")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [refData],
  );
  // Search narrows the picker display only (118 base + 119 prestige = enough
  // that a flat scroll through the Prestige tier alone isn't great once you
  // know the name you want) — same inline top-of-panel search + "force every
  // tier open while searching" behavior as the race picker's `RaceSection`.
  const searchActive = query.trim().length > 0;
  const filteredPickerClasses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? pickerClasses.filter((c) => c.name.toLowerCase().includes(q)) : pickerClasses;
  }, [pickerClasses, query]);
  // Core / Base / Hybrid / … / Prestige sections (published Paizo categories,
  // see model/classCategory.ts) — alphabetical within each, mirroring the race
  // picker's rarity tiers.
  const classGroups = useMemo(
    () => groupClassesByCategory(filteredPickerClasses),
    [filteredPickerClasses],
  );
  const hasMatches = classGroups.some((g) => g.items.length > 0);

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
      icon={<ShieldIcon />}
      right={<span className="hint">multiclass-capable · total level {totalLevel}</span>}
      storageKey="panel:Classes"
    >
      <input
        className="search"
        type="text"
        placeholder="Search classes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search classes"
      />
      <div style={{ marginBottom: 14 }}>
        {classGroups.map((group) =>
          group.category === "prestige" ? (
            // Prestige classes carry structured entry requirements (issue #66
            // chunk 4) — unlike the plain name-only chips every other tier
            // uses, each not-yet-added entry here shows its own live
            // ✓/✗ check list (same visual language as FeatsSection's
            // `.pick-row`/`.preq`) and disables Add while a structured
            // prerequisite is unmet. An already-added prestige class is never
            // retroactively re-checked (evaluateClassPrereqs only gates
            // adding) — it just renders as a plain selected row.
            <ClassGroupSection
              key={group.category}
              category={group.category}
              label={group.label}
              count={group.items.length}
              forceOpen={searchActive}
              plain
            >
              <div className="prestige-class-list">
                {group.items.map((c) => {
                  const isChosen = chosen.has(c.tag);
                  const res = isChosen ? null : evaluateClassPrereqs(c, doc, refData, sheet.bab);
                  const blocked = res?.blocked ?? false;
                  return (
                    <div
                      key={c.tag}
                      className={`pick-row${isChosen ? " is-selected" : ""}${blocked ? " is-blocked" : ""}`}
                    >
                      <div className="pmain">
                        <div className="pname">{c.name}</div>
                        {res && (res.checks.length > 0 || res.softText) && (
                          <div className="preq">
                            {res.checks.map((chk, i) => (
                              <span key={i} className={chk.met ? "ck-met" : "ck-unmet"}>
                                {chk.met ? "✓" : "✗"} {chk.label}
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
                        )}
                      </div>
                      <button
                        type="button"
                        className={`pick-btn ${isChosen ? "remove" : "add"}`}
                        disabled={!isChosen && blocked}
                        title={!isChosen && blocked ? "Prerequisites not met" : undefined}
                        onClick={() =>
                          isChosen ? setConfirmRemoveTag(c.tag) : update((d) => addClass(d, c.tag))
                        }
                      >
                        {isChosen ? "Remove" : blocked ? "Locked" : "Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </ClassGroupSection>
          ) : (
            <ClassGroupSection
              key={group.category}
              category={group.category}
              label={group.label}
              count={group.items.length}
              forceOpen={searchActive}
            >
              {group.items.map((c) => (
                <button
                  key={c.tag}
                  type="button"
                  className="chip"
                  aria-pressed={chosen.has(c.tag)}
                  onClick={() =>
                    chosen.has(c.tag)
                      ? setConfirmRemoveTag(c.tag)
                      : update((d) => addClass(d, c.tag))
                  }
                >
                  {c.name}
                </button>
              ))}
            </ClassGroupSection>
          ),
        )}
        {!hasMatches ? <SearchMiss query={query.trim()} picker="classes" /> : null}
      </div>

      {doc.identity.classes.length === 0 ? (
        <p className="empty">No class chosen. Pick one or more above.</p>
      ) : (
        doc.identity.classes.map((cls) => {
          const def = pickerClasses.find((c) => c.tag === cls.tag);
          const isPrestige = def?.subType === "prestige";
          const isFav = doc.identity.favoredClass === cls.tag;
          const isFav2 = doc.identity.favoredClass2 === cls.tag;
          return (
            <div className="class-row" key={cls.tag}>
              {/* Prestige classes can never be a favored class (PF1 RAW — favored
                  class is chosen from a character's base/racial class options at
                  1st level; prestige classes are never eligible) — no star at all
                  for a prestige row, rather than a disabled one. */}
              {!isPrestige && (
                <button
                  type="button"
                  className="favstar"
                  aria-pressed={isFav}
                  title="Favored class"
                  onClick={() => update((d) => setFavoredClass(d, cls.tag))}
                >
                  {isFav ? "★" : "☆"}
                </button>
              )}
              {!isPrestige && multitalented && (
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
              <span className="cname">
                {def?.name ?? cls.tag}
                {isPrestige ? <span className="hint prestige-tag"> · prestige</span> : null}
              </span>
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
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setConfirmRemoveTag(cls.tag)}
              >
                remove
              </button>
            </div>
          );
        })
      )}

      {confirmRemoveTag != null &&
        (() => {
          const removingCls = doc.identity.classes.find((c) => c.tag === confirmRemoveTag);
          const removingDef = pickerClasses.find((c) => c.tag === confirmRemoveTag);
          return (
            <ConfirmDialog
              title="Remove class?"
              message={`Remove ${removingDef?.name ?? confirmRemoveTag} (lv ${removingCls?.level ?? "?"})?`}
              confirmLabel="Remove"
              onConfirm={() => {
                update((d) => removeClass(d, confirmRemoveTag));
                setConfirmRemoveTag(null);
              }}
              onCancel={() => setConfirmRemoveTag(null)}
            />
          );
        })()}

      {alignmentWarnings.map((w) => (
        <p key={w.classTag} className="hint affliction-warn">
          ⚠ {w.message}
        </p>
      ))}

      {/* Casting-advancement target pickers — only classes with a
          castingAdvancement slot show anything (issue #66 chunk 3). */}
      <CastingAdvancementPicker doc={doc} refData={refData} update={update} />

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
            <Caret open={fcbOpen} />
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

      {/* Nature-bond domain picker — druid only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "druid") && (
        <DruidDomainPicker doc={doc} refData={refData} update={update} />
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
        <ArcaneBondPicker doc={doc} refData={refData} sheet={sheet} update={update} />
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

      {/* Player-chosen bonus class skills — renders only when some feature grants them (issue #93). */}
      <BonusClassSkillsPicker doc={doc} refData={refData} update={update} />

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
          <KiPowerPicker doc={doc} refData={refData} update={update} />
          <StyleStrikePicker doc={doc} refData={refData} update={update} />
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
          <VigilanteTalentPicker doc={doc} refData={refData} update={update} />
        </>
      )}

      {/* Slayer talent picker — slayer only (issue #74 Phase 3b, free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "slayer") && (
        <SlayerTalentPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Aspect picker — shifter only (free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "shifter") && (
        <ShifterAspectPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Trick + Bold Stare pickers — mesmerist only (issue #65 follow-through, free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "mesmerist") && (
        <>
          <MesmeristTrickPicker doc={doc} refData={refData} update={update} />
          <MesmeristBoldStarePicker doc={doc} refData={refData} update={update} />
        </>
      )}

      {/* Implement school + focus power pickers — occultist only (issue #65, free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "occultist") && (
        <ImplementPicker doc={doc} refData={refData} update={update} />
      )}

      {/* Elemental Focus + wild talent pickers — kineticist only (issue #65, free-choice, soft warning only). */}
      {doc.identity.classes.some((c) => c.tag === "kineticist") && (
        <KineticistPicker doc={doc} refData={refData} update={update} />
      )}

      {/*
        Medium (issue #65): no builder picker — which legendary spirit is
        channeled is a LIVE daily séance choice, not a build-time pick (PF1
        RAW: chosen fresh "each morning"), so it's modeled entirely by the
        Séance tracker panel (live.mediumSpirit/live.mediumInfluence). This
        is just a discoverability pointer so a medium player looking here
        for a spirit picker isn't left wondering where it went.
      */}
      {doc.identity.classes.some((c) => c.tag === "medium") && (
        <p className="hint">
          A medium's legendary spirit is chosen fresh each day, not here — see the Séance panel in
          the Tracker.
        </p>
      )}

      {/*
        Tracked familiar — class-agnostic (see FamiliarPicker's doc comment).
        Hidden while a wizard's arcane bond is a bonded object and no familiar
        exists yet: RAW, that choice means no familiar at all, so offering
        "Add a familiar" right below "Bonded object" read as contradictory.
        Once a familiar exists (e.g. from before switching bond types, or
        granted by another class/feature) it stays visible so it can be
        edited or removed.
      */}
      {(doc.build.arcaneBond?.type !== "object" || doc.build.familiar) && (
        <FamiliarPicker doc={doc} update={update} />
      )}

      {/* Tracked animal companion — druid Nature Bond / ranger Hunter's Bond / ACG Hunter's own Animal Companion / cavalier & samurai Mount. */}
      <AnimalCompanionPicker doc={doc} refData={refData} update={update} />

      {/* Tracked phantom — spiritualist's own Phantom class feature (issue #65). */}
      <PhantomPicker doc={doc} update={update} />

      {/* Tracked eidolon — summoner's own Eidolon class feature (issue #65). */}
      <EidolonPicker doc={doc} refData={refData} update={update} />

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
