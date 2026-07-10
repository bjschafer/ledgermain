/**
 * Pure data massaging for the printable character sheet (issue #69). Flattens
 * `DerivedSheet` + the pieces of `CharacterDoc` the live tracker already knows
 * how to read (feats, class features, spell slots/known, resource pools) into
 * a single plain-data shape the print view renders. No React here — kept
 * testable the same way every other `model/` module is.
 */
import { deriveResourcePools } from "@pf1/engine";
import type { AbilityId, CharacterDoc, DerivedSheet, RefData } from "@pf1/schema";

import { casterLevelForClass, effectiveCasterClassLevel } from "./casterLevel.js";
import { ABILITY_IDS } from "./doc.js";
import { featInstanceDisplayName, featInstances, grantedFeats } from "./feats.js";
import { combinedLanguages } from "./languages.js";
import {
  ABILITY_ABBR,
  ALIGNMENT_LABELS,
  SAVE_NAMES,
  signed,
  signedSequence,
  skillName,
} from "./names.js";
import { preparedSpells, spellLevelMap } from "./preparedSpells.js";
import { remaining as remainingUses } from "./resources.js";
import {
  casterClassesOf,
  casterModelFor,
  grantedCantrips,
  knownSpellsFor,
  spellSaveDC,
  spellSlotsByLevel,
  storedClassTag,
} from "./spellcasting.js";

export interface PrintHeader {
  name: string;
  raceName?: string;
  size?: string;
  classLine: string;
  level: number;
  alignment?: string;
  deity?: string;
  gender?: string;
  age?: string;
  heightWeight?: string;
  languages: string[];
}

export interface PrintAbility {
  id: AbilityId;
  abbr: string;
  total: number;
  mod: string;
}

export interface PrintSave {
  label: string;
  total: string;
}

export interface PrintAttack {
  name: string;
  attack: string;
  damage: string;
  crit: string;
}

export interface PrintSkill {
  name: string;
  total: string;
  classSkill: boolean;
}

export interface PrintFeat {
  key: string;
  name: string;
  tags: string[];
}

export interface PrintClassFeature {
  level: number;
  name: string;
  detail?: string;
}

export interface PrintSpellLevel {
  level: number;
  isCantrip: boolean;
  slots: number;
  dc: number;
  spells: { name: string; ready: boolean }[];
}

export interface PrintCaster {
  classTag: string;
  className: string;
  casterLevel: number;
  ability: string;
  preparation: "prepared" | "spontaneous" | "hybrid";
  levels: PrintSpellLevel[];
}

export interface PrintResource {
  id: string;
  name: string;
  used: number;
  max: number;
  remaining: number;
  detail?: string;
}

export interface PrintDefenseEntry {
  qualifier: string;
  total: number;
}

export interface PrintSheetData {
  header: PrintHeader;
  abilities: PrintAbility[];
  saves: PrintSave[];
  ac: { normal: number; touch: number; flatFooted: number; cmd: number };
  hp: { current: number; max: number; temp: number; nonlethal: number };
  speeds: { label: string; value: number }[];
  initiative: string;
  bab: string;
  cmb: string;
  melee: string;
  ranged: string;
  attacks: PrintAttack[];
  skills: PrintSkill[];
  feats: PrintFeat[];
  classFeatures: PrintClassFeature[];
  casters: PrintCaster[];
  resources: PrintResource[];
  dr: PrintDefenseEntry[];
  resistances: PrintDefenseEntry[];
  sr?: number;
  arcaneSpellFailure?: number;
}

const SPEED_LABELS: Record<string, string> = {
  land: "Land",
  fly: "Fly",
  swim: "Swim",
  climb: "Climb",
  burrow: "Burrow",
};

function buildHeader(doc: CharacterDoc, sheet: DerivedSheet, refData: RefData): PrintHeader {
  const race = refData.races[doc.identity.race];
  const classLine = doc.identity.classes
    .map((c) => {
      const def = Object.values(refData.classes).find((cl) => cl.tag === c.tag);
      return `${def?.name ?? c.tag} ${c.level}`;
    })
    .join(" / ");
  const id = doc.identity;
  return {
    name: id.name || "Unnamed",
    raceName: race?.name,
    size: race?.size,
    classLine,
    level: sheet.level,
    alignment: id.alignment ? (ALIGNMENT_LABELS[id.alignment] ?? id.alignment) : undefined,
    deity: id.deity || undefined,
    gender: id.gender || undefined,
    age: id.age ? String(id.age) : undefined,
    heightWeight: [id.height, id.weight].filter(Boolean).join(", ") || undefined,
    languages: combinedLanguages(doc, refData),
  };
}

/** One spell-slot/known section per caster class the character has. */
function buildCasters(doc: CharacterDoc, sheet: DerivedSheet, refData: RefData): PrintCaster[] {
  const out: PrintCaster[] = [];
  for (const { tag } of casterClassesOf(doc, refData)) {
    const model = casterModelFor(tag);
    if (!model) continue;
    // Advancement-aware (issue #66 chunk 2): a prestige class's casting-
    // advancement slot bumps this class's effective level for slots/known-
    // limits/CL display, same as everywhere else this seam is threaded.
    const classLevel = effectiveCasterClassLevel(doc, refData, tag);
    const classDef = Object.values(refData.classes).find((cl) => cl.tag === tag);
    const abilityMod = sheet.abilities[model.ability].mod;
    const classTag = storedClassTag(doc, refData, tag);
    const levelMap = spellLevelMap(refData, tag);
    const slots = spellSlotsByLevel(model, classLevel, abilityMod);

    // Prepared/hybrid casters: what's actually loaded for the day. Spells
    // prepared into a domain/school bonus slot that don't resolve against the
    // class's own spell list (a domain-only spell) have no `levelMap` entry
    // and are skipped here — an accepted gap for this first cut (see issue #69).
    const spellsByLevel = new Map<number, { name: string; ready: boolean }[]>();
    if (model.preparation === "prepared" || model.preparation === "hybrid") {
      for (const p of preparedSpells(doc)) {
        if ((p.classTag ?? undefined) !== classTag) continue;
        const lvl = levelMap.get(p.spellId);
        if (lvl === undefined) continue;
        const name = refData.spells[p.spellId]?.name ?? p.spellId;
        const ready = model.preparation === "hybrid" ? true : !p.expended;
        (spellsByLevel.get(lvl) ?? spellsByLevel.set(lvl, []).get(lvl)!).push({ name, ready });
      }
      if (model.grantsAllCantrips) {
        spellsByLevel.set(
          0,
          grantedCantrips(refData, tag).map((c) => ({ name: c.name, ready: true })),
        );
      }
      // preparesFromClassList casters (cleric/druid/paladin/ranger) have no
      // "known" list — nothing further to merge in beyond what's prepared.
    } else {
      // Spontaneous: every known spell is always "ready" (a slot, not the
      // specific spell, is what gets spent).
      const known = knownSpellsFor(doc, refData, tag);
      for (const id of known) {
        const lvl = levelMap.get(id);
        const sp = refData.spells[id];
        if (lvl === undefined || !sp) continue;
        (spellsByLevel.get(lvl) ?? spellsByLevel.set(lvl, []).get(lvl)!).push({
          name: sp.name,
          ready: true,
        });
      }
      if (model.grantsAllCantrips) {
        spellsByLevel.set(
          0,
          grantedCantrips(refData, tag).map((c) => ({ name: c.name, ready: true })),
        );
      }
    }
    // A preparesFromClassList caster's cleric/druid list is huge and not
    // meaningfully "known" — only show levels that have slots (from `slots`)
    // or an actual prepared entry, never the whole class list.
    for (const arr of spellsByLevel.values()) arr.sort((a, b) => a.name.localeCompare(b.name));

    const levelSet = new Set<number>([...slots.map((s) => s.level), ...spellsByLevel.keys()]);
    const levels: PrintSpellLevel[] = [...levelSet]
      .sort((a, b) => a - b)
      .map((level) => ({
        level,
        isCantrip: level === 0,
        slots: slots.find((s) => s.level === level)?.total ?? 0,
        dc: spellSaveDC(level, abilityMod),
        spells: spellsByLevel.get(level) ?? [],
      }));

    out.push({
      classTag: tag,
      className: classDef?.name ?? tag,
      casterLevel: casterLevelForClass(tag, classLevel),
      ability: ABILITY_ABBR[model.ability],
      preparation: model.preparation,
      levels,
    });
  }
  return out;
}

function buildFeats(doc: CharacterDoc, refData: RefData): PrintFeat[] {
  const out: PrintFeat[] = [];
  for (const inst of featInstances(doc)) {
    const feat = refData.feats[inst.featId];
    if (!feat) continue;
    out.push({
      key: inst.instanceId,
      name: featInstanceDisplayName(feat, inst.choiceId, doc, refData),
      tags: feat.tags,
    });
  }
  for (const g of grantedFeats(doc, refData)) {
    if (out.some((r) => r.key === g.featId)) continue;
    const feat = refData.feats[g.featId];
    if (!feat) continue;
    out.push({ key: `granted:${g.featId}`, name: feat.name, tags: feat.tags });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
}

function buildClassFeatures(sheet: DerivedSheet): PrintClassFeature[] {
  const out: PrintClassFeature[] = [];
  for (const f of sheet.classFeatures) {
    if (!f.applied) continue;
    out.push({ level: f.level, name: f.name, detail: f.detail });
  }
  for (const arch of sheet.activeArchetypes) {
    for (const f of arch.features) {
      out.push({ level: f.level, name: f.name, detail: f.detail });
    }
  }
  return out.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

function buildResources(doc: CharacterDoc, sheet: DerivedSheet, refData: RefData): PrintResource[] {
  const derived = deriveResourcePools(doc, refData, sheet.abilities);
  const derivedIds = new Set(derived.map((p) => p.id));
  const out: PrintResource[] = derived.map((pool) => {
    const stored = doc.live.resources[pool.id];
    const used = stored?.used ?? 0;
    const max = stored?.max ?? pool.max;
    return {
      id: pool.id,
      name: pool.name,
      used,
      max,
      remaining: remainingUses({ used, max }),
      detail: pool.detail,
    };
  });
  for (const [id, pool] of Object.entries(doc.live.resources)) {
    if (derivedIds.has(id)) continue;
    out.push({ id, name: id, used: pool.used, max: pool.max, remaining: remainingUses(pool) });
  }
  return out;
}

/** Build the flattened, print-ready view of a computed character. */
export function buildPrintSheet(
  doc: CharacterDoc,
  sheet: DerivedSheet,
  refData: RefData,
): PrintSheetData {
  const rollableSkills = Object.values(sheet.skills)
    .filter((s) => s.usable)
    .sort((a, b) => skillName(a.id).localeCompare(skillName(b.id)));

  return {
    header: buildHeader(doc, sheet, refData),
    abilities: ABILITY_IDS.map((id) => {
      const a = sheet.abilities[id];
      return { id, abbr: ABILITY_ABBR[id], total: a.total, mod: signed(a.mod) };
    }),
    saves: (["fort", "ref", "will"] as const).map((k) => ({
      label: SAVE_NAMES[k],
      total: signed(sheet.saves[k].total),
    })),
    ac: {
      normal: sheet.ac.normal,
      touch: sheet.ac.touch,
      flatFooted: sheet.ac.flatFooted,
      cmd: sheet.cmd,
    },
    hp: {
      current: doc.live.hp.current,
      max: sheet.hp.max,
      temp: doc.live.hp.temp,
      nonlethal: doc.live.hp.nonlethal,
    },
    speeds: Object.entries(sheet.speeds)
      .filter(([, v]) => v > 0)
      .map(([mode, value]) => ({ label: SPEED_LABELS[mode] ?? mode, value })),
    initiative: signed(sheet.initiative.total),
    bab: signed(sheet.bab),
    cmb: signed(sheet.cmb),
    melee: signedSequence(sheet.attack.melee.total, sheet.attack.melee.iteratives),
    ranged: signedSequence(sheet.attack.ranged.total, sheet.attack.ranged.iteratives),
    attacks: sheet.attacks.map((atk) => {
      const bonusStr = atk.damageBonus.total !== 0 ? signed(atk.damageBonus.total) : null;
      const dmgStr =
        [atk.damageDice, bonusStr].filter(Boolean).join("") || signed(atk.damageBonus.total);
      return {
        name: atk.name,
        attack: signedSequence(atk.attack.total, atk.attack.iteratives),
        damage: dmgStr,
        crit: atk.crit,
      };
    }),
    skills: rollableSkills.map((s) => ({
      name: skillName(s.id),
      total: signed(s.total),
      classSkill: s.classSkill,
    })),
    feats: buildFeats(doc, refData),
    classFeatures: buildClassFeatures(sheet),
    casters: buildCasters(doc, sheet, refData),
    resources: buildResources(doc, sheet, refData),
    dr: sheet.defenses?.dr.map((d) => ({ qualifier: d.qualifier, total: d.total })) ?? [],
    resistances:
      sheet.defenses?.resistances.map((d) => ({ qualifier: d.qualifier, total: d.total })) ?? [],
    sr: sheet.defenses?.sr?.total,
    arcaneSpellFailure: sheet.arcaneSpellFailure?.total,
  };
}
