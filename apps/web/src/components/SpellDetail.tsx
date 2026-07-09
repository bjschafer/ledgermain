import type { Spell } from "@pf1/schema";

import type { ResolvedMetamagic } from "../model/metamagic.js";
import { concentrationDC, spellSaveDC } from "../model/spellcasting.js";

/** Save info from the first action that has a save, or null. */
function spellSave(spell: Spell): { type: string; description: string } | null {
  for (const action of spell.actions) {
    if (action.save?.type && action.save.description) {
      return { type: action.save.type, description: action.save.description };
    }
  }
  return null;
}

/**
 * Collapsible spell detail panel showing save DC, concentration DC, SR, and
 * the HTML description. Rendered inline under the spell name wherever a spell
 * row appears — the tracker's prepared/spontaneous views and the builder's
 * spell-list references (searchable known list, granted cantrips, domain
 * spells, and the cleric's read-only class-list browser).
 *
 * `spellLevel` is the spell's EFFECTIVE level, which the save DC and
 * concentration DC are computed from — callers applying Heighten Spell pass
 * the heightened level here (issue #71). `slotLevel`, when it differs from
 * `spellLevel`, is the higher slot the spell occupies after metamagic and is
 * surfaced as its own line WITHOUT touching the DC (RAW: only Heighten changes
 * the DC). `metamagic` lists the applied feats as display-only context notes.
 */
export function SpellDetail({
  spell,
  spellLevel,
  abilityMod,
  slotLevel,
  metamagic,
}: {
  spell: Spell;
  spellLevel: number;
  abilityMod: number;
  slotLevel?: number;
  metamagic?: ResolvedMetamagic[];
}) {
  const save = spellSave(spell);
  const dc = save ? spellSaveDC(spellLevel, abilityMod) : null;
  const concDC = concentrationDC(spellLevel);
  const showSlot = slotLevel !== undefined && slotLevel !== spellLevel;

  return (
    <details className="spell-detail">
      <summary className="spell-detail-summary">details</summary>
      <div className="spell-detail-body">
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
        {dc !== null && (
          <div className="spell-detail-row">
            <span className="spell-detail-label">Save</span>
            <span className="spell-detail-value">
              DC {dc} {save!.description}
            </span>
          </div>
        )}
        {spell.sr === false && (
          <div className="spell-detail-row">
            <span className="spell-detail-label">SR</span>
            <span className="spell-detail-value">No</span>
          </div>
        )}
        <div className="spell-detail-row">
          <span className="spell-detail-label">Concentration</span>
          <span className="spell-detail-value">DC {concDC} to cast defensively</span>
        </div>
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
  );
}
