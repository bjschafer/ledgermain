import { useMemo, useState } from "react";

import {
  NO_METAMAGIC_EFFECTS,
  metamagicSpellEffects,
  type MetamagicSpellEffects,
} from "@pf1/engine";
import type { AppliedMetamagic, DerivedClChecks, Spell } from "@pf1/schema";

import { resolveAppliedMetamagic, type ResolvedMetamagic } from "../model/metamagic.js";
import { concentrationDC, concentrationScenarios, spellSaveDC } from "../model/spellcasting.js";
import { spellDCAdjustment, srCheckBonus, srCheckDetail } from "../model/spellDCs.js";
import { detectSummonSpell, summonHelperHref } from "../model/summonLink.js";
import { useSpellBonuses } from "../state/spellBonuses.js";
import {
  formatCastingTime,
  formatSpellArea,
  formatSpellComponents,
  formatSpellDuration,
  formatSpellRange,
  spellDamageParts,
} from "../model/spellStats.js";

/** Save info from the first action that has a save, or null. */
function spellSave(spell: Spell): { type: string; description: string } | null {
  for (const action of spell.actions) {
    if (action.save?.type && action.save.description) {
      return { type: action.save.type, description: action.save.description };
    }
  }
  return null;
}

const SAVE_LABEL: Record<string, string> = {
  ref: "Reflex",
  will: "Will",
  fort: "Fortitude",
};

/**
 * Join a damage part's dice, types, and (for a multi-projectile spell) its
 * per-hit count for display, e.g. `"4d6 fire"`, `"1d4+1 force ×4"`.
 */
function damageLabel(part: { text: string; types: string[]; count?: number }): string {
  const dice = part.types.length > 0 ? `${part.text} ${part.types.join("/")}` : part.text;
  return part.count !== undefined ? `${dice} ×${part.count}` : dice;
}

/**
 * Inline spell detail shown under a spell name wherever a spell row appears —
 * the tracker's prepared/spontaneous/hybrid views and the builder's spell-list
 * references (searchable known list, granted cantrips, domain spells, and the
 * cleric's read-only class-list browser).
 *
 * Renders in two parts: an always-visible compact **stat strip** with the
 * at-the-table facts a caster reaches for mid-turn (casting time · range ·
 * save DC · damage),
 * and a collapsible **details** disclosure with the full breakdown (area,
 * duration, components, SR, concentration) plus the HTML description.
 *
 * `casterLevel` resolves every `@cl`-scaled value — range bands (`medium` →
 * `"Medium (140 ft.)"`), durations (`{units:"round", value:"@cl"}`), and damage
 * (`(min(10,@cl))d6` → `"4d6"`) — to a real number for this character.
 *
 * `spellLevel` is the spell's EFFECTIVE level, which the save DC and
 * concentration DC are computed from — callers applying Heighten Spell pass
 * the heightened level here. `slotLevel`, when it differs from `spellLevel`,
 * is the higher slot the spell occupies after metamagic and is surfaced as its
 * own line WITHOUT touching the DC (RAW: only Heighten changes the DC).
 *
 * `metamagic` is the feats applied to this casting. Every number they move
 * lands in the strip and the detail rows already: the damage carries Empower's
 * multiplier and Maximize's fixed total, the range band climbs for Reach and
 * doubles for Enlarge, the duration doubles for Extend, the area grows for
 * Widen, and riders like Dazing's daze get their own chips resolved against
 * `spellLevel`. The feats themselves are still named, with their full rules
 * text on hover, so a feat whose benefit the sheet can't compute is visible
 * rather than silently dropped.
 *
 * The sheet's Spell Focus / Spell Penetration-family bonuses come from
 * `useSpellBonuses` (see `state/spellBonuses.tsx` for why a context): the DC
 * chip silently folds the matching school bonus in (the details Save row
 * names the source), and the details SR row gains the character's full check
 * vs SR when a CL-check bonus exists.
 */
export function SpellDetail({
  spell,
  spellLevel,
  abilityMod,
  casterLevel,
  slotLevel,
  metamagic,
}: {
  spell: Spell;
  spellLevel: number;
  abilityMod: number;
  casterLevel: number;
  slotLevel?: number;
  metamagic?: AppliedMetamagic[];
}) {
  const { spellDCs, clChecks, summonFeats } = useSpellBonuses();
  const save = spellSave(spell);
  const dcAdjust = spellDCAdjustment(spellDCs, spell.school);
  const dc = save ? spellSaveDC(spellLevel, abilityMod) + dcAdjust.bonus : null;
  const saveLabel = save ? (SAVE_LABEL[save.type] ?? save.type) : null;

  // Both are pure derivations of the applied feats; memoized because the
  // browse pane in the spell manager renders a row per spell on a class list.
  const fx = useMemo(
    () =>
      metamagic?.length
        ? metamagicSpellEffects(metamagic, spell, spellLevel)
        : NO_METAMAGIC_EFFECTS,
    [metamagic, spell, spellLevel],
  );
  const applied = useMemo(() => resolveAppliedMetamagic(metamagic), [metamagic]);

  const castingTime = formatCastingTime(spell);
  const range = formatSpellRange(spell, casterLevel, fx);
  const damage = spellDamageParts(spell, casterLevel, fx);
  const summonSpell = detectSummonSpell(spell.name);
  const summonLink = summonSpell ? summonHelperHref(summonSpell, summonFeats, casterLevel) : null;

  const hasStrip =
    castingTime !== null ||
    range !== null ||
    dc !== null ||
    damage.length > 0 ||
    fx.riders.length > 0 ||
    summonLink !== null;

  // The body is built only once the disclosure is opened. A closed <details>
  // still constructs its whole subtree, and the browse pane in the spell
  // manager renders a row per spell on the class list — eagerly building the
  // stat table and the full HTML description for all of them put ~90k nodes on
  // the page and made opening the manager take seconds.
  const [open, setOpen] = useState(false);

  return (
    <>
      {hasStrip && (
        <div className="spell-strip">
          {castingTime && <span className="spell-chip">{castingTime}</span>}
          {range && <span className="spell-chip">{range}</span>}
          {dc !== null && (
            <span className="spell-chip is-save" title={save!.description}>
              {saveLabel} DC {dc}
            </span>
          )}
          {damage.map((d, i) => (
            <span key={i} className="spell-chip is-damage">
              {damageLabel(d)}
            </span>
          ))}
          {fx.riders.map((r) => (
            <span key={r.short} className="spell-chip is-rider" title={r.full}>
              {r.short}
            </span>
          ))}
          {summonLink && (
            <a
              className="spell-chip is-link"
              href={summonLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Open the reference site's summoning helper for this spell, with your feats and caster level preselected (opens in a new tab)"
            >
              Summon helper
            </a>
          )}
        </div>
      )}

      <details className="spell-detail" onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="spell-detail-summary">details</summary>
        {open && (
          <SpellDetailBody
            spell={spell}
            spellLevel={spellLevel}
            casterLevel={casterLevel}
            castingTime={castingTime}
            range={range}
            damage={damage}
            dc={dc}
            dcDetail={dcAdjust.detail}
            save={save}
            slotLevel={slotLevel}
            metamagic={applied}
            fx={fx}
            clChecks={clChecks}
          />
        )}
      </details>
    </>
  );
}

/** The opened half of `SpellDetail` — see the `open` note there for why it's split out. */
function SpellDetailBody({
  spell,
  spellLevel,
  casterLevel,
  castingTime,
  range,
  damage,
  dc,
  dcDetail,
  save,
  slotLevel,
  metamagic,
  fx,
  clChecks,
}: {
  spell: Spell;
  spellLevel: number;
  casterLevel: number;
  castingTime: string | null;
  range: string | null;
  damage: ReturnType<typeof spellDamageParts>;
  dc: number | null;
  dcDetail: string | null;
  save: { type: string; description: string } | null;
  slotLevel?: number;
  metamagic?: ResolvedMetamagic[];
  fx: MetamagicSpellEffects;
  clChecks?: DerivedClChecks;
}) {
  const area = formatSpellArea(spell, fx);
  const duration = formatSpellDuration(spell, casterLevel, fx);
  const components = formatSpellComponents(spell);
  const concDC = concentrationDC(spellLevel);
  const showSlot = slotLevel !== undefined && slotLevel !== spellLevel;

  return (
    <div className="spell-detail-body">
      {castingTime && (
        <div className="spell-detail-row">
          <span className="spell-detail-label">Casting Time</span>
          <span className="spell-detail-value">{castingTime}</span>
        </div>
      )}
      {range && (
        <div className="spell-detail-row">
          <span className="spell-detail-label">Range</span>
          <span className="spell-detail-value">{range}</span>
        </div>
      )}
      {area && (
        <div className="spell-detail-row">
          <span className="spell-detail-label">Area/Target</span>
          <span className="spell-detail-value">{area}</span>
        </div>
      )}
      {duration && (
        <div className="spell-detail-row">
          <span className="spell-detail-label">Duration</span>
          <span className="spell-detail-value">{duration}</span>
        </div>
      )}
      {components && (
        <div className="spell-detail-row">
          <span className="spell-detail-label">Components</span>
          <span className="spell-detail-value">{components}</span>
        </div>
      )}
      {damage.length > 0 && (
        <div className="spell-detail-row">
          <span className="spell-detail-label">Damage</span>
          <span className="spell-detail-value">{damage.map(damageLabel).join(", ")}</span>
        </div>
      )}
      {dc !== null && (
        <div className="spell-detail-row">
          <span className="spell-detail-label">Save</span>
          <span className="spell-detail-value">
            DC {dc} {save!.description}
            {dcDetail && <span className="spell-detail-fine">includes {dcDetail}</span>}
          </span>
        </div>
      )}
      {spell.sr !== undefined && (
        <div className="spell-detail-row">
          <span className="spell-detail-label">SR</span>
          <span className="spell-detail-value">
            {spell.sr.charAt(0).toUpperCase() + spell.sr.slice(1)}
            {/* The full check only renders for a character with a CL-check
                bonus — the base 1d20+CL case stays unannotated, and a spell
                SR never applies to (sr starts with "no") gets no line. */}
            {clChecks?.sr && !/^no\b/i.test(spell.sr) && (
              <span className="spell-detail-fine">
                your check 1d20+{casterLevel + srCheckBonus(clChecks)} vs SR (CL {casterLevel},{" "}
                {srCheckDetail(clChecks)})
              </span>
            )}
          </span>
        </div>
      )}
      <div className="spell-detail-row">
        <span className="spell-detail-label">Concentration</span>
        <span className="spell-detail-value">
          DC {concDC} to cast defensively
          <details className="conc-scenarios">
            <summary>other concentration DCs</summary>
            <ul className="conc-scenarios-list">
              {concentrationScenarios(spellLevel).map((s) => (
                <li key={s.id}>
                  DC {s.dc}
                  {s.externalTerm ? ` + ${s.externalTerm}` : ""}: {s.label}
                </li>
              ))}
            </ul>
          </details>
        </span>
      </div>
      {showSlot && (
        <div className="spell-detail-row">
          <span className="spell-detail-label">Slot</span>
          <span className="spell-detail-value">
            Level {slotLevel} (base {spellLevel})
          </span>
        </div>
      )}
      {metamagic && metamagic.length > 0 && (
        <div className="spell-detail-row">
          <span className="spell-detail-label">Metamagic</span>
          <span className="spell-detail-value">
            {metamagic.map((m) => (
              <span key={m.def.slug} className="spell-detail-metamagic" title={m.def.note}>
                {m.def.name}
                {m.def.variable ? ` +${m.increase}` : ""}
              </span>
            ))}
            {fx.riders.map((r) => (
              <span key={r.short} className="spell-detail-fine">
                {r.full}
              </span>
            ))}
          </span>
        </div>
      )}
      {spell.description && (
        <div
          className="spell-detail-desc"
          // HTML descriptions come from the Foundry PF1 data (open game
          // content) and contain only spell text — no user input. We render
          // them with dangerouslySetInnerHTML because they use formatting
          // tags (<p>, <i>, <strong>) that are meaningless as plain text.
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: spell.description }}
        />
      )}
    </div>
  );
}
