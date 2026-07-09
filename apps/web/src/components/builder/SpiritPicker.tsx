import { useMemo } from "react";

import { SHAMAN_SPIRITS, SHAMAN_SPIRIT_TAGS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setShamanSpirit } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface SpiritPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Shaman spirit selection (issue #65; PF1 grants exactly one, chosen at L1,
 * never changed thereafter — mirrors `MysteryPicker` closely, the oracle's
 * structural analogue). Free-choice: soft warning only, same hybrid-prereqs
 * posture as `MysteryPicker`/`DisciplinePicker`.
 *
 * Scope: the 8 Advanced Class Guide "core" spirits (Battle, Bones, Flame,
 * Heavens, Life, Nature, Stone, Waves) — see `@pf1/engine`
 * `shaman-spirits.ts`'s doc comment.
 *
 * The chosen spirit grants: a Spirit Magic bonus-spell list (one spell per
 * spell level, shown once accessible — see `model/spellcasting.
 * shamanSpiritSpellsKnown`, surfaced in the Spells section/tracker), a
 * note-tier 1st-level Spirit Ability (shown in the Class Features list), and
 * access to 5 exclusive hexes (see `HexPicker` below).
 */
export function SpiritPicker({ doc, refData, update }: SpiritPickerProps) {
  const isShaman = doc.identity.classes.some((c) => c.tag === "shaman");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Spirit", false);

  const spirits = useMemo(() => [...SHAMAN_SPIRIT_TAGS].sort(), []);

  const chosen = doc.build.shamanSpirit ?? "";
  const spiritDef = SHAMAN_SPIRITS[chosen];

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
          {spiritDef ? <span className="hint"> · {spiritDef.name}</span> : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint mystery-picker-hint">
            Pick one spirit (PF1 grants one at level 1, never changed thereafter). It grants a
            Spirit Magic bonus-spell list, a 1st-level Spirit Ability (note-tier — see the Class
            Features list), and access to 5 exclusive hexes (see Hexes below). Free-choice — no
            calling validation.
          </p>
          <select
            className="mystery-select"
            value={chosen}
            onChange={(e) => update((d) => setShamanSpirit(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {spirits.map((tag) => (
              <option key={tag} value={tag}>
                {SHAMAN_SPIRITS[tag]?.name ?? tag}
              </option>
            ))}
          </select>

          {spiritDef && (
            <div className="mystery-preview">
              <div className="mystery-class-skills">
                <span className="hint">Spirit Ability — {spiritDef.ability.name}</span>
                <p>{spiritDef.ability.summary}</p>
              </div>
              <div className="mystery-class-skills">
                <span className="hint">Spirit Animal</span>
                <p>{spiritDef.spiritAnimalNote}</p>
              </div>
              <ul className="mystery-bonus-spells">
                {spiritDef.spiritMagicSpells.map((sp) => (
                  <li key={sp.id}>
                    <span className="cf-level">Spell Lv {sp.level}</span>{" "}
                    <span className="cf-name">{refData.spells[sp.id]?.name ?? sp.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
