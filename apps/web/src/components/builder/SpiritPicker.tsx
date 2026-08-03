import { useMemo } from "react";

import {
  mergedShamanSpiritCatalog,
  SHAMAN_GREATER_SPIRIT_LEVEL,
  SHAMAN_MANIFESTATION_LEVEL,
  SHAMAN_TRUE_SPIRIT_LEVEL,
  type ShamanSpiritAbility,
} from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setShamanSpirit } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

/** One higher-tier ability row (Greater/True/Manifestation), skipped entirely for a vendored-only spirit whose placeholder ability has no name. */
function AbilityTier({ label, ability }: { label: string; ability: ShamanSpiritAbility }) {
  if (!ability.name) return null;
  return (
    <div className="mystery-class-skills">
      <span className="hint">
        {label} · {ability.name}
      </span>
      <p>{ability.summary}</p>
    </div>
  );
}

interface SpiritPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Shaman spirit selection (PF1 grants exactly one, chosen at L1, never changed
 * thereafter — mirrors `MysteryPicker` closely, the oracle's structural
 * analogue). Free-choice: soft warning only, same hybrid-prereqs posture as
 * `MysteryPicker`/`DisciplinePicker`.
 *
 * Browses the FULL published spirit catalog (`mergedShamanSpiritCatalog`) —
 * the 8 Advanced Class Guide "core" spirits (Battle, Bones, Flame, Heavens,
 * Life, Nature, Stone, Waves) keep their hand-verified spirit-magic spell
 * list/spirit ability/hexes (marked `badge-modeled` "M"); the ~10 other
 * vendored-only spirits (Ancestors, Dark Tapestry, Frost, Lore, Mammoth,
 * Restoration, Slums, Tribe, Wind, Wood) show their full vendored prose
 * instead — no spirit-magic spells/hexes surfaced for those (this table's
 * `hexesForSpirit`/spellcasting helpers only know the 8 core spirits).
 */
export function SpiritPicker({ doc, refData, update }: SpiritPickerProps) {
  const isShaman = doc.identity.classes.some((c) => c.tag === "shaman");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Spirit", false);

  const catalog = useMemo(
    () => [...mergedShamanSpiritCatalog(refData)].sort((a, b) => a.name.localeCompare(b.name)),
    [refData],
  );

  const chosen = doc.build.shamanSpirit ?? "";
  const spiritDef = catalog.find((s) => s.tag === chosen);

  if (!isShaman) return null;

  return (
    <div className="subsection mystery-picker">
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
          Spirit
          {spiritDef ? (
            <span className="hint">
              {" "}
              · {spiritDef.name}
              {!spiritDef.displayOnly && <span className="badge-modeled"> M</span>}
            </span>
          ) : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint mystery-picker-hint">
            Pick one spirit (PF1 grants one at level 1, never changed thereafter). Browses the full
            published catalog; entries marked <span className="badge-modeled">M</span> grant a
            Spirit Magic bonus-spell list, a 1st-level Spirit Ability, and access to 5 exclusive
            hexes (see Hexes below); the rest show their full published prose instead. Free-choice:
            no calling validation.
          </p>
          <select
            className="mystery-select"
            value={chosen}
            onChange={(e) => update((d) => setShamanSpirit(d, e.target.value || null))}
          >
            <option value="">(none chosen)</option>
            {catalog.map((s) => (
              <option key={s.tag} value={s.tag}>
                {s.name}
                {s.displayOnly ? "" : " (M)"}
              </option>
            ))}
          </select>

          {spiritDef &&
            (spiritDef.displayOnly ? (
              spiritDef.description ? (
                <FeatureDescription html={spiritDef.description} />
              ) : null
            ) : (
              <div className="mystery-preview">
                <div className="mystery-class-skills">
                  <span className="hint">Spirit Ability: {spiritDef.ability.name}</span>
                  <p>{spiritDef.ability.summary}</p>
                </div>
                <div className="mystery-class-skills">
                  <span className="hint">Spirit Animal</span>
                  <p>{spiritDef.spiritAnimalNote}</p>
                </div>
                <AbilityTier
                  label={`Greater Spirit Ability (${SHAMAN_GREATER_SPIRIT_LEVEL}th)`}
                  ability={spiritDef.greaterAbility}
                />
                <AbilityTier
                  label={`True Spirit Ability (${SHAMAN_TRUE_SPIRIT_LEVEL}th)`}
                  ability={spiritDef.trueAbility}
                />
                <AbilityTier
                  label={`Manifestation (${SHAMAN_MANIFESTATION_LEVEL}th)`}
                  ability={spiritDef.manifestation}
                />
                <ul className="mystery-bonus-spells">
                  {spiritDef.spiritMagicSpells.map((sp) => (
                    <li key={sp.id}>
                      <span className="cf-level">Spell Lv {sp.level}</span>{" "}
                      <span className="cf-name">{refData.spells[sp.id]?.name ?? sp.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </>
      )}
    </div>
  );
}
