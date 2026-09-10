/**
 * The session log: a short, passive record of what happened to the character
 * at the table. It answers one question a sheet otherwise cannot ("wait, what
 * hit me?") and is deliberately not a dice roller and not a combat tracker —
 * it never asks for input, never rolls anything, and nothing derived reads it.
 *
 * What earns a line is live state that moves during play: hit points, temp and
 * nonlethal, conditions, ability damage/drain/penalty and negative levels,
 * hero points, spells cast, buffs up and down, resource pools, a polymorph
 * form, and a companion's own damage and conditions. A build edit is not a
 * table event and produces no line, and neither is the round counter or a
 * condition's countdown: both tick often enough to flush a fight out of the
 * ring before anyone scrolls back to it.
 *
 * Pure: {@link describeLiveChange} diffs two documents into at most one line,
 * and {@link pushLogEntry} is a fixed-size ring. `state/sessionLog.ts` binds
 * them to the running app.
 */
import { CONDITIONS } from "@pf1/engine";
import { ABILITY_IDS } from "@pf1/schema";
import type { AbilityId, CharacterDoc, RefData } from "@pf1/schema";

import { ABILITY_NAMES } from "./names.js";

/**
 * How many lines are kept. A fight runs a dozen or so entries and an evening
 * runs a few hundred; this is sized so a session's worth of lines survives to
 * be scrolled back through, since spells and buffs alone can fill a short log
 * within one combat. Old lines fall off the end.
 */
export const SESSION_LOG_LIMIT = 120;

/**
 * What sort of event a line records. Nothing renders this yet: it exists so
 * that if the log turns out to be noisy in play, the panel can filter by
 * category without the history written before the filter existed being
 * unfilterable. `"other"` is exactly that case in reverse, a line stored
 * before lines carried a category at all.
 */
export type SessionLogKind =
  | "hp"
  | "condition"
  | "affliction"
  | "heroPoint"
  | "spell"
  | "buff"
  | "resource"
  | "form"
  | "companion"
  | "rest"
  | "other";

export interface SessionLogEntry {
  /** Unique within a log, and stable, so React can key rows. */
  id: string;
  /** Epoch milliseconds, for the clock time shown beside the line. */
  at: number;
  /** One sentence in play language, e.g. "Took 7 damage (34 to 27)". */
  text: string;
  /** Drives the row's accent: what went wrong is worth finding faster. */
  tone: "damage" | "healing" | "condition" | "neutral";
  /** See {@link SessionLogKind}. Set from whatever moved first in the line. */
  kind: SessionLogKind;
}

type Tone = SessionLogEntry["tone"];

const TONES: ReadonlySet<Tone> = new Set(["damage", "healing", "condition", "neutral"]);

const KINDS: ReadonlySet<SessionLogKind> = new Set([
  "hp",
  "condition",
  "affliction",
  "heroPoint",
  "spell",
  "buff",
  "resource",
  "form",
  "companion",
  "rest",
  "other",
]);

function conditionName(id: string): string {
  return CONDITIONS[id]?.name ?? id;
}

function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** "cantrip" / "3rd level spell", for a spontaneous caster's slot levels. */
function spellLevelLabel(level: number, noun: string): string {
  return level === 0 ? `cantrip ${noun}`.trim() : `${ordinal(level)} level ${noun}`.trim();
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}

/** camelCase pool ids read as words when RefData can't name the pool. */
function humanizeId(id: string): string {
  return capitalize(id.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_:]+/g, " "));
}

function conditionDelta(
  before: readonly string[] | undefined,
  after: readonly string[] | undefined,
): { gained: string[]; lost: string[] } {
  const wasActive = new Set(before ?? []);
  const isActive = new Set(after ?? []);
  return {
    gained: (after ?? []).filter((id) => !wasActive.has(id)).map(conditionName),
    lost: (before ?? []).filter((id) => !isActive.has(id)).map(conditionName),
  };
}

export interface LiveChangeContext {
  /**
   * Whether the character's MAXIMUM hit points moved in the same transition.
   * When they did, the current-HP move that came with it is bookkeeping rather
   * than something that happened at the table: `model/hp.ts:reconcileCurrentHp`
   * pins current up to a raised max at full health and clamps it under a
   * lowered one, so a level-up would otherwise read as "Healed 9". Conditions
   * in the same transition are still logged.
   */
  maxHpMoved?: boolean;
  /** Names spells rather than logging their ids. Absent falls back to the id. */
  refData?: RefData;
  /**
   * Display name for a resource pool id. Naming a pool means deriving every
   * pool, which is why this is a callback the caller can resolve lazily rather
   * than a list: pools move on a small fraction of the changes this sees.
   * Absent, or returning undefined, falls back to the id read as words.
   */
  resourceName?: (id: string) => string | undefined;
}

/**
 * The one line describing how `after`'s live state differs from `before`'s, or
 * `null` when nothing loggable moved.
 *
 * At most one line per change, because every change here arrives through a
 * single `update()` call: one tap on Damage is one line, even when the damage
 * spills from temporary hit points into real ones. When a single transition
 * moves several things at once (a big hit that also knocks you prone, or a
 * spell cast from the spells panel that puts its own buff up) the parts are
 * joined into that one line rather than split, so the log reads as a list of
 * things that happened rather than a list of fields that changed.
 *
 * Parts are written lowercase and the first one is capitalized, so a part
 * reads the same whether it leads the line or follows a comma.
 */
export function describeLiveChange(
  before: CharacterDoc,
  after: CharacterDoc,
  context: LiveChangeContext = {},
): { text: string; tone: Tone; kind: SessionLogKind } | null {
  const parts: string[] = [];
  let kind: SessionLogKind | undefined;
  let tone: Tone = "neutral";

  function add(text: string, partKind: SessionLogKind, partTone: Tone = "neutral"): void {
    parts.push(text);
    kind ??= partKind;
    if (tone === "neutral") tone = partTone;
  }

  describeHp(before, after, context, add);
  describeConditions(before, after, add);
  describeAfflictions(before, after, add);
  describeHeroPoints(before, after, add);
  const castNames = describeSpells(before, after, context, add);
  describeBuffs(before, after, castNames, add);
  describeResources(before, after, context, add);
  describeForm(before, after, add);
  describeCompanions(before, after, add);

  if (parts.length === 0) return null;
  return { text: capitalize(parts.join(", ")), tone, kind: kind ?? "other" };
}

type Add = (text: string, kind: SessionLogKind, tone?: Tone) => void;

function describeHp(
  before: CharacterDoc,
  after: CharacterDoc,
  context: LiveChangeContext,
  add: Add,
): void {
  const hpBefore = before.live.hp;
  const hpAfter = after.live.hp;

  // Current HP. Temp HP absorbing a hit shows up as a temp drop with no
  // current-HP move, which is still worth a line: the player wants to know the
  // ward is gone. All three deltas are held at zero when the maximum moved in
  // the same transition (see `LiveChangeContext`); everything else is still
  // read either way.
  const currentDelta = context.maxHpMoved ? 0 : hpAfter.current - hpBefore.current;
  const tempDelta = context.maxHpMoved ? 0 : hpAfter.temp - hpBefore.temp;
  const nonlethalDelta = context.maxHpMoved ? 0 : hpAfter.nonlethal - hpBefore.nonlethal;

  const damage = Math.max(0, -currentDelta) + Math.max(0, -tempDelta);
  if (currentDelta < 0 || (tempDelta < 0 && currentDelta === 0)) {
    add(`took ${damage} damage (${hpBefore.current} to ${hpAfter.current})`, "hp", "damage");
  } else if (currentDelta > 0) {
    add(`healed ${currentDelta} (${hpBefore.current} to ${hpAfter.current})`, "hp", "healing");
  }

  if (tempDelta > 0) add(`gained ${tempDelta} temporary HP`, "hp", "healing");

  if (nonlethalDelta > 0) add(`took ${nonlethalDelta} nonlethal`, "hp", "damage");
  else if (nonlethalDelta < 0) add(`shook off ${-nonlethalDelta} nonlethal`, "hp", "healing");

  const wasStable = before.live.stable ?? false;
  const isStable = after.live.stable ?? false;
  if (wasStable !== isStable) {
    if (isStable) add("stabilized", "hp", "healing");
    else add("no longer stabilized", "hp", "damage");
  }
}

function describeConditions(before: CharacterDoc, after: CharacterDoc, add: Add): void {
  const { gained, lost } = conditionDelta(before.live.conditions, after.live.conditions);
  if (gained.length > 0) add(`became ${joinNames(gained)}`, "condition", "condition");
  if (lost.length > 0) add(`no longer ${joinNames(lost)}`, "condition", "condition");
}

function describeAfflictions(before: CharacterDoc, after: CharacterDoc, add: Add): void {
  for (const ability of ABILITY_IDS) {
    const name = ABILITY_NAMES[ability];
    const points = (
      doc: CharacterDoc,
      field: "abilityDamage" | "abilityDrain" | "abilityPenalty",
    ) => (doc.live[field] as Partial<Record<AbilityId, number>> | undefined)?.[ability] ?? 0;

    const damage = points(after, "abilityDamage") - points(before, "abilityDamage");
    if (damage > 0) add(`took ${damage} ${name} damage`, "affliction", "damage");
    else if (damage < 0) add(`recovered ${-damage} ${name} damage`, "affliction", "healing");

    const drain = points(after, "abilityDrain") - points(before, "abilityDrain");
    if (drain > 0) add(`drained ${drain} ${name}`, "affliction", "damage");
    else if (drain < 0) add(`restored ${-drain} ${name}`, "affliction", "healing");

    const penalty = points(after, "abilityPenalty") - points(before, "abilityPenalty");
    if (penalty > 0) add(`took a ${penalty} point ${name} penalty`, "affliction", "damage");
    else if (penalty < 0) {
      add(`shook off ${plural(-penalty, "point")} of ${name} penalty`, "affliction", "healing");
    }
  }

  for (const [field, label] of [
    ["temporary", "negative level"],
    ["permanent", "permanent negative level"],
  ] as const) {
    const delta =
      (after.live.negativeLevels?.[field] ?? 0) - (before.live.negativeLevels?.[field] ?? 0);
    if (delta > 0) add(`gained ${plural(delta, label)}`, "affliction", "damage");
    else if (delta < 0) add(`cleared ${plural(-delta, label)}`, "affliction", "healing");
  }
}

function describeHeroPoints(before: CharacterDoc, after: CharacterDoc, add: Add): void {
  const held = after.live.heroPoints ?? 0;
  const delta = held - (before.live.heroPoints ?? 0);
  if (delta > 0) add(`gained ${plural(delta, "hero point")} (${held} held)`, "heroPoint");
  else if (delta < 0) add(`spent ${plural(-delta, "hero point")} (${held} left)`, "heroPoint");
}

/**
 * Spells cast and slots recovered. Returns the names of the spells cast, which
 * {@link describeBuffs} uses to keep "Cast Bless" from being followed by
 * "Bless is up" for the one tap that does both (the spells panel's Apply).
 */
function describeSpells(
  before: CharacterDoc,
  after: CharacterDoc,
  context: LiveChangeContext,
  add: Add,
): Set<string> {
  const castNames = new Set<string>();

  const prepared = (doc: CharacterDoc) => {
    const total = new Map<string, number>();
    const expended = new Map<string, number>();
    for (const p of doc.live.spells?.prepared ?? []) {
      total.set(p.spellId, (total.get(p.spellId) ?? 0) + 1);
      if (p.expended) expended.set(p.spellId, (expended.get(p.spellId) ?? 0) + 1);
    }
    return { total, expended };
  };
  const was = prepared(before);
  const is = prepared(after);

  for (const spellId of new Set([...was.expended.keys(), ...is.expended.keys()])) {
    const delta = (is.expended.get(spellId) ?? 0) - (was.expended.get(spellId) ?? 0);
    const name = context.refData?.spells[spellId]?.name ?? spellId;
    if (delta > 0) {
      castNames.add(name);
      add(delta === 1 ? `cast ${name}` : `cast ${name} ${delta} times`, "spell");
    } else if (delta < 0 && (is.total.get(spellId) ?? 0) >= (was.total.get(spellId) ?? 0)) {
      // A drop in expended instances only means a slot came back if the
      // instances are still there; otherwise the player deleted the prepared
      // spell, which is a loadout edit rather than something that happened.
      add(delta === -1 ? `recovered ${name}` : `recovered ${-delta} castings of ${name}`, "spell");
    }
  }

  const slots = (doc: CharacterDoc) => {
    const byLevel = new Map<number, number>();
    const merge = (used: Record<number, number> | undefined) => {
      for (const [level, n] of Object.entries(used ?? {})) {
        byLevel.set(Number(level), (byLevel.get(Number(level)) ?? 0) + n);
      }
    };
    merge(doc.live.spells?.slotsUsed);
    for (const perClass of Object.values(doc.live.spells?.slotsUsedByClass ?? {})) merge(perClass);
    return byLevel;
  };
  const wasUsed = slots(before);
  const isUsed = slots(after);

  for (const level of [...new Set([...wasUsed.keys(), ...isUsed.keys()])].sort((a, b) => a - b)) {
    const delta = (isUsed.get(level) ?? 0) - (wasUsed.get(level) ?? 0);
    if (delta > 0) {
      add(
        delta === 1
          ? `cast a ${spellLevelLabel(level, "spell")}`
          : `cast ${delta} ${spellLevelLabel(level, "spells")}`,
        "spell",
      );
    } else if (delta < 0) {
      add(
        delta === -1
          ? `recovered a ${spellLevelLabel(level, "slot")}`
          : `recovered ${-delta} ${spellLevelLabel(level, "slots")}`,
        "spell",
      );
    }
  }

  return castNames;
}

function describeBuffs(
  before: CharacterDoc,
  after: CharacterDoc,
  castNames: ReadonlySet<string>,
  add: Add,
): void {
  const was = new Set(before.live.activeBuffs.map((b) => b.instanceId));
  const is = new Set(after.live.activeBuffs.map((b) => b.instanceId));

  for (const buff of after.live.activeBuffs) {
    if (was.has(buff.instanceId) || castNames.has(buff.name)) continue;
    const rounds = buff.remainingRounds;
    add(
      rounds ? `${buff.name} is up for ${plural(rounds, "round")}` : `${buff.name} is up`,
      "buff",
    );
  }
  for (const buff of before.live.activeBuffs) {
    if (!is.has(buff.instanceId)) add(`${buff.name} ended`, "buff");
  }
}

function describeResources(
  before: CharacterDoc,
  after: CharacterDoc,
  context: LiveChangeContext,
  add: Add,
): void {
  const ids = new Set([
    ...Object.keys(before.live.resources),
    ...Object.keys(after.live.resources),
  ]);
  for (const id of ids) {
    const pool = after.live.resources[id];
    const previous = before.live.resources[id];
    // A pool that only just appeared, or only just went away, is the build
    // changing under the tracker rather than the player spending anything.
    if (!pool || !previous) continue;
    const delta = pool.used - previous.used;
    if (delta === 0) continue;
    const name = context.resourceName?.(id) ?? humanizeId(id);
    const left = Math.max(0, pool.max - pool.used);
    if (delta > 0) add(`spent ${delta} ${name} (${left} left)`, "resource");
    else add(`regained ${-delta} ${name} (${left} left)`, "resource");
  }
}

function describeForm(before: CharacterDoc, after: CharacterDoc, add: Add): void {
  const was = before.live.activeForm;
  const is = after.live.activeForm;
  if (!was && is) add(`took the form of ${is.formName || "a new shape"}`, "form");
  else if (was && !is) add("returned to your own form", "form");
  else if (was && is && was.formName !== is.formName) {
    add(`changed form to ${is.formName || "a new shape"}`, "form");
  }
}

/**
 * The four tracked companions. Each carries its own damage and conditions, so
 * a familiar taking a hit is exactly as much a table event as its master
 * taking one; the shared-buff list is not, since the buff itself is already a
 * line of its own.
 */
function describeCompanions(before: CharacterDoc, after: CharacterDoc, add: Add): void {
  const companions = [
    { key: "familiar", fallback: "Familiar" },
    { key: "animalCompanion", fallback: "Animal companion" },
    { key: "phantom", fallback: "Phantom" },
    { key: "eidolon", fallback: "Eidolon" },
  ] as const;

  for (const { key, fallback } of companions) {
    const was = before.live[key];
    const is = after.live[key];
    if (!was && !is) continue;
    const name = after.build[key]?.name || before.build[key]?.name || fallback;

    const damage = (is?.damage ?? 0) - (was?.damage ?? 0);
    if (damage > 0) add(`${name} took ${damage} damage`, "companion", "damage");
    else if (damage < 0) add(`${name} healed ${-damage}`, "companion", "healing");

    const nonlethal = (is?.nonlethal ?? 0) - (was?.nonlethal ?? 0);
    if (nonlethal > 0) add(`${name} took ${nonlethal} nonlethal`, "companion", "damage");
    else if (nonlethal < 0)
      add(`${name} shook off ${-nonlethal} nonlethal`, "companion", "healing");

    const { gained, lost } = conditionDelta(was?.conditions, is?.conditions);
    if (gained.length > 0) add(`${name} became ${joinNames(gained)}`, "companion", "condition");
    if (lost.length > 0) add(`${name} is no longer ${joinNames(lost)}`, "companion", "condition");

    if (key === "eidolon") {
      const wasSummoned = before.live.eidolon?.summoned ?? false;
      const isSummoned = after.live.eidolon?.summoned ?? false;
      if (wasSummoned !== isSummoned) {
        add(`${name} ${isSummoned ? "is summoned" : "is dismissed"}`, "companion");
      }
    }
    if (key === "phantom") {
      const wasMode = before.live.phantom?.manifestation;
      const isMode = after.live.phantom?.manifestation;
      if (isMode && wasMode !== isMode) add(`${name} shifted to ${isMode}`, "companion");
    }
  }
}

/** Append `entry`, keeping only the newest {@link SESSION_LOG_LIMIT} lines. Newest last. */
export function pushLogEntry(
  log: readonly SessionLogEntry[],
  entry: SessionLogEntry,
): SessionLogEntry[] {
  const next = [...log, entry];
  return next.length > SESSION_LOG_LIMIT ? next.slice(next.length - SESSION_LOG_LIMIT) : next;
}

/** Drop anything that isn't a log entry this app wrote (a hand-edited store, an older shape). */
export function parseSessionLog(value: unknown): SessionLogEntry[] {
  if (!Array.isArray(value)) return [];
  const entries = value
    .filter(
      (e): e is SessionLogEntry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as SessionLogEntry).id === "string" &&
        typeof (e as SessionLogEntry).at === "number" &&
        typeof (e as SessionLogEntry).text === "string",
    )
    .map((e) => ({
      ...e,
      tone: TONES.has(e.tone) ? e.tone : ("neutral" as const),
      kind: KINDS.has(e.kind) ? e.kind : ("other" as const),
    }));
  return entries.slice(Math.max(0, entries.length - SESSION_LOG_LIMIT));
}

/** Clock time for a log row, in the reader's locale. */
export function formatLogTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
