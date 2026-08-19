import type { CSSProperties } from "react";
import { useId, useMemo, useState } from "react";

import { EFFECT_IMMUNITY_LABELS, qualifierLabel } from "@pf1/engine";
import type { CharacterDoc, DerivedSheet, DerivedSkill, RefData } from "@pf1/schema";

import { useFlashKey } from "../hooks/useFlashKey.js";
import { baselineSheet } from "../model/baseline.js";
import { ABILITY_IDS } from "../model/doc.js";
import {
  casterLevelForClass,
  effectiveCasterClassLevel,
  isCasterTag,
} from "../model/casterLevel.js";
import { bypassChipLabel, bypassTip } from "../model/drBypassDisplay.js";
import { blastBurnWarning, blastSubLine } from "../model/kineticistBlastDisplay.js";
import { combinedLanguages } from "../model/languages.js";
import {
  ABILITY_ABBR,
  ALIGNMENT_LABELS,
  SAVE_ABBR,
  SAVE_NAMES,
  capitalizeFirst,
  signed,
  signedSequence,
  skillName,
} from "../model/names.js";
import {
  naturalAttackDamageLabel,
  naturalAttackName,
  naturalAttackNoteLine,
  naturalAttackTypeSuffix,
} from "../model/naturalAttackDisplay.js";
import { d20Formula, d20FormulaFor, damageFormula } from "../model/rollFormula.js";
import { senseChipLabel, senseTip } from "../model/sensesDisplay.js";
import { skillBreakdownComponents } from "../model/skillBreakdown.js";
import { weaponAttackSubLine } from "../model/weaponAttackDisplay.js";
import { AbilityDcList } from "./AbilityDcList.js";
import { CopyButton } from "./CopyButton.js";
import { HomebrewBadge } from "./HomebrewBadge.js";
import { InfoTip } from "./InfoTip.js";
import { Provenance } from "./Provenance.js";
import { StatSeal } from "./StatSeal.js";

/**
 * One skill row — split out from `Sheet` so it can own its own `useFlashKey`
 * call (one hook instance per skill; the list length can change between
 * renders, so the hook can't live in the `.map()` callback directly). Mirrors
 * `StatSeal`'s recompute shimmer at a smaller scale — no baseline tint here
 * (skills aren't in the audited tint set), just the "something changed" flash.
 *
 * Expands to a `Provenance` breakdown, the same reveal AC/saves/attacks use
 * (`StatSeal`'s button+caret pattern, at row scale — mirrors
 * `SavedRollRow`'s compact-row-expands-below shape rather than a full seal,
 * since a skill list is dozens of one-line rows, not a handful of big
 * numbers). `skillBreakdownComponents` stitches ranks/ability/class
 * skill/ACP onto the engine's own misc-modifier `components`.
 */
function SkillRow({ s, resetKey }: { s: DerivedSkill; resetKey: string | number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const total = signed(s.total);
  const flashKey = useFlashKey(total, resetKey);
  const components = useMemo(() => skillBreakdownComponents(s), [s]);
  return (
    <div
      className={`sheet-skill${s.classSkill ? " is-class" : ""}${s.ranks === 0 ? " is-untrained" : ""}`}
    >
      <div className="sheet-skill-head" title={s.ranks === 0 ? "Untrained" : undefined}>
        <button
          type="button"
          className="sheet-skill-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="caret">{open ? "▲" : "▼"}</span>
          <span className="sk-name">
            {skillName(s.id)}
            {s.classSkill ? (
              <span className="tag-cls" title="class skill">
                class
              </span>
            ) : null}
          </span>
        </button>
        <span className="sk-total num">
          {total}
          {flashKey > 0 ? <span key={flashKey} className="seal-flash" aria-hidden="true" /> : null}
        </span>
        <CopyButton
          className="copy-btn--row"
          text={d20Formula([s.total])}
          label={`${skillName(s.id)} check`}
        />
      </div>
      {open ? (
        <div id={panelId} className="sheet-skill-detail">
          <Provenance title={`${skillName(s.id)} breakdown`} components={components} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The live character sheet — a pure render of `compute()` output. It holds no
 * build logic; it updates because `useCharacter` recomputes on every doc change.
 */
export function Sheet({
  doc,
  sheet,
  refData,
  hideName = false,
}: {
  doc: CharacterDoc;
  sheet: DerivedSheet;
  refData: RefData;
  /** Set when an enclosing chrome (the mobile drawer's title bar) already shows the name. */
  hideName?: boolean;
}) {
  // Unconditioned baseline (no conditions/buffs/ability damage/negative
  // levels) — cheap, same "recompute rather than memoize cleverly" posture as
  // compute() itself; memoized on [doc, refData] since it's a second full
  // compute() pass, just not on every render for free.
  const baseline = useMemo(() => baselineSheet(doc, refData), [doc, refData]);

  const race = refData.races[doc.identity.race];
  const classLine = doc.identity.classes
    .map((c) => {
      const def = Object.values(refData.classes).find((cl) => cl.tag === c.tag);
      return `${def?.name ?? c.tag} ${c.level}`;
    })
    .join(" / ");
  // Per-class caster level. PF1 CL is per casting class, never summed; the
  // engine's `@cl` and model/casterLevel.ts both treat CL as max over
  // full-caster tags, but the sheet lists each so a multiclass caster can read
  // them off. `casterLevelForClass` is the seam where paladin/ranger-style
  // divergences (CL != class level) get wired in — don't read c.level directly
  // here. `effectiveCasterClassLevel` (2) folds in any prestige- class casting
  // advancement before that seam runs, so e.g. a Wizard 5 / Eldritch Knight 1
  // reads CL 6, not CL 5.
  const casterLine = doc.identity.classes
    .filter((c) => isCasterTag(c.tag))
    .map((c) => {
      const def = Object.values(refData.classes).find((cl) => cl.tag === c.tag);
      const cl = casterLevelForClass(c.tag, effectiveCasterClassLevel(doc, refData, c.tag));
      return `CL ${def?.name ?? c.tag} ${cl}`;
    })
    .join(" / ");

  const rollableSkills = Object.values(sheet.skills)
    .filter((s) => s.usable)
    .sort((a, b) => skillName(a.id).localeCompare(skillName(b.id)));

  // Tie the HP box's fill level to remaining HP (drains as damage is taken).
  const hpMax = sheet.hp.max;
  const hpEffective = doc.live.hp.current - doc.live.hp.nonlethal;
  const hpPct = hpMax > 0 ? Math.max(0, Math.min(1, hpEffective / hpMax)) : 1;
  const hpLow = hpMax > 0 && hpEffective <= Math.floor(hpMax / 4);

  return (
    <section className="sheet" aria-label="Live character sheet">
      {hideName ? null : <div className="char-name">{doc.identity.name || "Unnamed"}</div>}
      <div className="char-sub">
        {race ? (
          <>
            {race.name}
            <HomebrewBadge id={doc.identity.race} />
            {classLine ? ` · ${classLine}` : ""}
          </>
        ) : (
          classLine || "No race or class chosen"
        )}
        {sheet.level > 0 ? ` · Lvl ${sheet.level}` : ""}
      </div>
      {casterLine ? <div className="char-sub char-caster">{casterLine}</div> : null}
      {(() => {
        const id = doc.identity;
        const alignLabel = id.alignment ? (ALIGNMENT_LABELS[id.alignment] ?? id.alignment) : null;
        const details = [
          alignLabel,
          id.deity ? `Deity: ${id.deity}` : null,
          id.gender,
          id.age ? `Age ${id.age}` : null,
          [id.height, id.weight].filter(Boolean).join(", ") || null,
        ].filter(Boolean);
        return details.length > 0 ? (
          <div className="char-identity">{details.join(" · ")}</div>
        ) : null;
      })()}
      {(() => {
        const languages = combinedLanguages(doc, refData);
        return languages.length > 0 ? (
          <div className="char-identity char-languages">Languages: {languages.join(", ")}</div>
        ) : null;
      })()}

      <div className="ability-strip">
        {ABILITY_IDS.map((id) => {
          const a = sheet.abilities[id];
          return (
            <InfoTip
              className="ability-pip"
              key={id}
              content={`Total ${a.total}, from a base of ${a.base} before racial and other modifiers`}
            >
              <div className="ap-abbr">{ABILITY_ABBR[id]}</div>
              <div className="ap-mod num">{signed(a.mod)}</div>
              <div className="ap-score num">{a.total}</div>
            </InfoTip>
          );
        })}
      </div>

      <div className="rule-gold" />

      {/* HP hero band — current HP as dominant numeral, max in foot */}
      <div
        className="stat-hero-band"
        data-hp-low={hpLow}
        style={{ "--hp-pct": `${hpPct * 100}%` } as CSSProperties}
      >
        <StatSeal
          label="Hit Points"
          value={doc.live.hp.current}
          foot={`/ ${sheet.hp.max} max${doc.live.hp.temp > 0 ? ` · ${doc.live.hp.temp} temp` : ""}`}
          components={sheet.hp.components}
          provTitle="Hit Points breakdown"
          resetKey={doc.id}
        />
      </div>

      {/* Defense --------------------------------------------------- */}
      <div className="stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Defense</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--4">
          <StatSeal
            label="Armor Class"
            value={sheet.ac.normal}
            components={sheet.ac.components}
            provTitle="AC components"
            conditionals={sheet.ac.conditionals}
            unsignedConditionals
            resetKey={doc.id}
            baseline={baseline.ac.normal}
          />
          <StatSeal
            label="Touch"
            value={sheet.ac.touch}
            resetKey={doc.id}
            baseline={baseline.ac.touch}
          />
          <StatSeal
            label="Flat-Footed"
            value={sheet.ac.flatFooted}
            resetKey={doc.id}
            baseline={baseline.ac.flatFooted}
          />
          <StatSeal
            label="CMD"
            value={sheet.cmd}
            foot={`flat-footed ${sheet.cmdFlatFooted}`}
            conditionals={sheet.cmdConditionals}
            resetKey={doc.id}
            baseline={baseline.cmd}
          />
        </div>
      </div>

      {/* DR / energy resistance / SR, display-only. Kept out of the
          Defense group above: everyone has an AC and a CMD, but most characters
          have none of these, so an always-present heading would read as a gap. */}
      {sheet.defenses ? (
        <div className="stat-group">
          <div className="stat-group-header">
            <span className="stat-group-legend">Damage Reduction &amp; Resistances</span>
            <div className="stat-group-rule" />
          </div>
          <div className="stat-group-grid stat-group-grid--3">
            {sheet.defenses.dr.map((entry) => (
              <StatSeal
                key={`dr-${entry.qualifier}`}
                label={`DR/${qualifierLabel(entry.qualifier)}`}
                value={entry.total}
                components={entry.components}
                provTitle={`DR/${qualifierLabel(entry.qualifier)}`}
                className="seal--compact"
                resetKey={doc.id}
              />
            ))}
            {sheet.defenses.resistances.map((entry) => (
              <StatSeal
                key={`eres-${entry.qualifier}`}
                label={`Resist ${capitalizeFirst(qualifierLabel(entry.qualifier))}`}
                value={entry.total}
                components={entry.components}
                provTitle={`${qualifierLabel(entry.qualifier)} resistance`}
                className="seal--compact"
                resetKey={doc.id}
              />
            ))}
            {sheet.defenses.sr ? (
              <StatSeal
                label="SR"
                value={sheet.defenses.sr.total}
                components={sheet.defenses.sr.components}
                provTitle="Spell resistance"
                className="seal--compact"
                resetKey={doc.id}
              />
            ) : null}
            {/* Immunity is a flag, not a magnitude, so it gets a chip rather
                than a StatSeal — there is no number to seal. Chips live in
                their own full-width `.prof-strip` row (`.stat-group-grid >
                .prof-strip` spans every column) instead of as `--3` grid
                items directly, so each chip sizes to its text and wraps into
                a flowing row instead of stretching to a full 1fr column and
                wrapping its own label across two lines. */}
            {((sheet.defenses.immunities?.length ?? 0) > 0 ||
              (sheet.defenses.effectImmunities?.length ?? 0) > 0) && (
              <div className="prof-strip">
                {sheet.defenses.immunities?.map((entry) => (
                  <InfoTip
                    key={`imm-${entry.qualifier}`}
                    className="prof-chip immunity-chip"
                    content={`Immune to ${qualifierLabel(entry.qualifier)} damage, from ${entry.components
                      .filter((c) => c.applied)
                      .map((c) => c.source)
                      .join(", ")}`}
                  >
                    Immune: {capitalizeFirst(qualifierLabel(entry.qualifier))}
                  </InfoTip>
                ))}
                {/* Immunity to something that isn't damage (magic sleep,
                    paralysis, critical hits) — same chip, but nothing in
                    damage resolution consumes it, so the tooltip says so
                    outright. */}
                {sheet.defenses.effectImmunities?.map((entry) => (
                  <InfoTip
                    key={`immEffect-${entry.qualifier}`}
                    className="prof-chip immunity-chip"
                    content={`Immune to ${EFFECT_IMMUNITY_LABELS[entry.qualifier]}, from ${entry.components
                      .filter((c) => c.applied)
                      .map((c) => c.source)
                      .join(
                        ", ",
                      )}. Nothing rolls against this; it's here so you and your GM can see it.`}
                  >
                    Immune: {capitalizeFirst(EFFECT_IMMUNITY_LABELS[entry.qualifier] ?? "")}
                  </InfoTip>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Offense --------------------------------------------------- */}
      <div className="stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Offense</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--4">
          <StatSeal
            label="Melee"
            value={signedSequence(sheet.attack.melee.total, sheet.attack.melee.iteratives)}
            components={sheet.attack.melee.components}
            provTitle="Melee attack"
            resetKey={doc.id}
            baseline={baseline.attack.melee.total}
            numericValue={sheet.attack.melee.total}
            copy={{
              formula: d20FormulaFor(sheet.attack.melee.total, sheet.attack.melee.iteratives),
              label: "melee attack",
            }}
          />
          <StatSeal
            label="Ranged"
            value={signedSequence(sheet.attack.ranged.total, sheet.attack.ranged.iteratives)}
            components={sheet.attack.ranged.components}
            provTitle="Ranged attack"
            resetKey={doc.id}
            baseline={baseline.attack.ranged.total}
            numericValue={sheet.attack.ranged.total}
            copy={{
              formula: d20FormulaFor(sheet.attack.ranged.total, sheet.attack.ranged.iteratives),
              label: "ranged attack",
            }}
          />
          <StatSeal
            label="BAB"
            value={signed(sheet.bab)}
            className="seal--compact"
            resetKey={doc.id}
            baseline={baseline.bab}
            numericValue={sheet.bab}
          />
          <StatSeal
            label="CMB"
            value={signed(sheet.cmb)}
            conditionals={sheet.cmbConditionals}
            resetKey={doc.id}
            baseline={baseline.cmb}
            numericValue={sheet.cmb}
          />
        </div>
      </div>

      {/* Ability DCs — enemy-facing DCs the character herself inflicts (hex,
          channel energy, bomb, cruelty, mesmerist trick, Stunning Fist,
          Quivering Palm). Own group right after Offense: these aren't part
          of the melee/ranged/BAB/CMB block above, but they're the same
          "numbers you use to hurt something" family, so they sit next to it
          rather than under Casting or Tactical. Renders nothing when the
          character has none of the seven families. */}
      {sheet.abilityDCs && sheet.abilityDCs.length > 0 ? (
        <div className="stat-group">
          <div className="stat-group-header">
            <span className="stat-group-legend">Ability DCs</span>
            <div className="stat-group-rule" />
          </div>
          <AbilityDcList
            abilityDCs={sheet.abilityDCs}
            baselineDCs={baseline.abilityDCs}
            resetKey={doc.id}
          />
        </div>
      ) : null}

      {/* Casting — arcane spell failure —
          display-only, shown only for arcane casters (wizard/sorcerer/
          arcanist/magus/bard/summoner/skald/witch/bloodrager). Not a
          defense stat, so it gets its own group rather than living under
          Defense. */}
      {sheet.arcaneSpellFailure ? (
        <div className="stat-group">
          <div className="stat-group-header">
            <span className="stat-group-legend">Casting</span>
            <div className="stat-group-rule" />
          </div>
          <div className="stat-group-grid stat-group-grid--2">
            <StatSeal
              label="Spell Failure"
              value={`${sheet.arcaneSpellFailure.total}%`}
              foot={sheet.arcaneSpellFailure.exemptNote}
              className="seal--compact"
              resetKey={doc.id}
            />
          </div>
        </div>
      ) : null}

      {/* Per-weapon attacks ----------------------------------------- */}
      {sheet.attacks.length > 0 && (
        <div className="stat-group">
          <div className="stat-group-header">
            <span className="stat-group-legend">Attacks</span>
            <div className="stat-group-rule" />
          </div>
          <div className="weapon-attack-list">
            {sheet.attacks.map((atk, i) => {
              // Combine damageDice + signed numeric bonus into one display string.
              const bonusStr = atk.damageBonus.total !== 0 ? signed(atk.damageBonus.total) : null;
              const dmgStr =
                [atk.damageDice, bonusStr].filter(Boolean).join("") ||
                signed(atk.damageBonus.total);
              // build.weapons is untouched by baselineSheet's live-only strip, so
              // the attacks array lines up index-for-index with `sheet.attacks`.
              const baseAtk = baseline.attacks[i];
              const subLine = weaponAttackSubLine(atk);
              return (
                <div key={i} className="weapon-attack-row">
                  <span className="weapon-attack-name">
                    {atk.name}
                    {subLine && <span className="hint blast-line-sub">{subLine}</span>}
                  </span>
                  <div className="weapon-attack-stats">
                    <StatSeal
                      label="Attack"
                      value={signedSequence(atk.attack.total, atk.attack.iteratives)}
                      components={atk.attack.components}
                      provTitle={`${atk.name} attack`}
                      className="seal--compact"
                      resetKey={doc.id}
                      baseline={baseAtk?.attack.total}
                      numericValue={atk.attack.total}
                      copy={{
                        formula: d20FormulaFor(atk.attack.total, atk.attack.iteratives),
                        label: `${atk.name} attack`,
                      }}
                    />
                    <StatSeal
                      label="Dmg"
                      value={dmgStr}
                      components={
                        atk.damageBonus.components.length > 0
                          ? atk.damageBonus.components
                          : undefined
                      }
                      provTitle={`${atk.name} damage`}
                      className="seal--compact"
                      resetKey={doc.id}
                      baseline={baseAtk?.damageBonus.total}
                      numericValue={atk.damageBonus.total}
                      copy={{
                        formula: damageFormula(atk.damageDice, atk.damageBonus.total),
                        label: `${atk.name} damage`,
                      }}
                    />
                    <StatSeal
                      label="Crit"
                      value={atk.crit}
                      className="seal--compact"
                      resetKey={doc.id}
                    />
                  </div>
                  {/* What this weapon gets through: material, plus, alignment
                      ability, or a monk's/brawler's unarmed class feature. A
                      flag rather than a magnitude, so same chip the immunity
                      lines use rather than a fourth seal. */}
                  {atk.drBypass?.length ? (
                    <div className="weapon-attack-bypass">
                      <span className="weapon-attack-bypass-label">Bypasses DR</span>
                      {atk.drBypass.map((b) => (
                        <InfoTip
                          key={`bypass-${b.qualifier}`}
                          className="prof-chip bypass-chip"
                          content={bypassTip(b)}
                        >
                          {bypassChipLabel(b)}
                        </InfoTip>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Natural attacks (the PC's own claws/bite/etc; omitted from the
          engine entirely while an active-form is running, so this never
          shows alongside a polymorph form's attack lines) ------------- */}
      {sheet.naturalAttacks && sheet.naturalAttacks.length > 0 && (
        <div className="stat-group">
          <div className="stat-group-header">
            <span className="stat-group-legend">Natural Attacks</span>
            <div className="stat-group-rule" />
          </div>
          <div className="weapon-attack-list">
            {sheet.naturalAttacks.map((atk, i) => {
              const dmgStr = naturalAttackDamageLabel(atk);
              const suffix = naturalAttackTypeSuffix(atk);
              const noteLine = naturalAttackNoteLine(atk);
              // Matched by name rather than index: a buff-gated grant can
              // appear/vanish between live and baseline, same reasoning as
              // the kinetic-blast baseline lookup below.
              const baseAtk = baseline.naturalAttacks?.find((b) => b.name === atk.name);
              return (
                <div key={i} className="weapon-attack-row">
                  <span className="weapon-attack-name">
                    {naturalAttackName(atk)}
                    {suffix && <span className="hint"> {suffix}</span>}
                    {noteLine && <span className="hint blast-line-sub">{noteLine}</span>}
                  </span>
                  <div className="weapon-attack-stats">
                    <StatSeal
                      label="Attack"
                      value={signed(atk.attackBonus)}
                      components={atk.attackComponents}
                      provTitle={`${atk.name} attack`}
                      className="seal--compact"
                      resetKey={doc.id}
                      baseline={baseAtk?.attackBonus}
                      numericValue={atk.attackBonus}
                      copy={{
                        formula: d20Formula([atk.attackBonus]),
                        label: `${atk.name} attack`,
                      }}
                    />
                    <StatSeal
                      label="Dmg"
                      value={dmgStr}
                      components={
                        atk.damageComponents.length > 0 ? atk.damageComponents : undefined
                      }
                      provTitle={`${atk.name} damage`}
                      className="seal--compact"
                      resetKey={doc.id}
                      baseline={baseAtk?.damageBonus}
                      numericValue={atk.damageBonus}
                      copy={{
                        formula: damageFormula(atk.damageDice, atk.damageBonus),
                        label: `${atk.name} damage`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kinetic blasts ---------------------------------------------- */}
      {sheet.kineticBlasts.length > 0 && (
        <div className="stat-group">
          <div className="stat-group-header">
            <span className="stat-group-legend">Kinetic Blasts</span>
            <div className="stat-group-rule" />
          </div>
          <div className="weapon-attack-list">
            {sheet.kineticBlasts.map((blast) => {
              const bonusStr =
                blast.damageBonus.total !== 0 ? signed(blast.damageBonus.total) : null;
              const dmgStr = [blast.damageDice, bonusStr].filter(Boolean).join("");
              // The blast lines are recomputed from live burn (Elemental
              // Overflow), so the baseline is looked up by id rather than by
              // index — a composite can appear or vanish between the two.
              const baseBlast = baseline.kineticBlasts.find((b) => b.id === blast.id);
              return (
                <div key={blast.id} className="weapon-attack-row">
                  <span className="weapon-attack-name">
                    {blast.name}
                    <span className="hint blast-line-sub">{blastSubLine(blast)}</span>
                    {blast.infusions.length > 0 && (
                      <span className="hint blast-line-sub blast-line-infusions">
                        {blast.infusions
                          .map(
                            (inf) =>
                              `${inf.name}${
                                inf.save
                                  ? ` (${SAVE_ABBR[inf.save.type]} DC ${inf.save.dc} ${inf.save.effect})`
                                  : ""
                              }`,
                          )
                          .join(" · ")}
                      </span>
                    )}
                    {blast.damageQualifier ? (
                      <span className="hint blast-line-sub">{blast.damageQualifier}</span>
                    ) : null}
                    {blastBurnWarning(blast.burnCost) ? (
                      <span className="hint blast-line-sub warn-over">
                        {blastBurnWarning(blast.burnCost)}
                      </span>
                    ) : null}
                  </span>
                  <div className="weapon-attack-stats">
                    <StatSeal
                      label={blast.touch ? "Touch Atk" : "Attack"}
                      value={signed(blast.attack.total)}
                      components={blast.attack.components}
                      provTitle={`${blast.name} attack`}
                      className="seal--compact"
                      resetKey={doc.id}
                      baseline={baseBlast?.attack.total}
                      numericValue={blast.attack.total}
                      copy={{
                        formula: d20Formula([blast.attack.total]),
                        label: `${blast.name} attack`,
                      }}
                    />
                    <StatSeal
                      label="Dmg"
                      value={dmgStr}
                      components={blast.damageBonus.components}
                      provTitle={`${blast.name} damage`}
                      className="seal--compact"
                      resetKey={doc.id}
                      baseline={baseBlast?.damageBonus.total}
                      numericValue={blast.damageBonus.total}
                      copy={{
                        formula: damageFormula(blast.damageDice, blast.damageBonus.total),
                        label: `${blast.name} damage`,
                      }}
                    />
                    <StatSeal
                      label="Crit"
                      value={blast.crit}
                      className="seal--compact"
                      resetKey={doc.id}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Senses (darkvision, low-light, scent, ...) — display-only, same
          chip-strip treatment as Proficiencies. */}
      {sheet.senses.length > 0 && (
        <div className="stat-group">
          <div className="stat-group-header">
            <span className="stat-group-legend">Senses</span>
            <div className="stat-group-rule" />
          </div>
          <div className="prof-strip">
            {sheet.senses.map((sense) => (
              <InfoTip key={sense.kind} className="prof-chip" content={senseTip(sense)}>
                {senseChipLabel(sense)}
              </InfoTip>
            ))}
          </div>
        </div>
      )}

      {/* Saving Throws ---------------------------------------------- */}
      <div className="stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Saves</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--3">
          {(["fort", "ref", "will"] as const).map((save) => (
            <StatSeal
              key={save}
              label={SAVE_ABBR[save]}
              value={signed(sheet.saves[save].total)}
              components={sheet.saves[save].components}
              conditionals={sheet.saves[save].conditionals}
              provTitle={`${SAVE_NAMES[save]} save`}
              resetKey={doc.id}
              baseline={baseline.saves[save].total}
              numericValue={sheet.saves[save].total}
              copy={{
                formula: d20Formula([sheet.saves[save].total]),
                label: `${SAVE_NAMES[save]} save`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Tactical --------------------------------------------------- */}
      <div className="stat-group">
        <div className="stat-group-header">
          <span className="stat-group-legend">Tactical</span>
          <div className="stat-group-rule" />
        </div>
        <div className="stat-group-grid stat-group-grid--2">
          <StatSeal
            label="Init"
            value={signed(sheet.initiative.total)}
            components={sheet.initiative.components}
            className="seal--compact"
            resetKey={doc.id}
            baseline={baseline.initiative.total}
            numericValue={sheet.initiative.total}
            copy={{ formula: d20Formula([sheet.initiative.total]), label: "initiative" }}
          />
          <StatSeal
            label="Speed"
            value={sheet.speeds.land ?? 30}
            foot="ft"
            className="seal--compact"
            resetKey={doc.id}
            baseline={baseline.speeds.land ?? 30}
          />
          {(sheet.speeds.fly ?? 0) > 0 && (
            <StatSeal
              label="Fly"
              value={sheet.speeds.fly!}
              foot="ft"
              className="seal--compact"
              resetKey={doc.id}
              baseline={baseline.speeds.fly ?? 0}
            />
          )}
          {(sheet.speeds.swim ?? 0) > 0 && (
            <StatSeal
              label="Swim"
              value={sheet.speeds.swim!}
              foot="ft"
              className="seal--compact"
              resetKey={doc.id}
              baseline={baseline.speeds.swim ?? 0}
            />
          )}
          {(sheet.speeds.climb ?? 0) > 0 && (
            <StatSeal
              label="Climb"
              value={sheet.speeds.climb!}
              foot="ft"
              className="seal--compact"
              resetKey={doc.id}
              baseline={baseline.speeds.climb ?? 0}
            />
          )}
          {(sheet.speeds.burrow ?? 0) > 0 && (
            <StatSeal
              label="Burrow"
              value={sheet.speeds.burrow!}
              foot="ft"
              className="seal--compact"
              resetKey={doc.id}
              baseline={baseline.speeds.burrow ?? 0}
            />
          )}
        </div>
      </div>

      <h3>Skills</h3>
      {rollableSkills.length === 0 ? (
        <div className="empty">No skills available.</div>
      ) : (
        <div className="sheet-skill-list">
          {rollableSkills.map((s) => (
            <SkillRow key={s.id} s={s} resetKey={doc.id} />
          ))}
        </div>
      )}

      {/* Proficiencies — read-only, provenance on hover/tap. Last
          on the sheet on purpose: what you're proficient with is settled at
          build time and almost never consulted mid-combat, so it shouldn't
          push the numbers that are down the page. */}
      {(sheet.proficiencies.weapons.length > 0 || sheet.proficiencies.armor.length > 0) && (
        <div className="stat-group">
          <div className="stat-group-header">
            <span className="stat-group-legend">Proficiencies</span>
            <div className="stat-group-rule" />
          </div>
          <div className="prof-strip">
            {[...sheet.proficiencies.weapons, ...sheet.proficiencies.armor].map((line, i) => (
              <InfoTip
                key={`${line.label}-${i}`}
                className="prof-chip"
                content={`Granted by ${line.grants.map((g) => g.source).join(", ")}`}
              >
                {line.label}
              </InfoTip>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
