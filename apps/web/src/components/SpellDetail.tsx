import type { Spell } from "@pf1/schema";

import type { ResolvedMetamagic } from "../model/metamagic.js";
import { concentrationDC, spellSaveDC } from "../model/spellcasting.js";
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
 * concentration DC are computed from — callers applying Heighten Spell pass the
 * heightened level here (issue #71). `slotLevel`, when it differs from
 * `spellLevel`, is the higher slot the spell occupies after metamagic and is
 * surfaced as its own line WITHOUT touching the DC (RAW: only Heighten changes
 * the DC). `metamagic` lists the applied feats as display-only context notes.
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
  metamagic?: ResolvedMetamagic[];
}) {
  const save = spellSave(spell);
  const dc = save ? spellSaveDC(spellLevel, abilityMod) : null;
  const saveLabel = save ? (SAVE_LABEL[save.type] ?? save.type) : null;
  const concDC = concentrationDC(spellLevel);
  const showSlot = slotLevel !== undefined && slotLevel !== spellLevel;

  const castingTime = formatCastingTime(spell);
  const range = formatSpellRange(spell, casterLevel);
  const area = formatSpellArea(spell);
  const duration = formatSpellDuration(spell, casterLevel);
  const components = formatSpellComponents(spell);
  const damage = spellDamageParts(spell, casterLevel);

  const hasStrip = castingTime !== null || range !== null || dc !== null || damage.length > 0;

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
        </div>
      )}

      <details className="spell-detail">
        <summary className="spell-detail-summary">details</summary>
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
              </span>
            </div>
          )}
          {spell.sr !== undefined && (
            <div className="spell-detail-row">
              <span className="spell-detail-label">SR</span>
              <span className="spell-detail-value">{spell.sr ? "Yes" : "No"}</span>
            </div>
          )}
          <div className="spell-detail-row">
            <span className="spell-detail-label">Concentration</span>
            <span className="spell-detail-value">DC {concDC} to cast defensively</span>
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
      </details>
    </>
  );
}
