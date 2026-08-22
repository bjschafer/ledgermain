/**
 * What a caster class can actually cast, assembled in one place.
 *
 * A caster's castable set is never just `build.spells.known`: bloodlines,
 * mysteries, curses, channel lines, psychic disciplines, witch patrons, and
 * archetype grants all add spells that are cap-exempt but fully castable, and
 * undercastable psychic chains grant every lower version of a known spell.
 * The tracker's Spells panel needs that union to render slots; the gear
 * section's crafting picker needs it to answer "which spells may I scribe".
 * Both read it from here so the two can never drift.
 */

import type { CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { effectiveCasterClassLevel } from "./casterLevel.js";
import { parentBloodlineTagOf } from "./doc.js";
import { spellLevelMap } from "./preparedSpells.js";
import {
  accessibleSpellLevels,
  bloodlineSpellsKnown,
  casterModelFor,
  curseSpellsKnown,
  disciplineSpellsKnown,
  grantedCantrips,
  knownSpellsFor,
  mysterySpellsKnown,
  oracleChannelSpellsKnown,
  patronSpellsKnown,
} from "./spellcasting.js";
import { impliedUndercastSpells } from "./undercasting.js";

/** One cap-exempt known spell, filed under the level it is cast at. */
export interface BonusKnownSpell {
  id: string;
  name: string;
  level: number;
  /** Set when this entry exists only because a higher chain version is known. */
  undercastOf?: string;
}

/**
 * Every spell `casterTag` knows *without* having spent a spells-known pick on
 * it, deduped against the chosen known list and returned in the order the
 * sources apply. `levelMap` is the class's own spell-level map (see
 * {@link spellLevelMap}) — the psychic/witch/archetype sources publish the
 * CLASS level that unlocked a spell rather than a slot level, so those entries
 * are re-filed under the spell's own castable level and silently dropped when
 * the spell doesn't resolve against the vendored slice at all.
 */
export function bonusKnownSpellsFor(
  doc: CharacterDoc,
  refData: RefData,
  sheet: DerivedSheet,
  casterTag: string,
  classLevel: number,
  levelMap: Map<string, number>,
): BonusKnownSpell[] {
  const known = new Set(knownSpellsFor(doc, refData, casterTag));
  const out: BonusKnownSpell[] = [];
  const push = (id: string, name: string, level: number, undercastOf?: string) => {
    out.push(undercastOf ? { id, name, level, undercastOf } : { id, name, level });
  };

  // Bloodline bonus spells come from the BASE bloodline's list even when
  // `sorcererBloodline` names a wildblooded mutation instead (RAW).
  if (casterTag === "sorcerer") {
    const bloodlineTag = doc.build.sorcererBloodline
      ? parentBloodlineTagOf(refData, doc.build.sorcererBloodline)
      : undefined;
    for (const sp of bloodlineSpellsKnown(refData, bloodlineTag, classLevel)) {
      if (!known.has(sp.id)) push(sp.id, sp.name, sp.level);
    }
  }

  if (casterTag === "oracle") {
    const bonus = [
      ...mysterySpellsKnown(
        refData,
        doc.build.oracleMystery,
        classLevel,
        sheet.bonusKnownSpells?.mysteryReplacedLevels,
      ),
      ...curseSpellsKnown(refData, doc.build.oracleCurse, classLevel),
      ...oracleChannelSpellsKnown(refData, doc.build.oracleChannelAlignment, classLevel),
    ];
    for (const sp of bonus) {
      if (!known.has(sp.id)) push(sp.id, sp.name, sp.level);
    }
  }

  if (casterTag === "psychic") {
    for (const sp of disciplineSpellsKnown(refData, doc.build.psychicDiscipline, classLevel)) {
      if (known.has(sp.id)) continue;
      const lvl = levelMap.get(sp.id) ?? refData.spells[sp.id]?.level;
      if (lvl === undefined) continue;
      push(sp.id, sp.name, lvl);
    }
  }

  if (casterTag === "witch") {
    for (const sp of patronSpellsKnown(refData, doc.build.witchPatron, classLevel)) {
      if (known.has(sp.id)) continue;
      const lvl = levelMap.get(sp.id) ?? refData.spells[sp.id]?.level;
      if (lvl === undefined) continue;
      push(sp.id, sp.name, lvl);
    }
  }

  for (const sp of sheet.bonusKnownSpells?.spells ?? []) {
    if (sp.classTag !== casterTag) continue;
    if (sp.spellId !== undefined && known.has(sp.spellId)) continue;
    push(sp.spellId ?? sp.id, sp.name, sp.level);
  }

  for (const sp of impliedUndercastSpells(refData, known)) {
    if (!known.has(sp.id)) push(sp.id, sp.name, sp.level, sp.grantedByName);
  }

  return out;
}

/** A caster class's full castable repertoire: spell id -> the level it is cast at. */
export interface CastableSpells {
  /** Spell levels the class has slots for right now. */
  accessible: number[];
  /** Spell id -> its level on this class's list (or the level a bonus grant files it at). */
  byId: Map<string, number>;
}

/**
 * Every spell `classTag` can cast today, keyed to the level *this class* casts
 * it at. That level is the one crafting prices from: a druid scribes stoneskin
 * as the 5th-level spell it is on the druid list, not the 3rd it sits at on
 * the summoner's.
 *
 * Prepare-from-list casters (cleric, druid, paladin…) resolve to their whole
 * accessible class list. RAW a scroll's spell must actually have been prepared
 * that day, which no sheet can know in advance; the picker states the
 * requirement rather than trying to enforce it.
 */
export function castableSpellsFor(
  doc: CharacterDoc,
  refData: RefData,
  sheet: DerivedSheet,
  classTag: string,
): CastableSpells {
  const levelMap = spellLevelMap(refData, classTag);
  const model = casterModelFor(classTag);
  const classLevel = effectiveCasterClassLevel(doc, refData, classTag);
  const accessible = model
    ? accessibleSpellLevels(model, classLevel)
    : [...new Set(levelMap.values())].sort((a, b) => a - b);
  const open = new Set(accessible);
  const byId = new Map<string, number>();

  if (model?.preparesFromClassList) {
    for (const [id, lvl] of levelMap) {
      if (open.has(lvl)) byId.set(id, lvl);
    }
  } else {
    for (const id of knownSpellsFor(doc, refData, classTag)) {
      const lvl = levelMap.get(id) ?? refData.spells[id]?.level;
      if (lvl !== undefined && open.has(lvl)) byId.set(id, lvl);
    }
    if (model?.grantsAllCantrips && open.has(0)) {
      for (const c of grantedCantrips(refData, classTag)) byId.set(c.id, 0);
    }
  }

  for (const sp of bonusKnownSpellsFor(doc, refData, sheet, classTag, classLevel, levelMap)) {
    if (open.has(sp.level)) byId.set(sp.id, sp.level);
  }

  return { accessible, byId };
}
