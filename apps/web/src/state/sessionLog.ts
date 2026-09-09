/**
 * Persistence for the session log. The lines themselves are derived in
 * `model/sessionLog.ts`; this is only where they are kept.
 *
 * They live in localStorage, per character, and never in the document. A
 * document is synced, capped at 2 MB, and read by the engine — none of which a
 * running commentary on one table's evening belongs in. The cost is that the
 * log is a device's memory rather than the character's, which is the right
 * trade for something whose whole job is "what happened at this table in the
 * last hour". Every storage touch degrades to an empty log, same posture as
 * every other localStorage read in this app.
 */
import { parseSessionLog, type SessionLogEntry } from "../model/sessionLog.js";

const KEY_PREFIX = "lm:log:";

function keyFor(characterId: string): string {
  return `${KEY_PREFIX}${characterId}`;
}

export function readSessionLog(characterId: string): SessionLogEntry[] {
  try {
    const raw = localStorage.getItem(keyFor(characterId));
    return raw ? parseSessionLog(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function writeSessionLog(characterId: string, log: readonly SessionLogEntry[]): void {
  try {
    if (log.length === 0) localStorage.removeItem(keyFor(characterId));
    else localStorage.setItem(keyFor(characterId), JSON.stringify(log));
  } catch {
    /* quota exceeded / private browsing — the in-memory log still reads fine */
  }
}

/** Forget every character's log. Called when the app wipes local characters. */
export function clearAllSessionLogs(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(KEY_PREFIX)) doomed.push(key);
    }
    for (const key of doomed) localStorage.removeItem(key);
  } catch {
    /* nothing to clean up we can reach */
  }
}
