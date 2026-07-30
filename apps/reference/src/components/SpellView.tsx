import type { Spell } from "@pf1/schema";
import { useState } from "react";

import {
  formatCastingTime,
  formatSpellArea,
  formatSpellComponents,
  formatSpellDuration,
  formatSpellRange,
  spellDamageParts,
} from "../model/spellStats.js";
import { joinDot, schoolName } from "../shared/format.js";
import { Chip, Description, Row, Sources } from "./parts.js";

const SAVE_LABEL: Record<string, string> = { fort: "Fortitude", ref: "Reflex", will: "Will" };

/** The save line, preferring the vendored prose ("Reflex half") over the bare type. */
function saveText(spell: Spell): string | null {
  for (const action of spell.actions) {
    const save = action.save;
    if (!save) continue;
    if (save.description?.trim()) return save.description.trim();
    if (save.type) return SAVE_LABEL[save.type] ?? save.type;
  }
  return null;
}

/**
 * The caster level a full caster first gets this spell at (1st level at CL 1,
 * 3rd at CL 5, …). It's the honest default for "what does this do when someone
 * casts it at me", and the input lets you dial in the actual caster.
 */
function defaultCasterLevel(spell: Spell): number {
  return Math.max(1, spell.level * 2 - 1);
}

/** `"yes (harmless)"` -> `"Yes (harmless)"` — matches the printed stat block's capitalization. */
function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function SpellView({ spell }: { spell: Spell }) {
  const [cl, setCl] = useState(() => defaultCasterLevel(spell));

  const damage = spellDamageParts(spell, cl);
  const save = saveText(spell);
  const classLevels = Object.entries(spell.learnedAt.class).sort(
    (a, b) => a[1] - b[1] || a[0].localeCompare(b[0]),
  );

  return (
    <>
      <p className="detail-sub">
        {joinDot([
          schoolName(spell.school),
          `Level ${spell.level}`,
          spell.descriptors.length > 0 ? spell.descriptors.join(", ") : null,
        ])}
      </p>

      <div className="stat-strip">
        {formatCastingTime(spell) && <Chip>{formatCastingTime(spell)}</Chip>}
        {formatSpellRange(spell, cl) && <Chip>{formatSpellRange(spell, cl)}</Chip>}
        {save && <Chip tone="save">{save}</Chip>}
        {damage.map((part) => (
          <Chip key={`${part.text}-${part.types.join()}`} tone="damage">
            {part.count && part.count > 1 ? `${part.text} ×${part.count}` : part.text}
            {part.types.length > 0 ? ` ${part.types.join("/")}` : ""}
          </Chip>
        ))}
      </div>

      <label className="cl-input">
        CL
        <input
          type="number"
          min={1}
          max={40}
          value={cl}
          onChange={(e) => setCl(Math.max(1, Number(e.target.value) || 1))}
        />
        <span className="cl-hint">caster level — rescales range, duration, and damage</span>
      </label>

      <div className="rows">
        <Row label="Components">{formatSpellComponents(spell)}</Row>
        <Row label="Duration">{formatSpellDuration(spell, cl)}</Row>
        <Row label="Area / Target">{formatSpellArea(spell)}</Row>
        <Row label="Spell Resistance">{spell.sr ? capitalize(spell.sr) : null}</Row>
        <Row label="Class levels">
          {classLevels.length > 0
            ? classLevels.map(([tag, level]) => `${tag} ${level}`).join(", ")
            : null}
        </Row>
      </div>

      <Description html={spell.description} />
      <Sources sources={spell.sources} />
    </>
  );
}
