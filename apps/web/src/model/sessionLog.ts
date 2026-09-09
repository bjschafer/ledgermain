/**
 * The session log: a short, passive record of what happened to the character
 * at the table. It answers one question a sheet otherwise cannot ("wait, what
 * hit me?") and is deliberately not a dice roller and not a combat tracker —
 * it never asks for input, never rolls anything, and nothing derived reads it.
 *
 * Only the live state a player watches during a fight is logged: hit points,
 * temporary hit points, nonlethal damage, and conditions. A build edit or a
 * spell prepared is not a table event and produces no line.
 *
 * Pure: {@link describeLiveChange} diffs two documents into at most one line,
 * and {@link pushLogEntry} is a fixed-size ring. `state/sessionLog.ts` binds
 * them to the running app.
 */
import { CONDITIONS } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

/**
 * How many lines are kept. A fight runs a dozen or so entries; a session runs
 * more than anyone scrolls back through. Old lines fall off the end.
 */
export const SESSION_LOG_LIMIT = 40;

export interface SessionLogEntry {
  /** Unique within a log, and stable, so React can key rows. */
  id: string;
  /** Epoch milliseconds, for the clock time shown beside the line. */
  at: number;
  /** One sentence in play language, e.g. "Took 7 damage (34 to 27)". */
  text: string;
  /** Drives the row's accent: what went wrong is worth finding faster. */
  tone: "damage" | "healing" | "condition" | "neutral";
}

const TONES: ReadonlySet<SessionLogEntry["tone"]> = new Set([
  "damage",
  "healing",
  "condition",
  "neutral",
]);

function conditionName(id: string): string {
  return CONDITIONS[id]?.name ?? id;
}

function joinNames(names: string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
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
}

/**
 * The one line describing how `after`'s live state differs from `before`'s, or
 * `null` when nothing loggable moved.
 *
 * At most one line per change, because every change here arrives through a
 * single `update()` call: one tap on Damage is one line, even when the damage
 * spills from temporary hit points into real ones. When a single transition
 * moves several things at once (a big hit that also knocks you prone) the
 * parts are joined into that one line rather than split, so the log reads as a
 * list of things that happened rather than a list of fields that changed.
 */
export function describeLiveChange(
  before: CharacterDoc,
  after: CharacterDoc,
  context: LiveChangeContext = {},
): {
  text: string;
  tone: SessionLogEntry["tone"];
} | null {
  const parts: string[] = [];
  let tone: SessionLogEntry["tone"] = "neutral";

  const hpBefore = before.live.hp;
  const hpAfter = after.live.hp;

  // Current HP. Temp HP absorbing a hit shows up as a temp drop with no
  // current-HP move, which is still worth a line: the player wants to know the
  // ward is gone. All three deltas are held at zero when the maximum moved in
  // the same transition (see `LiveChangeContext`); the conditions below are
  // still read either way.
  const currentDelta = context.maxHpMoved ? 0 : hpAfter.current - hpBefore.current;
  const tempDelta = context.maxHpMoved ? 0 : hpAfter.temp - hpBefore.temp;
  const nonlethalDelta = context.maxHpMoved ? 0 : hpAfter.nonlethal - hpBefore.nonlethal;

  const damage = Math.max(0, -currentDelta) + Math.max(0, -tempDelta);
  if (currentDelta < 0 || (tempDelta < 0 && currentDelta === 0)) {
    parts.push(`Took ${damage} damage (${hpBefore.current} to ${hpAfter.current})`);
    tone = "damage";
  } else if (currentDelta > 0) {
    parts.push(`Healed ${currentDelta} (${hpBefore.current} to ${hpAfter.current})`);
    tone = "healing";
  }

  if (tempDelta > 0) {
    parts.push(`gained ${tempDelta} temporary HP`);
    if (tone === "neutral") tone = "healing";
  }

  if (nonlethalDelta > 0) {
    parts.push(`took ${nonlethalDelta} nonlethal`);
    if (tone === "neutral") tone = "damage";
  } else if (nonlethalDelta < 0) {
    parts.push(`shook off ${-nonlethalDelta} nonlethal`);
    if (tone === "neutral") tone = "healing";
  }

  const wasActive = new Set(before.live.conditions);
  const isActive = new Set(after.live.conditions);
  const gained = after.live.conditions.filter((id) => !wasActive.has(id)).map(conditionName);
  const lost = before.live.conditions.filter((id) => !isActive.has(id)).map(conditionName);
  if (gained.length > 0) {
    parts.push(`${parts.length > 0 ? "became " : "Became "}${joinNames(gained)}`);
    if (tone === "neutral") tone = "condition";
  }
  if (lost.length > 0) {
    parts.push(`${parts.length > 0 ? "no longer " : "No longer "}${joinNames(lost)}`);
    if (tone === "neutral") tone = "condition";
  }

  if (parts.length === 0) return null;
  return { text: parts.join(", "), tone };
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
    .map((e) => ({ ...e, tone: TONES.has(e.tone) ? e.tone : ("neutral" as const) }));
  return entries.slice(Math.max(0, entries.length - SESSION_LOG_LIMIT));
}

/** Clock time for a log row, in the reader's locale. */
export function formatLogTime(at: number): string {
  return new Date(at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
