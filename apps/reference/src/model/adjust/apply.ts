/**
 * Applies template/feat-style `StatblockAdjustment`s to a vendored `Monster`.
 *
 * Vendored statblocks are mostly printed display strings, so this recomputes
 * what it safely can (numeric fields), parses and shifts what's semi-structured
 * (saves, attack lines, CMB/CMD, AC breakdown), and otherwise appends text or
 * leaves the field alone with a `manual` note. A field that can't be parsed
 * NEVER gets a fabricated value.
 *
 * Ability deltas from every op across every adjustment are summed and applied
 * once, first (`applyAbilityEffects`), because Str/Dex/Con changes ripple into
 * HP, saves, AC, CMB/CMD, and attack lines together. Every other op is then
 * applied source-by-source, adjustment by adjustment, in the order given, each
 * one operating on the statblock as already touched by the ones before it.
 */

import type { Monster } from "@pf1/schema";

import {
  flattenAttacks,
  mapAttacks,
  parseAttackLine,
  renderAttackLine,
  shiftAttackBonus,
  stepDiceTerm,
  withDamageCore,
} from "./attackLine.js";
import type {
  AbilityDeltas,
  AbilityKey,
  AdjustNote,
  AdjustOp,
  AdjustResult,
  FieldChange,
  StatblockAdjustment,
} from "./types.js";

const ABILITY_LABEL: Record<AbilityKey, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

const SIZE_ORDER = [
  "Fine",
  "Diminutive",
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Huge",
  "Gargantuan",
  "Colossal",
] as const;

/** AC/attack size modifier, by size. */
const AC_ATTACK_SIZE_MOD: Record<string, number> = {
  Fine: 8,
  Diminutive: 4,
  Tiny: 2,
  Small: 1,
  Medium: 0,
  Large: -1,
  Huge: -2,
  Gargantuan: -4,
  Colossal: -8,
};

/** CMB/CMD's own "special size modifier" (inverted sign from the AC/attack table). */
const CMB_CMD_SIZE_MOD: Record<string, number> = {
  Fine: -8,
  Diminutive: -4,
  Tiny: -2,
  Small: -1,
  Medium: 0,
  Large: 1,
  Huge: 2,
  Gargantuan: 4,
  Colossal: 8,
};

const CR_FRACTIONS: Record<string, number> = {
  "1/8": 0.125,
  "1/6": 1 / 6,
  "1/4": 0.25,
  "1/3": 1 / 3,
  "1/2": 0.5,
};
const CR_LADDER: string[] = [
  "1/8",
  "1/6",
  "1/4",
  "1/3",
  "1/2",
  ...Array.from({ length: 30 }, (_, i) => String(i + 1)),
];

/** The printed CR table (CR 1 through 20); CR > 20 doubles every 2 steps, alternating x1.5/x(4/3). */
const CR_XP: Record<string, number> = {
  "1/8": 50,
  "1/6": 65,
  "1/4": 100,
  "1/3": 135,
  "1/2": 200,
  "1": 400,
  "2": 600,
  "3": 800,
  "4": 1200,
  "5": 1600,
  "6": 2400,
  "7": 3200,
  "8": 4800,
  "9": 6400,
  "10": 9600,
  "11": 12800,
  "12": 19200,
  "13": 25600,
  "14": 38400,
  "15": 51200,
  "16": 76800,
  "17": 102400,
  "18": 153600,
  "19": 204800,
  "20": 307200,
};

function xpForCr(cr: string): number | null {
  const known = CR_XP[cr];
  if (known !== undefined) return known;
  const n = Number(cr);
  if (!Number.isInteger(n) || n <= 20) return null;
  let xp = CR_XP["20"]!;
  for (let step = 21; step <= n; step++) xp = Math.round(xp * (step % 2 === 1 ? 1.5 : 4 / 3));
  return xp;
}

function abilityMod(score: number): number {
  return Math.floor(score / 2) - 5;
}

/** Sum of hit-dice counts across every "NdM" group in a Hit Dice string ("2d6+4d10+22" -> 6). */
function hdCount(hd: string | undefined): number | null {
  if (!hd) return null;
  const matches = [...hd.matchAll(/(\d+)d\d+/g)];
  if (matches.length === 0) return null;
  return matches.reduce((sum, m) => sum + Number(m[1]), 0);
}

const HD_REWRITE_RE = /^((?:\d+d\d+)(?:\s*(?:\+|plus)\s*\d+d\d+)*)(\s*([+-]\d+))?$/;

/** Parses a leading signed/bare integer plus verbatim trailing text ("+15 (+19 grapple)" -> 15, " (+19 grapple)"). */
function parseLeadingInt(
  text: string,
): { value: number; signed: boolean; trailing: string } | null {
  const m = text.match(/^([+-])?(\d+)(.*)$/s);
  if (!m) return null;
  const sign = m[1];
  return {
    value: (sign === "-" ? -1 : 1) * Number(m[2]),
    signed: sign !== undefined,
    trailing: m[3] ?? "",
  };
}

function renderLeadingInt(value: number, signed: boolean): string {
  if (signed) return value >= 0 ? `+${value}` : String(value);
  return String(value);
}

class Builder {
  monster: Monster;
  readonly changes: FieldChange[] = [];
  readonly notes: AdjustNote[] = [];

  constructor(base: Monster) {
    this.monster = {
      ...base,
      abilityScores: base.abilityScores ? { ...base.abilityScores } : undefined,
    };
  }

  change(field: FieldChange["field"], kind: FieldChange["kind"]): void {
    this.changes.push({ field, kind });
  }

  info(text: string): void {
    this.notes.push({ text, severity: "info" });
  }

  manual(text: string): void {
    this.notes.push({ text, severity: "manual" });
  }
}

export function applyAdjustments(base: Monster, adjustments: StatblockAdjustment[]): AdjustResult {
  const b = new Builder(base);

  const mergedAbilityDeltas: AbilityDeltas = {};
  for (const adj of adjustments) {
    for (const op of adj.ops) {
      if (op.kind !== "ability") continue;
      for (const [key, delta] of Object.entries(op.deltas) as [AbilityKey, number | undefined][]) {
        if (delta === undefined) continue;
        mergedAbilityDeltas[key] = (mergedAbilityDeltas[key] ?? 0) + delta;
      }
    }
  }
  if (Object.keys(mergedAbilityDeltas).length > 0) {
    applyAbilityEffects(b, base, mergedAbilityDeltas);
  }

  for (const adj of adjustments) {
    for (const op of adj.ops) {
      if (op.kind === "ability") continue;
      applyOp(b, op);
    }
    for (const text of adj.notes ?? []) b.info(text);
  }

  return { monster: b.monster, changes: b.changes, notes: b.notes };
}

// ---------------------------------------------------------------------------
// Ability effects (Str/Dex/Con/Int/Wis/Cha), applied once as a merged batch
// ---------------------------------------------------------------------------

function applyAbilityEffects(b: Builder, base: Monster, deltas: AbilityDeltas): void {
  const oldScores = base.abilityScores ?? {};
  const modDelta: Partial<Record<AbilityKey, number>> = {};
  const oldMod: Partial<Record<AbilityKey, number>> = {};
  const newScores = { ...oldScores };

  for (const [key, delta] of Object.entries(deltas) as [AbilityKey, number | undefined][]) {
    if (!delta) continue;
    const oldScore = oldScores[key];
    if (oldScore === undefined) {
      b.info(
        `no ${ABILITY_LABEL[key]} score; ${ABILITY_LABEL[key]}-based adjustments do not apply`,
      );
      continue;
    }
    oldMod[key] = abilityMod(oldScore);
    modDelta[key] = abilityMod(oldScore + delta) - abilityMod(oldScore);
    newScores[key] = oldScore + delta;
  }

  if (Object.keys(modDelta).length === 0) return;

  b.monster = { ...b.monster, abilityScores: newScores };
  b.change("abilityScores", "recomputed");

  const strDelta = modDelta.str ?? 0;
  const dexDelta = modDelta.dex ?? 0;
  const conDelta = modDelta.con ?? 0;
  const wisDelta = modDelta.wis ?? 0;

  applyHitDice(b, conDelta);
  applySave(b, "fort", conDelta);
  applySave(b, "ref", dexDelta);
  applySave(b, "will", wisDelta);
  applyInit(b, dexDelta);
  applyAcFromDex(b, dexDelta);
  applyCmbCmd(b, strDelta, dexDelta);
  applyAttackField(b, "melee", strDelta, dexDelta, oldMod);
  applyAttackField(b, "ranged", strDelta, dexDelta, oldMod);
}

function applyHitDice(b: Builder, conDelta: number): void {
  const hd = b.monster.hd;
  const count = hdCount(hd);
  if (count === null) {
    if (conDelta !== 0) {
      b.manual(
        "Hit Dice could not be parsed; hit points not adjusted for the Constitution change, adjust by hand.",
      );
    }
    return;
  }
  if (conDelta === 0) return;

  const hpDelta = conDelta * count;
  if (b.monster.hp !== undefined) {
    b.monster = { ...b.monster, hp: Math.max(1, b.monster.hp + hpDelta) };
    b.change("hp", "recomputed");
  }

  const rewrite = hd!.match(HD_REWRITE_RE);
  if (!rewrite) {
    b.manual(
      "Hit Dice line not adjusted for the Constitution change; the total hit points above already reflect it.",
    );
    return;
  }
  const dicePart = rewrite[1]!;
  const existingFlat = rewrite[3] !== undefined ? Number(rewrite[3]) : 0;
  const newFlat = existingFlat + hpDelta;
  const newHd =
    newFlat === 0 ? dicePart : dicePart + (newFlat >= 0 ? `+${newFlat}` : String(newFlat));
  if (newHd !== hd) {
    b.monster = { ...b.monster, hd: newHd };
    b.change("hd", "shifted");
  }
}

function applySave(b: Builder, field: "fort" | "ref" | "will", delta: number): void {
  if (delta === 0) return;
  const text = b.monster[field];
  if (text === undefined) return;
  const parsed = parseLeadingInt(text);
  if (!parsed) {
    const label = field === "fort" ? "Fortitude" : field === "ref" ? "Reflex" : "Will";
    b.manual(
      `${label} save could not be parsed; adjust by ${renderLeadingInt(delta, true)} by hand.`,
    );
    return;
  }
  b.monster = {
    ...b.monster,
    [field]: renderLeadingInt(parsed.value + delta, parsed.signed) + parsed.trailing,
  };
  b.change(field, "shifted");
}

function applyInit(b: Builder, delta: number): void {
  if (delta === 0) return;
  const text = b.monster.init;
  if (text === undefined) return;
  const parsed = parseLeadingInt(text);
  if (!parsed) {
    b.manual(`Initiative could not be parsed; adjust by ${renderLeadingInt(delta, true)} by hand.`);
    return;
  }
  b.monster = {
    ...b.monster,
    init: renderLeadingInt(parsed.value + delta, parsed.signed) + parsed.trailing,
  };
  b.change("init", "shifted");
}

function shiftAcModComponent(
  acMods: string | undefined,
  label: string,
  delta: number,
): { text: string | undefined; found: boolean } {
  if (acMods === undefined) return { text: undefined, found: false };
  const parts = acMods.split(", ");
  const re = new RegExp(`^([+-]\\d+) ${label}$`);
  const idx = parts.findIndex((p) => re.test(p));
  if (idx < 0) return { text: acMods, found: false };
  const m = parts[idx]!.match(re)!;
  const newValue = Number(m[1]) + delta;
  parts[idx] = `${newValue >= 0 ? "+" : ""}${newValue} ${label}`;
  return { text: parts.join(", "), found: true };
}

function applyAcFromDex(b: Builder, dexDelta: number): void {
  if (dexDelta === 0) return;
  if (b.monster.ac !== undefined) {
    b.monster = { ...b.monster, ac: b.monster.ac + dexDelta };
    b.change("ac", "recomputed");
  }
  if (b.monster.touchAc !== undefined) {
    b.monster = { ...b.monster, touchAc: b.monster.touchAc + dexDelta };
    b.change("touchAc", "recomputed");
  }
  const { text, found } = shiftAcModComponent(b.monster.acMods, "Dex", dexDelta);
  if (found) {
    b.monster = { ...b.monster, acMods: text };
    b.change("acMods", "shifted");
  } else if (b.monster.acMods !== undefined) {
    b.info("AC breakdown not adjusted.");
  }
}

function applyCmbCmd(b: Builder, strDelta: number, dexDelta: number): void {
  const isSmallSize =
    b.monster.size === "Tiny" || b.monster.size === "Diminutive" || b.monster.size === "Fine";
  const cmbDelta = isSmallSize ? dexDelta : strDelta;
  const cmdDelta = strDelta + dexDelta;
  applyCmbCmdField(b, "cmb", cmbDelta);
  applyCmbCmdField(b, "cmd", cmdDelta);
}

function applyCmbCmdField(b: Builder, field: "cmb" | "cmd", delta: number): void {
  if (delta === 0) return;
  const text = b.monster[field];
  if (text === undefined) return;
  const parsed = parseLeadingInt(text);
  if (!parsed) {
    b.manual(
      `${field.toUpperCase()} could not be parsed; adjust by ${renderLeadingInt(delta, true)} by hand.`,
    );
    return;
  }
  b.monster = {
    ...b.monster,
    [field]: renderLeadingInt(parsed.value + delta, parsed.signed) + parsed.trailing,
  };
  b.change(field, "shifted");
  if (/\d/.test(parsed.trailing)) {
    b.info(`Conditional ${field.toUpperCase()} values were not adjusted.`);
  }
}

// ---------------------------------------------------------------------------
// Melee/ranged attack line shifting (Str/Dex, Weapon Finesse)
// ---------------------------------------------------------------------------

/** "2 claws" counts as 2 attacks for the tie-break below, even though it's one parsed attack segment. */
function attackMultiplicity(namePart: string): number {
  const m = namePart.trim().match(/^(\d+)\b/);
  return m ? Number(m[1]) : 1;
}

/** x1.5/x1/x0.5 candidate multiplier for a printed melee damage bonus against the (pre-change) Str mod. */
function meleeDamageMultiplier(
  printedBonus: number,
  oldStrMod: number,
  attackCount: number,
): number | null {
  const candidates: Array<{ mult: number; value: number }> = [
    { mult: 1.5, value: Math.floor(1.5 * oldStrMod) },
    { mult: 1, value: Math.floor(oldStrMod) },
    { mult: 0.5, value: Math.floor(0.5 * oldStrMod) },
  ];
  const matches = candidates.filter((c) => c.value === printedBonus);
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!.mult;
  const preferred = attackCount >= 2 ? 1 : 1.5;
  return matches.find((c) => c.mult === preferred)?.mult ?? matches[0]!.mult;
}

function applyAttackField(
  b: Builder,
  field: "melee" | "ranged",
  strDelta: number,
  dexDelta: number,
  oldMod: Partial<Record<AbilityKey, number>>,
): void {
  const text = b.monster[field];
  if (!text) return;

  const isMelee = field === "melee";
  const finesse = (b.monster.feats ?? "").includes("Weapon Finesse");
  const attackDelta = isMelee ? (finesse ? dexDelta : strDelta) : dexDelta;
  const damageRelevant = strDelta !== 0;

  if (attackDelta === 0 && !damageRelevant) return;

  const parsed = parseAttackLine(text);
  if (!parsed) {
    const parts: string[] = [];
    if (attackDelta !== 0)
      parts.push(`adjust attack rolls by ${renderLeadingInt(attackDelta, true)}`);
    if (damageRelevant) parts.push(`adjust damage by ${renderLeadingInt(strDelta, true)}`);
    if (parts.length > 0) {
      const label = isMelee ? "Melee" : "Ranged";
      b.manual(`${label} line could not be parsed; ${parts.join(" and ")} by hand.`);
    }
    return;
  }

  const attackCount = flattenAttacks(parsed).reduce(
    (n, a) => n + attackMultiplicity(a.namePart),
    0,
  );
  const unreconciled: string[] = [];
  const oldStrMod = oldMod.str ?? 0;

  const next = mapAttacks(parsed, (attack) => {
    let shifted = shiftAttackBonus(attack, attackDelta);
    if (!attack.damage || strDelta === 0) return shifted;

    const core = attack.damage.core;
    if (isMelee) {
      if (core.kind !== "dice") {
        unreconciled.push(attack.namePart.trim());
        return shifted;
      }
      const printed = core.bonus ?? 0;
      const mult = meleeDamageMultiplier(printed, oldStrMod, attackCount);
      let newBonus: number;
      if (mult !== null) {
        newBonus = Math.floor((oldStrMod + strDelta) * mult);
      } else {
        newBonus = printed + strDelta;
        unreconciled.push(attack.namePart.trim());
      }
      return withDamageCore(shifted, { ...core, bonus: newBonus === 0 ? null : newBonus });
    }

    // Ranged: damage shifts by Str only when the printed bonus reconciles with
    // the plain (x1) or thrown/composite (x1.5) Str mod -- otherwise untouched.
    if (core.kind === "dice") {
      const printed = core.bonus ?? 0;
      let newBonus: number | null = null;
      if (printed === oldStrMod) newBonus = oldStrMod + strDelta;
      else if (printed === Math.floor(1.5 * oldStrMod))
        newBonus = Math.floor(1.5 * (oldStrMod + strDelta));
      if (newBonus !== null) {
        shifted = withDamageCore(shifted, { ...core, bonus: newBonus === 0 ? null : newBonus });
      }
    }
    return shifted;
  });

  const rendered = renderAttackLine(next);
  if (rendered !== text) {
    b.monster = { ...b.monster, [field]: rendered };
    b.change(field, "shifted");
  }
  for (const name of unreconciled) {
    b.manual(
      `Printed damage bonus for "${name}" in ${field} did not reconcile with Strength; adjusted at 1x, verify.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Other ops
// ---------------------------------------------------------------------------

function applyOp(b: Builder, op: Exclude<AdjustOp, { kind: "ability" }>): void {
  switch (op.kind) {
    case "naturalArmor":
      applyNaturalArmor(b, op.delta);
      break;
    case "sizeStep":
      applySizeStep(b, op.delta);
      break;
    case "drTiers":
      applyDrTiers(b, op.tiers);
      break;
    case "resistTiers":
      applyResistTiers(b, op.energies, op.tiers);
      break;
    case "srFromCr":
      applySrFromCr(b, op.delta);
      break;
    case "crTiers":
      applyCrTiers(b, op.tiers);
      break;
    case "appendLine":
      applyAppendLine(b, op.field, op.text, op.skipIfPresent);
      break;
    case "subtypes":
      applySubtypes(b, op.add);
      break;
    case "attackShift":
      applyAttackShift(b, "melee", op.delta);
      if (op.scope === "all") applyAttackShift(b, "ranged", op.delta);
      break;
    case "damageShift":
      applyDamageShift(b, "melee", op.delta);
      applyDamageShift(b, "ranged", op.delta);
      break;
    case "acShift":
      applyAcShift(b, op.delta);
      break;
    case "saveShift":
      applySave(b, "fort", op.delta);
      applySave(b, "ref", op.delta);
      applySave(b, "will", op.delta);
      break;
    case "initShift":
      applyInit(b, op.delta);
      break;
    case "skillShift":
      applySkillShift(b, op.delta, op.skill);
      break;
  }
}

/** Flat shift to every attack bonus on one printed attack line. */
function applyAttackShift(b: Builder, field: "melee" | "ranged", delta: number): void {
  const text = b.monster[field];
  if (!text || delta === 0) return;
  const parsed = parseAttackLine(text);
  if (!parsed) {
    const label = field === "melee" ? "Melee" : "Ranged";
    b.manual(
      `${label} line could not be parsed; adjust attack rolls by ${renderLeadingInt(delta, true)} by hand.`,
    );
    return;
  }
  const next = mapAttacks(parsed, (attack) => shiftAttackBonus(attack, delta));
  const rendered = renderAttackLine(next);
  if (rendered !== text) {
    b.monster = { ...b.monster, [field]: rendered };
    b.change(field, "shifted");
  }
}

/** Flat shift to every parsed weapon-damage bonus on one printed attack line. */
function applyDamageShift(b: Builder, field: "melee" | "ranged", delta: number): void {
  const text = b.monster[field];
  if (!text || delta === 0) return;
  const parsed = parseAttackLine(text);
  if (!parsed) {
    const label = field === "melee" ? "Melee" : "Ranged";
    b.manual(
      `${label} line could not be parsed; adjust damage by ${renderLeadingInt(delta, true)} by hand.`,
    );
    return;
  }
  const unshifted: string[] = [];
  const next = mapAttacks(parsed, (attack) => {
    if (!attack.damage) return attack;
    const core = attack.damage.core;
    if (core.kind !== "dice") {
      unshifted.push(attack.namePart.trim());
      return attack;
    }
    const newBonus = (core.bonus ?? 0) + delta;
    return withDamageCore(attack, { ...core, bonus: newBonus === 0 ? null : newBonus });
  });
  const rendered = renderAttackLine(next);
  if (rendered !== text) {
    b.monster = { ...b.monster, [field]: rendered };
    b.change(field, "shifted");
  }
  for (const name of unshifted) {
    b.manual(`Damage for "${name}" in ${field} could not be parsed; adjust by hand.`);
  }
}

/** An untyped AC penalty/bonus applies to normal, touch, and flat-footed AC alike. */
function applyAcShift(b: Builder, delta: number): void {
  if (delta === 0) return;
  for (const field of ["ac", "touchAc", "flatFootedAc"] as const) {
    const v = b.monster[field];
    if (v !== undefined) {
      b.monster = { ...b.monster, [field]: v + delta };
      b.change(field, "recomputed");
    }
  }
}

const SIGNED_INT_RE = /[+-]\d+/g;

/** Shift every signed bonus in a printed list ("Perception +8, Stealth +4 (+8 in forests)"). */
function shiftSignedBonuses(text: string, delta: number): string {
  return text.replace(SIGNED_INT_RE, (m) => renderLeadingInt(Number(m) + delta, true));
}

/**
 * Flat skill-check shift. `skill` narrows it to one named skill; otherwise
 * every printed bonus on the Skills line shifts, conditional parentheticals
 * included (a global check penalty moves those totals too). The Perception
 * rider inside the senses line shifts either way; the Racial Modifiers line
 * never does (those are components, not check totals).
 */
function applySkillShift(b: Builder, delta: number, skill: string | undefined): void {
  if (delta === 0) return;

  const skills = b.monster.skills;
  if (skills !== undefined) {
    const next = skill
      ? skills.replace(
          new RegExp(`(${skill}\\s)([+-]\\d+)`, "g"),
          (_m, head: string, bonus: string) => head + renderLeadingInt(Number(bonus) + delta, true),
        )
      : shiftSignedBonuses(skills, delta);
    if (next !== skills) {
      b.monster = { ...b.monster, skills: next };
      b.change("skills", "shifted");
    }
  }

  const senses = b.monster.senses;
  if (senses !== undefined && (skill === undefined || skill === "Perception")) {
    const next = senses.replace(
      /(Perception\s)([+-]\d+)/,
      (_m, head: string, bonus: string) => head + renderLeadingInt(Number(bonus) + delta, true),
    );
    if (next !== senses) {
      b.monster = { ...b.monster, senses: next };
      b.change("senses", "shifted");
    }
  }
}

function applyNaturalArmor(b: Builder, delta: number): void {
  if (b.monster.ac !== undefined) {
    b.monster = { ...b.monster, ac: b.monster.ac + delta };
    b.change("ac", "recomputed");
  }
  if (b.monster.flatFootedAc !== undefined) {
    b.monster = { ...b.monster, flatFootedAc: b.monster.flatFootedAc + delta };
    b.change("flatFootedAc", "recomputed");
  }
  const { text, found } = shiftAcModComponent(b.monster.acMods, "natural", delta);
  if (found) {
    b.monster = { ...b.monster, acMods: text };
    b.change("acMods", "shifted");
  } else if (b.monster.acMods !== undefined) {
    b.info("AC breakdown not adjusted.");
  }
}

function applySizeStep(b: Builder, delta: 1 | -1): void {
  const oldSize = b.monster.size;
  if (!oldSize || !SIZE_ORDER.includes(oldSize as (typeof SIZE_ORDER)[number])) {
    b.manual("Size could not be adjusted; the printed size wasn't recognized, adjust by hand.");
    return;
  }
  const oldIdx = SIZE_ORDER.indexOf(oldSize as (typeof SIZE_ORDER)[number]);
  const newIdx = Math.max(0, Math.min(SIZE_ORDER.length - 1, oldIdx + delta));
  const newSize = SIZE_ORDER[newIdx]!;

  const acAttackDelta = AC_ATTACK_SIZE_MOD[newSize]! - AC_ATTACK_SIZE_MOD[oldSize]!;
  const cmbCmdDelta = CMB_CMD_SIZE_MOD[newSize]! - CMB_CMD_SIZE_MOD[oldSize]!;

  if (newSize !== oldSize) {
    b.monster = { ...b.monster, size: newSize };
    b.change("size", "recomputed");
  }

  for (const field of ["ac", "touchAc", "flatFootedAc"] as const) {
    const v = b.monster[field];
    if (v !== undefined && acAttackDelta !== 0) {
      b.monster = { ...b.monster, [field]: v + acAttackDelta };
      b.change(field, "recomputed");
    }
  }

  applyCmbCmdField(b, "cmb", cmbCmdDelta);
  applyCmbCmdField(b, "cmd", cmbCmdDelta);

  applySizeStepAttackField(b, "melee", acAttackDelta, delta);
  applySizeStepAttackField(b, "ranged", acAttackDelta, delta);

  if (b.monster.space !== undefined || b.monster.reach !== undefined) {
    b.info("Space/reach not adjusted for size.");
  }
  b.info("Skills (Stealth) not adjusted for size.");
}

function applySizeStepAttackField(
  b: Builder,
  field: "melee" | "ranged",
  attackDelta: number,
  diceSteps: number,
): void {
  const text = b.monster[field];
  if (!text) return;

  const parsed = parseAttackLine(text);
  if (!parsed) {
    const label = field === "melee" ? "Melee" : "Ranged";
    b.manual(
      `${label} line could not be parsed; adjust attack rolls by ${renderLeadingInt(attackDelta, true)} and step damage dice by hand.`,
    );
    return;
  }

  const unreconciled: string[] = [];
  const next = mapAttacks(parsed, (attack) => {
    const shifted = shiftAttackBonus(attack, attackDelta);
    if (!attack.damage) return shifted;
    const stepped = stepDiceTerm(attack.damage.core, diceSteps);
    if (stepped === null) {
      if (attack.damage.core.kind !== "raw") unreconciled.push(attack.namePart.trim());
      return shifted;
    }
    return withDamageCore(shifted, stepped);
  });

  const rendered = renderAttackLine(next);
  if (rendered !== text) {
    b.monster = { ...b.monster, [field]: rendered };
    b.change(field, "shifted");
  }
  for (const name of unreconciled) {
    b.manual(
      `Damage dice for "${name}" in ${field} are not on the standard size chart; adjust by hand.`,
    );
  }
}

function tierFor<T>(tiers: Array<{ minHd: number; value: T }>, hd: number): T | undefined {
  let best: { minHd: number; value: T } | undefined;
  for (const t of tiers) {
    if (t.minHd <= hd && (!best || t.minHd > best.minHd)) best = t;
  }
  return best?.value;
}

function applyDrTiers(b: Builder, tiers: Array<{ minHd: number; value: string | null }>): void {
  const hd = hdCount(b.monster.hd);
  if (hd === null) {
    b.manual("Hit Dice could not be determined; damage reduction not applied, add by hand.");
    return;
  }
  const value = tierFor(tiers, hd);
  if (value === undefined || value === null) return;

  if (b.monster.dr) {
    b.monster = { ...b.monster, dr: `${b.monster.dr}; ${value}` };
    b.info("Damage reduction merged alongside the existing entry.");
  } else {
    b.monster = { ...b.monster, dr: value };
  }
  b.change("dr", "appended");
}

function applyResistTiers(
  b: Builder,
  energies: string[],
  tiers: Array<{ minHd: number; value: number }>,
): void {
  const hd = hdCount(b.monster.hd);
  if (hd === null) {
    b.manual("Hit Dice could not be determined; energy resistance not applied, add by hand.");
    return;
  }
  const amount = tierFor(tiers, hd);
  if (amount === undefined) return;

  const existingText = b.monster.resist;
  const entries: Array<{ key: string; amount: number }> = [];
  if (existingText) {
    for (const part of existingText.split(", ")) {
      const m = part.match(/^(.+) (\d+)$/);
      if (m) entries.push({ key: m[1]!, amount: Number(m[2]) });
      else entries.push({ key: part, amount: -1 }); // unparsed leftover, preserved verbatim below
    }
  }

  let changed = false;
  for (const energy of energies) {
    const existing = entries.find((e) => e.key === energy);
    if (existing) {
      if (amount > existing.amount) {
        existing.amount = amount;
        changed = true;
      }
    } else {
      entries.push({ key: energy, amount });
      changed = true;
    }
  }
  if (!changed) return;

  const rendered = entries.map((e) => (e.amount < 0 ? e.key : `${e.key} ${e.amount}`)).join(", ");
  b.monster = { ...b.monster, resist: rendered };
  b.change("resist", "appended");
}

function parseCr(cr: string): number | null {
  if (CR_FRACTIONS[cr] !== undefined) return CR_FRACTIONS[cr]!;
  const trimmed = cr.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function applySrFromCr(b: Builder, delta: number): void {
  const cr = b.monster.cr;
  const numeric = cr !== undefined ? parseCr(cr) : null;
  if (numeric === null) {
    b.manual("Challenge Rating could not be read; spell resistance not adjusted, add by hand.");
    return;
  }
  const computed = Math.max(0, Math.floor(numeric)) + delta;

  const existing = b.monster.sr;
  if (existing !== undefined) {
    const parsed = parseLeadingInt(existing);
    if (parsed && parsed.value >= computed) {
      b.info("Existing spell resistance already meets or exceeds the granted value.");
      return;
    }
    if (parsed) {
      b.monster = { ...b.monster, sr: String(computed) + parsed.trailing };
      b.change("sr", "recomputed");
      return;
    }
    b.manual("Existing spell resistance could not be parsed; not adjusted, add by hand.");
    return;
  }

  b.monster = { ...b.monster, sr: String(computed) };
  b.change("sr", "recomputed");
}

function applyCrTiers(b: Builder, tiers: Array<{ minHd: number; value: number }>): void {
  const hd = hdCount(b.monster.hd);
  if (hd === null) return;
  const delta = tierFor(tiers, hd);
  if (!delta) return;

  const cr = b.monster.cr;
  const idx = cr !== undefined ? CR_LADDER.indexOf(cr) : -1;
  if (idx < 0) {
    b.manual(
      `Challenge Rating "${cr ?? ""}" could not be stepped; adjust by ${renderLeadingInt(delta, true)} by hand.`,
    );
    return;
  }
  const newIdx = Math.max(0, Math.min(CR_LADDER.length - 1, idx + delta));
  const newCr = CR_LADDER[newIdx]!;
  if (newCr !== cr) {
    b.monster = { ...b.monster, cr: newCr };
    b.change("cr", "recomputed");
  }

  const xp = xpForCr(newCr);
  if (xp !== null && xp !== b.monster.xp) {
    b.monster = { ...b.monster, xp };
    b.change("xp", "recomputed");
  }
}

function applyAppendLine(
  b: Builder,
  field:
    | "senses"
    | "aura"
    | "defensiveAbilities"
    | "specialAttacks"
    | "sq"
    | "speed"
    | "immune"
    | "weaknesses",
  text: string,
  skipIfPresent: string | undefined,
): void {
  const current = b.monster[field];
  if (skipIfPresent && current && current.toLowerCase().includes(skipIfPresent.toLowerCase()))
    return;

  let substituted = text;
  if (substituted.includes("{hd}")) {
    const hd = hdCount(b.monster.hd);
    if (hd === null) {
      b.manual(`Could not add to ${field}: "${text}" (needs Hit Dice, which couldn't be read).`);
      return;
    }
    substituted = substituted.replaceAll("{hd}", String(hd));
  }
  if (substituted.includes("{chaMod}")) {
    const cha = b.monster.abilityScores?.cha;
    if (cha === undefined) {
      b.manual(
        `Could not add to ${field}: "${text}" (needs a Charisma score, which this creature doesn't have).`,
      );
      return;
    }
    substituted = substituted.replaceAll("{chaMod}", renderLeadingInt(abilityMod(cha), true));
  }

  b.monster = { ...b.monster, [field]: current ? `${current}, ${substituted}` : substituted };
  b.change(field, "appended");
}

function applySubtypes(b: Builder, add: string[]): void {
  const existing = b.monster.subtypes ?? [];
  const lower = new Set(existing.map((s) => s.toLowerCase()));
  const toAdd = add.filter((s) => !lower.has(s.toLowerCase()));
  if (toAdd.length === 0) return;
  b.monster = { ...b.monster, subtypes: [...existing, ...toAdd] };
  b.change("subtypes", "appended");
}
