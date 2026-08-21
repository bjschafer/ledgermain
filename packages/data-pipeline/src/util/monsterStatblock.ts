import type { Monster, SourceRef } from "@pf1/schema";

import {
  inlineToHtml,
  inlineToPlainText,
  parseDirectiveProps,
  pfDataDescriptionToHtml,
  type PfDataEntry,
} from "./pfdata.js";

/**
 * Parser for the Pf Data 1e monster dictionaries' statblock DSL: each entry's
 * `description` carries one or more statblocks as `::mh[Name]{cr=...}` headers
 * followed by `::minfo`/`::mdefense`/`::moffense`/`::mstats`/`::meco` (and
 * optionally `::mspell`/`::mfn`) directive lines, then `::sh[...]`-headed
 * prose sections (Special Abilities, Description, ...).
 *
 * Two deliberate postures govern everything here:
 *
 * - **Known-key tables, not open parsing.** Every directive key the pinned
 *   corpus uses is enumerated below (from a full-corpus survey); a key outside
 *   the tables increments `MonsterParseStats.unknownKeys` instead of being
 *   guessed at, and the vendored-output test pins that counter to zero so a
 *   future source bump that introduces new keys fails loudly.
 * - **Keep-with-gaps.** A statblock missing a directive keeps whatever it has
 *   (every field is optional); numeric fields that fail to parse are omitted,
 *   never fabricated. Numeric fidelity is enforced externally — see
 *   `scripts/monster-oracle-diff.ts`.
 *
 * Not parsed, deliberately: `gear`/`othergear`/`combat` and compound-treasure
 * item lists use the source's dense equipment-code encoding (`Mw|Wt~+1|Abp`);
 * a wrong decode on screen is worse than the honest omission, and the attack
 * lines already name the weapons that matter in play. Adding a decoder later
 * is purely additive.
 */

/* ------------------------------------------------------------ key tables -- */

/** `::mh` — statblock header. */
const MH_KEYS = new Set(["cr", "mr", "jl", "clear"]);

const ALIGNMENT_TOKENS: Record<string, string> = {
  lg: "LG",
  ng: "NG",
  cg: "CG",
  ln: "LN",
  n: "N",
  cn: "CN",
  le: "LE",
  ne: "NE",
  ce: "CE",
};

const SIZE_TOKENS: Record<string, string> = {
  fine: "Fine",
  diminutive: "Diminutive",
  tiny: "Tiny",
  small: "Small",
  medium: "Medium",
  large: "Large",
  huge: "Huge",
  gargantuan: "Gargantuan",
  colossal: "Colossal",
};

const TYPE_TOKENS: Record<string, string> = {
  aberration: "aberration",
  animal: "animal",
  construct: "construct",
  dragon: "dragon",
  fey: "fey",
  humanoid: "humanoid",
  magicalBeast: "magical beast",
  monstrousHumanoid: "monstrous humanoid",
  ooze: "ooze",
  outsider: "outsider",
  plant: "plant",
  undead: "undead",
  vermin: "vermin",
};

/**
 * `::minfo` sense keys → printed sense label. A numeric value appends
 * "N ft."; `true` prints the bare label. The `*Parens` companions carry a
 * free-text qualifier for their base sense.
 */
const SENSE_KEYS: Record<string, string> = {
  dv: "darkvision",
  llv: "low-light vision",
  scent: "scent",
  keenScent: "keen scent",
  tremorsense: "tremorsense",
  blindsight: "blindsight",
  blindsense: "blindsense",
  lifesense: "lifesense",
  thoughtsense: "thoughtsense",
  mistsight: "mistsight",
  greensight: "greensight",
  xray: "x-ray vision",
};

/** `::minfo` keys that are metadata this reader deliberately ignores. */
const MINFO_IGNORED = new Set(["sid", "jl", "clear", "augment"]);

const MINFO_KEYS = new Set([
  ...Object.keys(ALIGNMENT_TOKENS),
  ...Object.keys(SIZE_TOKENS),
  ...Object.keys(TYPE_TOKENS),
  ...Object.keys(SENSE_KEYS),
  ...MINFO_IGNORED,
  "source",
  "xp",
  "init",
  "pcp",
  "aura",
  "sen",
  "senSpell",
  "subs",
  "othersubs",
  "subtypes",
  "al",
  "aav",
  "tremorParens",
  "blindsightParens",
]);

/** `::mdefense` flag/valued keys → printed defensive-ability label (value in parens or appended when present). */
const DEFENSE_ABILITY_KEYS: Record<string, string> = {
  chanRes: "channel resistance",
  fortif: "fortification",
  split: "split",
  ink: "ink cloud",
  pBlood: "poisonous blood",
  trapS: "trap sense",
  unstop: "unstoppable",
  blockAt: "block attacks",
  rockCt: "rock catching",
  secSave: "second save",
  ferocity: "ferocity",
  amorph: "amorphous",
  aav: "all-around vision",
  incorp: "incorporeal",
  noB: "no breath",
  eva: "evasion",
  impEva: "improved evasion",
  unc: "uncanny dodge",
  impUnc: "improved uncanny dodge",
};

const MDEFENSE_KEYS = new Set([
  ...Object.keys(DEFENSE_ABILITY_KEYS),
  "ac",
  "mod",
  "hp",
  "hpRaw",
  "fort",
  "ref",
  "will",
  "immune",
  "dr",
  "sr",
  "resist",
  "weak",
  "vulner",
  "def",
  "fh",
  "regen",
  "clear",
]);

/** `::moffense` speed keys → printed movement-mode label ("" = base land speed). */
const SPEED_KEYS: Record<string, string> = {
  sp: "",
  br: "burrow",
  cl: "climb",
  fl: "fly",
  sw: "swim",
};

/** Speed-key parenthetical companions (`spP` qualifies `sp`, ...). */
const SPEED_PAREN_KEYS: Record<string, string> = {
  spP: "sp",
  brP: "br",
  clP: "cl",
  flP: "fl",
  swP: "sw",
};

const FLY_MANEUVERABILITY = new Set(["clumsy", "poor", "average", "good", "perfect"]);

/** `::moffense` rider keys → printed special-attack label (value in parens when present). */
const SPECIAL_ATTACK_KEYS: Record<string, string> = {
  attach: "attach",
  bDrain: "blood drain",
  bleed: "bleed",
  bloodRage: "blood rage",
  brWeap: "breath weapon",
  burn: "burn",
  capsize: "capsize",
  chEn: "channel energy",
  chNEn: "channel negative energy",
  chPEn: "channel positive energy",
  constrict: "constrict",
  distraction: "distraction",
  eDrain: "energy drain",
  engulf: "engulf",
  entrap: "entrap",
  favEn: "favored enemy",
  ferocity: "ferocity",
  fSwallow: "fast swallow",
  gaze: "gaze",
  grab: "grab",
  heat: "heat",
  jet: "jet",
  mMagic: "mythic magic",
  mPower: "mythic power",
  paralysis: "paralysis",
  pounce: "pounce",
  powCh: "powerful charge",
  pull: "pull",
  push: "push",
  rake: "rake",
  rend: "rend",
  rockTh: "rock throwing",
  smother: "smother",
  sneak: "sneak attack",
  strangle: "strangle",
  swallow: "swallow whole",
  trample: "trample",
  web: "web",
  whirlwind: "whirlwind",
};

const MOFFENSE_KEYS = new Set([
  ...Object.keys(SPEED_KEYS),
  ...Object.keys(SPEED_PAREN_KEYS),
  ...FLY_MANEUVERABILITY,
  ...Object.keys(SPECIAL_ATTACK_KEYS),
  "melee",
  "ranged",
  "space",
  "reach",
  "reachP",
  "specAtt",
  "spExtra",
  "spOther",
  "clear",
]);

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

const MSTATS_KEYS = new Set([
  ...ABILITY_KEYS,
  "bab",
  "cmb",
  "cmd",
  "feats",
  "skills",
  "racial",
  "lang",
  "sq",
  "combat",
  "gear",
  "othergear",
  "faith",
  "clear",
]);

const MECO_KEYS = new Set(["env", "org", "treasure", "clear"]);

const MSPELL_KEYS = new Set([
  ...Array.from({ length: 10 }, (_, lvl) => `l${lvl}`),
  "cl",
  "con",
  "sla",
  "atWill",
  "constant",
  "day",
  "hour",
  "week",
  "month",
  "year",
  "other",
  "prep",
  "ex",
  "know",
  "psy",
  "psyMag",
  "pe",
  "peP",
  "title",
  "data",
  "newLine",
  "clear",
]);

const SKILL_NAMES: Record<string, string> = {
  acro: "Acrobatics",
  app: "Appraise",
  bluff: "Bluff",
  climb: "Climb",
  diplo: "Diplomacy",
  dis: "Disguise",
  dd: "Disable Device",
  ea: "Escape Artist",
  fly: "Fly",
  ha: "Handle Animal",
  heal: "Heal",
  intm: "Intimidate",
  ling: "Linguistics",
  per: "Perception",
  ride: "Ride",
  sm: "Sense Motive",
  soh: "Sleight of Hand",
  spc: "Spellcraft",
  stl: "Stealth",
  sur: "Survival",
  swim: "Swim",
  umd: "Use Magic Device",
};

const SUB_SKILL_NAMES: Record<string, string> = {
  craft: "Craft",
  perf: "Perform",
  prof: "Profession",
};

const KNOWLEDGE_NAMES: Record<string, string> = {
  a: "arcana",
  d: "dungeoneering",
  e: "engineering",
  g: "geography",
  h: "history",
  l: "local",
  n: "nature",
  o: "nobility",
  p: "planes",
  r: "religion",
};

/**
 * Language codes (`::mstats` `lang`), from the source's own code list. A
 * trailing `X` marks "can't speak"; tokens not in this table are free text.
 */
const LANGUAGE_NAMES: Record<string, string> = {
  A: "Abyssal",
  Ab: "Aboleth",
  ALL: "all (language mastery)",
  Ak: "Aklo",
  AO: "Ancient Osiriani",
  An: "Androffan",
  Aq: "Aquan",
  Au: "Auran",
  Az: "Azlanti",
  B: "Boggard",
  C: "Common",
  Ce: "Celestial",
  Cy: "Cyclops",
  D: "Draconic",
  DF: "Dark Folk",
  Dr: "Druidic",
  Dw: "Dwarven",
  E: "Elven",
  G: "Giant",
  Gl: "Gnoll",
  Gb: "Goblin",
  Gm: "Gnome",
  H: "Halfling",
  Ht: "Hallit",
  I: "Infernal",
  Ig: "Ignan",
  N: "Necril",
  O: "Orc",
  P: "Protean",
  Po: "Polyglot",
  S: "Sylvan",
  Sh: "Shadowtongue",
  Sx: "Sphinx",
  T: "Terran",
  Th: "Thassilonian",
  U: "Undercommon",
};

const TREASURE_CODES: Record<string, string> = {
  S: "standard",
  D: "double",
  T: "triple",
  X: "none",
  I: "incidental",
  N: "NPC gear",
};

/* ------------------------------------------------------------- plumbing -- */

/** Per-run diagnostics; the vendored-output test pins the failure counters. */
export interface MonsterParseStats {
  entries: number;
  statblocks: number;
  /** `directive -> key -> count` for keys outside the known tables. */
  unknownKeys: Map<string, Map<string, number>>;
  /** Numeric fields whose value failed to parse (id + raw value). */
  numericFailures: string[];
  /** Non-directive prose lines found inside a statblock region (observed count; rendered into the description tail). */
  strayBlockLines: number;
  /** Same-name statblocks restated by the joined-listing layout, dropped in favor of the fuller parse. */
  duplicateBlocksDropped: number;
}

export function newMonsterParseStats(): MonsterParseStats {
  return {
    entries: 0,
    statblocks: 0,
    unknownKeys: new Map(),
    numericFailures: [],
    strayBlockLines: 0,
    duplicateBlocksDropped: 0,
  };
}

type Props = Record<string, string | true>;

/** A statblock's fields sans the identity trio the transform supplies. */
export type MonsterFields = Omit<Monster, "id" | "uuid" | "name">;

function checkKeys(
  directive: string,
  props: Props,
  known: Set<string>,
  stats: MonsterParseStats,
): void {
  for (const key of Object.keys(props)) {
    if (known.has(key)) continue;
    const perDirective = stats.unknownKeys.get(directive) ?? new Map<string, number>();
    perDirective.set(key, (perDirective.get(key) ?? 0) + 1);
    stats.unknownKeys.set(directive, perDirective);
  }
}

const text = (v: string | true | undefined): string | undefined =>
  typeof v === "string" ? inlineToPlainText(v).trim() : undefined;

/** Leading signed integer of a prop value; `undefined` for absent / "-" / unparseable. */
function intOf(v: string | true | undefined): number | undefined {
  if (typeof v !== "string") return undefined;
  const m = /^[+-]?\d+/.exec(v.trim());
  return m ? parseInt(m[0], 10) : undefined;
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  const suffix = n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

function slugifyBookTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** `source="Book/page[;Book2/page2]"` → SourceRefs (same slug convention as `pfDataSourceRefs`). */
function sourceRefsOf(v: string | true | undefined): SourceRef[] | undefined {
  if (typeof v !== "string") return undefined;
  const refs = v
    .split(";")
    .map((part) => {
      const m = /^(.*?)(?:\/(\d+))?$/.exec(part.trim());
      if (!m || m[1] === "") return undefined;
      return { id: slugifyBookTitle(m[1]!), ...(m[2] ? { pages: m[2] } : {}) };
    })
    .filter((r): r is SourceRef => r !== undefined);
  return refs.length > 0 ? refs : undefined;
}

/* ------------------------------------------------------ per-directive -- */

function applyInfo(monster: MonsterFields, props: Props, stats: MonsterParseStats): void {
  checkKeys("minfo", props, MINFO_KEYS, stats);
  monster.sources = sourceRefsOf(props.source) ?? monster.sources;
  const xp = intOf(props.xp);
  if (xp !== undefined) monster.xp = xp;
  const init = text(props.init);
  if (init !== undefined) monster.init = init;

  for (const [token, display] of Object.entries(ALIGNMENT_TOKENS)) {
    if (props[token] === true) monster.alignment = display;
  }
  const alText = text(props.al);
  if (alText !== undefined) monster.alignment = alText;
  for (const [token, display] of Object.entries(SIZE_TOKENS)) {
    if (props[token] === true) monster.size = display;
  }
  for (const [token, display] of Object.entries(TYPE_TOKENS)) {
    if (props[token] === true) monster.creatureType = display;
  }

  const subtypes = [props.subs, props.othersubs, props.subtypes]
    .filter((v): v is string => typeof v === "string")
    .flatMap((v) => v.split("~"))
    .map((s) => inlineToPlainText(s).trim())
    .filter((s) => s !== "");
  if (subtypes.length > 0) monster.subtypes = subtypes;

  const senses: string[] = [];
  for (const [key, label] of Object.entries(SENSE_KEYS)) {
    const v = props[key];
    if (v === undefined) continue;
    let sense =
      typeof v === "string"
        ? `${label} ${/^\d+$/.test(v) ? `${v} ft.` : inlineToPlainText(v)}`
        : label;
    const paren = text(props[`${key}Parens`]);
    if (paren !== undefined) sense += ` (${paren})`;
    senses.push(sense);
  }
  const senFree = text(props.sen);
  if (senFree !== undefined) senses.push(senFree);
  if (typeof props.senSpell === "string") {
    senses.push(...props.senSpell.split("~").map((s) => inlineToPlainText(s).trim()));
  }
  senses.sort((a, b) => a.localeCompare(b));
  const pcp = text(props.pcp);
  if (senses.length > 0 || pcp !== undefined) {
    monster.senses =
      senses.join(", ") +
      (pcp !== undefined ? `${senses.length > 0 ? "; " : ""}Perception ${pcp}` : "");
  }
  const aura = text(props.aura);
  if (aura !== undefined) monster.aura = aura;
}

function applyDefense(
  monster: MonsterFields,
  props: Props,
  stats: MonsterParseStats,
  id: string,
): void {
  checkKeys("mdefense", props, MDEFENSE_KEYS, stats);
  if (typeof props.ac === "string") {
    const parts = props.ac.split("/").map((p) => intOf(p));
    if (parts.length === 3 && parts.every((p) => p !== undefined)) {
      [monster.ac, monster.touchAc, monster.flatFootedAc] = parts as [number, number, number];
    } else {
      stats.numericFailures.push(`${id}: ac=${props.ac}`);
    }
  }
  const acMods = text(props.mod);
  if (acMods !== undefined) monster.acMods = acMods;

  if (typeof props.hp === "string") {
    const [hp, hd] = props.hp.split("~");
    const hpNum = intOf(hp);
    if (hpNum !== undefined) monster.hp = hpNum;
    else stats.numericFailures.push(`${id}: hp=${props.hp}`);
    if (hd !== undefined && hd.trim() !== "") monster.hd = inlineToPlainText(hd).trim();
  } else if (typeof props.hpRaw === "string") {
    // Verbatim override: "333 (23d6+253); sustaining joy".
    const m = /^(\d+)\s*\(([^)]*)\)\s*;?\s*(.*)$/.exec(inlineToPlainText(props.hpRaw).trim());
    if (m) {
      monster.hp = parseInt(m[1]!, 10);
      monster.hd = m[2]!;
      if (m[3]) monster.hpNote = m[3];
    } else {
      stats.numericFailures.push(`${id}: hpRaw=${props.hpRaw}`);
    }
  }
  const hpNotes: string[] = [];
  const fh = text(props.fh);
  if (fh !== undefined) hpNotes.push(`fast healing ${fh}`);
  const regen = text(props.regen);
  if (regen !== undefined) hpNotes.push(`regeneration ${regen}`);
  if (hpNotes.length > 0) {
    monster.hpNote = [monster.hpNote, ...hpNotes].filter((n) => n !== undefined).join("; ");
  }

  const fort = text(props.fort);
  if (fort !== undefined) monster.fort = fort;
  const ref = text(props.ref);
  if (ref !== undefined) monster.ref = ref;
  const will = text(props.will);
  if (will !== undefined) monster.will = will;

  const defensive: string[] = [];
  const def = text(props.def);
  if (def !== undefined) defensive.push(...def.split("~").map((s) => s.trim()));
  for (const [key, label] of Object.entries(DEFENSE_ABILITY_KEYS)) {
    const v = props[key];
    if (v === undefined) continue;
    if (v === true) defensive.push(label);
    else if (key === "chanRes" || key === "trapS")
      defensive.push(`${label} ${inlineToPlainText(v)}`);
    else if (key === "fortif") defensive.push(`${label} (${inlineToPlainText(v)}%)`);
    else if (key === "ink") defensive.push(`${label} (${inlineToPlainText(v)}-ft. radius)`);
    else defensive.push(`${label} (${inlineToPlainText(v)})`);
  }
  if (defensive.length > 0) {
    defensive.sort((a, b) => a.localeCompare(b));
    monster.defensiveAbilities = defensive.join(", ");
  }

  const dr = text(props.dr);
  if (dr !== undefined) monster.dr = dr;
  const immune = text(props.immune);
  if (immune !== undefined) monster.immune = immune;
  const sr = text(props.sr);
  if (sr !== undefined) monster.sr = sr;
  const resist = text(props.resist);
  if (resist !== undefined) monster.resist = resist;
  const weaknesses = [
    text(props.weak),
    text(props.vulner) ? `vulnerability to ${text(props.vulner)}` : undefined,
  ].filter((w): w is string => w !== undefined);
  if (weaknesses.length > 0) monster.weaknesses = weaknesses.join(", ");
}

function applyOffense(monster: MonsterFields, props: Props, stats: MonsterParseStats): void {
  checkKeys("moffense", props, MOFFENSE_KEYS, stats);

  const speeds: string[] = [];
  for (const [key, label] of Object.entries(SPEED_KEYS)) {
    const v = props[key];
    if (typeof v !== "string") continue;
    let part = /^\d+$/.test(v) ? `${v} ft.` : inlineToPlainText(v);
    if (label !== "") part = `${label} ${part}`;
    if (key === "fl") {
      const maneuver = [...FLY_MANEUVERABILITY].find((m) => props[m] === true);
      if (maneuver) part += ` (${maneuver})`;
    }
    const parenKey = Object.entries(SPEED_PAREN_KEYS).find(([, base]) => base === key)?.[0];
    const paren = parenKey ? text(props[parenKey]) : undefined;
    if (paren !== undefined) part += ` (${paren})`;
    speeds.push(part);
  }
  const spExtra = text(props.spExtra);
  if (spExtra !== undefined) speeds.push(spExtra);
  const spOther = text(props.spOther);
  if (spOther !== undefined) speeds.push(spOther);
  if (speeds.length > 0) monster.speed = speeds.join(", ");

  const melee = text(props.melee);
  if (melee !== undefined) monster.melee = melee;
  const ranged = text(props.ranged);
  if (ranged !== undefined) monster.ranged = ranged;
  const space = text(props.space);
  if (space !== undefined) monster.space = /^[\d/ -]+$/.test(space) ? `${space} ft.` : space;
  let reach = text(props.reach);
  if (reach !== undefined) {
    if (/^[\d/ -]+$/.test(reach)) reach = `${reach} ft.`;
    const reachP = text(props.reachP);
    if (reachP !== undefined) reach += ` (${reachP})`;
    monster.reach = reach;
  }

  const specials: string[] = [];
  if (typeof props.specAtt === "string") {
    specials.push(...props.specAtt.split("~").map((s) => inlineToPlainText(s).trim()));
  }
  for (const [key, label] of Object.entries(SPECIAL_ATTACK_KEYS)) {
    const v = props[key];
    if (v === undefined) continue;
    if (v === true) specials.push(label);
    else if (key === "sneak") specials.push(`${label} ${inlineToPlainText(v)}`);
    else if (key === "jet")
      specials.push(`${label} (${inlineToPlainText(v)}${/^\d+$/.test(v) ? " ft." : ""})`);
    else specials.push(`${label} (${inlineToPlainText(v)})`);
  }
  if (specials.length > 0) {
    specials.sort((a, b) => a.localeCompare(b));
    monster.specialAttacks = specials.join(", ");
  }
}

/**
 * One spell-list item: `name`, `name|parens`, `!free text`, `&S summon-info`,
 * `&Q metamagic spell|parens`, `^leading prefix`, `$trailing suffix`, with
 * `#X` superscript markers anywhere. Spell names render italic per the
 * printed convention.
 */
function renderSpellItems(value: string): string {
  const items: string[] = [];
  let prefix = "";
  let suffix = "";
  for (const rawItem of value.split("~")) {
    let notes = "";
    const item = rawItem.replace(/#([A-Z0-9])/g, (_m, mark: string) => {
      notes += `<sup>${/\d/.test(mark) ? ordinal(Number(mark)) : mark}</sup>`;
      return "";
    });
    let m: RegExpExecArray | null;
    if ((m = /^!(.+?)(?:\|(.+))?$/.exec(item))) {
      items.push(inlineToHtml(m[1]!) + notes + (m[2] ? ` (${inlineToHtml(m[2])})` : ""));
    } else if ((m = /^&S (.+)$/.exec(item))) {
      items.push(`summon${notes} (${inlineToHtml(m[1]!)})`);
    } else if ((m = /^&([A-Z&a-z]+) (.+?)(?:\|(.+))?$/.exec(item))) {
      const meta =
        m[1] === "Q"
          ? "quickened"
          : m[1] === "EM"
            ? "empowered"
            : m[1] === "EX"
              ? "extended"
              : m[1] === "Q&EM"
                ? "quickened empowered"
                : m[1]!;
      items.push(
        `${meta} <em>${inlineToHtml(m[2]!)}</em>${notes}${m[3] ? ` (${inlineToHtml(m[3])})` : ""}`,
      );
    } else if ((m = /^\^(.+)$/.exec(item))) {
      prefix = `${inlineToHtml(m[1]!)} `;
    } else if ((m = /^\$(.+)$/.exec(item))) {
      suffix = inlineToHtml(m[1]!);
    } else if ((m = /^(.+?)\|(.+)$/.exec(item))) {
      items.push(`<em>${inlineToHtml(m[1]!)}</em>${notes} (${inlineToHtml(m[2]!)})`);
    } else {
      items.push(`<em>${inlineToHtml(item)}</em>${notes}`);
    }
  }
  return prefix + items.join(", ") + suffix;
}

/** One `::mspell` directive → printed-style HTML paragraphs. */
function renderSpellBlock(props: Props, stats: MonsterParseStats): string {
  checkKeys("mspell", props, MSPELL_KEYS, stats);
  const paragraphs: string[] = [];

  const clText =
    typeof props.cl === "string"
      ? `CL ${/^\d+$/.test(props.cl) ? ordinal(Number(props.cl)) : inlineToHtml(props.cl)}`
      : undefined;
  const conText =
    typeof props.con === "string" ? `concentration ${inlineToHtml(props.con)}` : undefined;
  const headerParens = (extra?: string): string => {
    const parts = [extra, clText, conText].filter((p) => p !== undefined);
    return parts.length > 0 ? ` (${parts.join("; ")})` : "";
  };
  const heading = (title: string, extra?: string): void => {
    paragraphs.push(`<p><strong>${title}</strong>${headerParens(extra)}</p>`);
  };
  const line = (label: string, value: string | true | undefined): void => {
    if (typeof value === "string") paragraphs.push(`<p>${label}—${renderSpellItems(value)}</p>`);
  };
  /**
   * Spells-known level lines: `count~spells` per level, 9th first. A value
   * whose first segment isn't a count (a bare integer or "at will") is a
   * plain spell list — cantrip rows commonly omit the count.
   */
  const countedLevelLines = (): void => {
    for (let lvl = 9; lvl >= 0; lvl--) {
      const v = props[`l${lvl}`];
      if (typeof v !== "string") continue;
      const m = /^([^~]+)~(.+)$/.exec(v);
      const times = m?.[1]?.trim();
      const baseLabel = lvl === 0 ? "0 (at will)" : ordinal(lvl);
      if (m && times !== undefined && (/^\d+$/.test(times) || times === "at will")) {
        const label =
          lvl === 0
            ? "0 (at will)"
            : `${ordinal(lvl)} (${times === "at will" ? times : `${times}/day`})`;
        paragraphs.push(`<p>${label}—${renderSpellItems(m[2]!)}</p>`);
      } else {
        paragraphs.push(`<p>${baseLabel}—${renderSpellItems(v)}</p>`);
      }
    }
  };
  const plainLevelLines = (): void => {
    for (let lvl = 9; lvl >= 0; lvl--) {
      const v = props[`l${lvl}`];
      if (typeof v !== "string") continue;
      paragraphs.push(`<p>${lvl === 0 ? "0 (at will)" : ordinal(lvl)}—${renderSpellItems(v)}</p>`);
    }
  };

  if (props.sla !== undefined) {
    heading(
      props.sla === true
        ? "Spell-Like Abilities"
        : `${inlineToHtml(String(props.sla))} Spell-Like Abilities`,
    );
    line("Constant", props.constant);
    line("At will", props.atWill);
    line("1/hour", props.hour);
    if (typeof props.day === "string") {
      for (const group of props.day.split("~~")) {
        const m = /^([^~]+)~(.+)$/.exec(group);
        if (m) paragraphs.push(`<p>${inlineToHtml(m[1]!)}/day—${renderSpellItems(m[2]!)}</p>`);
        else paragraphs.push(`<p>/day—${renderSpellItems(group)}</p>`);
      }
    }
    line("1/week", props.week);
    line("1/month", props.month);
    line("1/year", props.year);
    if (typeof props.other === "string") {
      const m = /^([^~]+)~(.+)$/.exec(props.other);
      if (m) paragraphs.push(`<p>${inlineToHtml(m[1]!)}—${renderSpellItems(m[2]!)}</p>`);
    }
  }
  if (props.prep !== undefined || props.ex !== undefined) {
    const kind = props.ex !== undefined ? "Extracts" : "Spells";
    const cls = props.ex !== undefined ? props.ex : props.prep;
    heading(cls === true ? `${kind} Prepared` : `${inlineToHtml(String(cls))} ${kind} Prepared`);
    plainLevelLines();
  }
  if (props.know !== undefined) {
    heading(
      props.know === true ? "Spells Known" : `${inlineToHtml(String(props.know))} Spells Known`,
    );
    countedLevelLines();
  }
  if (props.psy !== undefined) {
    const pe =
      typeof props.pe === "string"
        ? `PE ${inlineToHtml(props.pe)}`
        : typeof props.peP === "string"
          ? `PE ${inlineToHtml(props.peP)}`
          : undefined;
    heading("Psychic Magic", pe);
    if (typeof props.psyMag === "string")
      paragraphs.push(`<p>${renderSpellItems(props.psyMag)}</p>`);
  }
  if (typeof props.title === "string" && typeof props.data === "string") {
    paragraphs.push(
      `<p><strong>${inlineToHtml(props.title)}</strong> ${inlineToHtml(props.data.replace(/~/g, ", "))}</p>`,
    );
  }
  return paragraphs.join("\n");
}

/** `feats="M/Name#B|parens~..."` with `::mfn` footnotes expanded in place. */
function renderFeats(value: string, footnotes: Map<string, string>): string {
  return value
    .split("~")
    .map((item) => {
      const bang = /^!(.+)$/.exec(item);
      if (bang) return inlineToPlainText(bang[1]!).trim();
      const m = /^(M\/)?(.+?)(?:#([A-Z]))?(?:\|(.+))?$/.exec(item);
      if (!m) return inlineToPlainText(item).trim();
      const [, mythic, feat, marker, parens] = m;
      let out = `${mythic ? "Mythic " : ""}${inlineToPlainText(feat!).trim()}`;
      if (parens !== undefined) out += ` (${inlineToPlainText(parens).trim()})`;
      if (marker !== undefined) {
        const note = footnotes.get(marker);
        out += note !== undefined ? ` (${note.replace(/\.$/, "")})` : "";
      }
      return out;
    })
    .join(", ");
}

/** `skills="climb|5~k|d/p|6~craft|traps|4|+8 with wood"` → printed skill line. */
function renderSkills(value: string): string {
  const parts: string[] = [];
  for (const item of value.split("~")) {
    const [code, ...data] = item.split("|");
    const bonus = (v: string | undefined): string => {
      const n = v !== undefined ? Number(v) : NaN;
      return Number.isFinite(n) ? (n < 0 ? String(n) : `+${n}`) : inlineToPlainText(v ?? "");
    };
    if (code === "k") {
      const [what, b, x] = data;
      const names = (what ?? "")
        .split("/")
        .map((letter) => KNOWLEDGE_NAMES[letter] ?? inlineToPlainText(letter));
      parts.push(
        `Knowledge (${names.join(", ")}) ${bonus(b)}${x !== undefined ? ` (${inlineToPlainText(x)})` : ""}`,
      );
    } else if (code !== undefined && SUB_SKILL_NAMES[code] !== undefined) {
      const [of, b, x] = data;
      parts.push(
        `${SUB_SKILL_NAMES[code]}${of !== undefined ? ` (${inlineToPlainText(of)})` : ""} ${bonus(b)}${x !== undefined ? ` (${inlineToPlainText(x)})` : ""}`,
      );
    } else if (code !== undefined) {
      const [b, x] = data;
      const name = SKILL_NAMES[code] ?? inlineToPlainText(code);
      parts.push(`${name} ${bonus(b)}${x !== undefined ? ` (${inlineToPlainText(x)})` : ""}`);
    }
  }
  return parts.join(", ");
}

/** `lang="C~DX~~telepathy 100 ft."` → printed languages line. */
function renderLanguages(value: string): string {
  if (value === "none") return "none";
  const [normal, special] = value.split("~~");
  const names = (normal ?? "")
    .split("~")
    .filter((token) => token !== "")
    .map((token) => {
      const mute =
        token.length > 1 && token.endsWith("X") && LANGUAGE_NAMES[token.slice(0, -1)] !== undefined;
      const code = mute ? token.slice(0, -1) : token;
      const name = LANGUAGE_NAMES[code];
      if (name === undefined) return inlineToPlainText(token).trim();
      return mute ? `${name} (can't speak)` : name;
    });
  const specialText = special !== undefined ? inlineToPlainText(special).trim() : undefined;
  if (specialText !== undefined && specialText !== "") {
    return names.length > 0 ? `${names.join(", ")}; ${specialText}` : specialText;
  }
  return names.join(", ");
}

function applyStats(
  monster: MonsterFields,
  props: Props,
  footnotes: Map<string, string>,
  stats: MonsterParseStats,
  id: string,
): void {
  checkKeys("mstats", props, MSTATS_KEYS, stats);
  const scores: NonNullable<Monster["abilityScores"]> = {};
  for (const ability of ABILITY_KEYS) {
    const v = props[ability];
    if (typeof v !== "string") continue;
    if (/^\d+$/.test(v.trim())) {
      scores[ability] = parseInt(v, 10);
    } else if (v.trim() !== "-") {
      // "- (20 while corporeal)" — printed "—" with a qualifier.
      const m = /^-\s*\((.+)\)$/.exec(v.trim());
      if (m)
        monster.statNote = `${ability.charAt(0).toUpperCase()}${ability.slice(1)} — (${inlineToPlainText(m[1]!)})`;
      else stats.numericFailures.push(`${id}: ${ability}=${v}`);
    }
  }
  if (Object.keys(scores).length > 0) monster.abilityScores = scores;

  const bab = text(props.bab);
  if (bab !== undefined) monster.bab = bab;
  const cmb = text(props.cmb);
  if (cmb !== undefined) monster.cmb = cmb;
  const cmd = text(props.cmd);
  if (cmd !== undefined) monster.cmd = cmd;

  if (typeof props.feats === "string") monster.feats = renderFeats(props.feats, footnotes);
  if (typeof props.skills === "string") monster.skills = renderSkills(props.skills);
  const racial = text(props.racial);
  if (racial !== undefined) monster.racialModifiers = racial;
  if (typeof props.lang === "string") monster.languages = renderLanguages(props.lang);
  const sq = text(props.sq);
  if (sq !== undefined) monster.sq = sq;
  // gear/othergear/combat/faith deliberately unparsed — see module doc.
}

function applyEcology(monster: MonsterFields, props: Props, stats: MonsterParseStats): void {
  checkKeys("meco", props, MECO_KEYS, stats);
  const env = text(props.env);
  if (env !== undefined) monster.environment = env;
  const org = text(props.org);
  if (org !== undefined) monster.organization = org;
  if (typeof props.treasure === "string") {
    // Base-letter code, optionally `=coded-items~!free text`. The coded item
    // list is deliberately not decoded (see module doc); the plain-text tail
    // after `!` is kept.
    const m = /^([SDTXIN!])(?:=(.*))?$/.exec(props.treasure);
    if (m) {
      const base = m[1] === "!" ? undefined : TREASURE_CODES[m[1]!];
      const tail = m[2]
        ?.split("~")
        .filter((part) => part.startsWith("!"))
        .map((part) => inlineToPlainText(part.slice(1)).trim())
        .join(", ");
      monster.treasure =
        base !== undefined
          ? tail !== undefined && tail !== ""
            ? `${base} (${tail})`
            : base
          : (tail ?? "");
    } else {
      monster.treasure = inlineToPlainText(props.treasure).trim();
    }
  }
}

/* -------------------------------------------------------------- entry -- */

const DIRECTIVE_RE = /^::([a-z][a-zA-Z0-9]*)(?:\[([^\]]*)\])?(?:\{(.*)\})?\s*$/;

export interface ParsedMonsterEntry {
  /** One per `::mh` header, in source order. */
  blocks: {
    /** The `::mh` label — the statblock's own name ("Small Earth Elemental"). */
    name: string;
    monster: MonsterFields;
  }[];
  /**
   * Entry-level prose: flavor line(s) plus every non-Special-Abilities `::sh`
   * section, rendered. Shared by all blocks of a multi-statblock entry.
   */
  descriptionHtml?: string;
  specialAbilitiesHtml?: string;
}

/**
 * Parse one monster dictionary entry. Returns `undefined` for an entry with
 * no `::mh` header at all (not a statblock page).
 */
export function parseMonsterEntry(
  entry: PfDataEntry,
  stats: MonsterParseStats,
): ParsedMonsterEntry | undefined {
  const lines = entry.description ?? [];
  stats.entries++;

  interface RawBlock {
    name: string;
    props: Props;
    directives: { name: string; props: Props }[];
    spellsHtmlParts: string[];
  }
  const blocks: RawBlock[] = [];
  const footnotes = new Map<string, string>();
  const sections: { label: string; lines: string[] }[] = [];
  const flavor: string[] = [];
  let current: RawBlock | undefined;
  let currentSection: { label: string; lines: string[] } | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    const m = DIRECTIVE_RE.exec(trimmed);
    if (m && trimmed.startsWith("::") && !trimmed.startsWith(":::")) {
      const [, dname, label, propsRaw] = m;
      const props = propsRaw !== undefined ? parseDirectiveProps(propsRaw) : {};
      if (dname === "mh") {
        checkKeys("mh", props, MH_KEYS, stats);
        current = { name: label ?? "", props, directives: [], spellsHtmlParts: [] };
        currentSection = undefined;
        blocks.push(current);
        continue;
      }
      if (dname === "mfn") {
        const fn = /^([A-Z0-9])~(.+)$/.exec(label ?? "");
        if (fn) footnotes.set(fn[1]!, inlineToPlainText(fn[2]!).trim());
        continue;
      }
      if (dname === "sh") {
        currentSection = { label: label ?? "", lines: [] };
        sections.push(currentSection);
        continue;
      }
      if (current !== undefined && currentSection === undefined) {
        if (dname === "mspell") {
          current.spellsHtmlParts.push(renderSpellBlock(props, stats));
          continue;
        }
        if (
          dname === "minfo" ||
          dname === "mdefense" ||
          dname === "moffense" ||
          dname === "mstats" ||
          dname === "meco"
        ) {
          current.directives.push({ name: dname, props });
          continue;
        }
      }
      // Any other directive (::aff, ::h3, ::trap, ...) is prose-renderer
      // territory — fall through so it lands in a section / flavor line.
    }
    if (currentSection !== undefined) {
      currentSection.lines.push(line);
    } else if (current === undefined) {
      flavor.push(line);
    } else if (trimmed !== "" && !trimmed.startsWith(":::")) {
      // Prose inside a statblock region — rare; keep it visible in the
      // description rather than dropping it.
      stats.strayBlockLines++;
      currentSection = { label: "", lines: [line] };
      sections.push(currentSection);
    }
  }

  if (blocks.length === 0) return undefined;

  // The joined-listing layout can restate a statblock the entry already led
  // with (air_elemental opens with a full Small block, then repeats it
  // `jl`-flagged at the head of the size ladder). Same name in one entry =
  // same statblock; keep the more complete parse.
  const byBlockName = new Map<string, RawBlock>();
  for (const block of blocks) {
    const existing = byBlockName.get(block.name);
    if (
      existing === undefined ||
      block.directives.length + block.spellsHtmlParts.length >
        existing.directives.length + existing.spellsHtmlParts.length
    ) {
      byBlockName.set(block.name, block);
    }
  }
  const dedupedBlocks = blocks.filter((block) => byBlockName.get(block.name) === block);
  stats.duplicateBlocksDropped += blocks.length - dedupedBlocks.length;

  // `::h4`/`::th` lines are outside `pfDataDescriptionToHtml`'s directive set
  // and would render as literal text — rewrite them to the markdown headers it
  // does handle before rendering a section.
  const prepare = (sectionLines: string[]): string[] =>
    sectionLines.map((l) => {
      const h = /^::(?:h4|th)\[([^\]]*)\](?:\{.*\})?\s*$/.exec(l.trim());
      return h ? `#### ${h[1]}` : l;
    });

  const descriptionParts: string[] = [];
  const flavorHtml = pfDataDescriptionToHtml(prepare(flavor));
  if (flavorHtml !== "") descriptionParts.push(flavorHtml);
  let specialAbilitiesHtml: string | undefined;
  for (const section of sections) {
    const bodyHtml = pfDataDescriptionToHtml(prepare(section.lines));
    if (bodyHtml === "") continue;
    if (/^special abilities$/i.test(section.label.trim())) {
      specialAbilitiesHtml =
        specialAbilitiesHtml === undefined ? bodyHtml : `${specialAbilitiesHtml}\n${bodyHtml}`;
    } else {
      const heading =
        section.label.trim() !== ""
          ? `<p><strong>${inlineToHtml(section.label)}</strong></p>\n`
          : "";
      descriptionParts.push(heading + bodyHtml);
    }
  }

  const parsedBlocks = dedupedBlocks.map((raw) => {
    stats.statblocks++;
    const monster: MonsterFields = {
      cr: typeof raw.props.cr === "string" ? raw.props.cr : "",
    };
    const mr = intOf(raw.props.mr);
    if (mr !== undefined) monster.mythicRank = mr;
    const id = raw.name;
    for (const directive of raw.directives) {
      if (directive.name === "minfo") applyInfo(monster, directive.props, stats);
      else if (directive.name === "mdefense") applyDefense(monster, directive.props, stats, id);
      else if (directive.name === "moffense") applyOffense(monster, directive.props, stats);
      else if (directive.name === "mstats")
        applyStats(monster, directive.props, footnotes, stats, id);
      else if (directive.name === "meco") applyEcology(monster, directive.props, stats);
    }
    if (raw.spellsHtmlParts.length > 0) monster.spellsHtml = raw.spellsHtmlParts.join("\n");
    return { name: raw.name, monster };
  });

  return {
    blocks: parsedBlocks,
    ...(descriptionParts.length > 0 ? { descriptionHtml: descriptionParts.join("\n") } : {}),
    ...(specialAbilitiesHtml !== undefined ? { specialAbilitiesHtml } : {}),
  };
}
