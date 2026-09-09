import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  describeLiveChange,
  parseSessionLog,
  pushLogEntry,
  SESSION_LOG_LIMIT,
  type SessionLogEntry,
} from "../src/model/sessionLog.js";

function withLive(over: Partial<CharacterDoc["live"]>): CharacterDoc {
  const doc = createEmptyDoc("char-1");
  return { ...doc, live: { ...doc.live, ...over } };
}

function hp(current: number, temp = 0, nonlethal = 0): Partial<CharacterDoc["live"]> {
  return { hp: { current, temp, nonlethal } };
}

function entry(id: string, at = 0): SessionLogEntry {
  return { id, at, text: id, tone: "neutral" };
}

describe("describeLiveChange", () => {
  it("logs damage with the hit points either side of it", () => {
    const change = describeLiveChange(withLive(hp(34)), withLive(hp(27)));
    expect(change).toEqual({ text: "Took 7 damage (34 to 27)", tone: "damage" });
  });

  it("logs healing", () => {
    const change = describeLiveChange(withLive(hp(27)), withLive(hp(34)));
    expect(change).toEqual({ text: "Healed 7 (27 to 34)", tone: "healing" });
  });

  it("counts temporary hit points spent absorbing a hit as damage taken", () => {
    // 5 temp soaks the first 5 of a 10-point hit; current takes the other 5.
    const change = describeLiveChange(withLive(hp(34, 5)), withLive(hp(29, 0)));
    expect(change?.text).toBe("Took 10 damage (34 to 29)");
    expect(change?.tone).toBe("damage");
  });

  it("logs a hit fully absorbed by temporary hit points, which never touches current HP", () => {
    const change = describeLiveChange(withLive(hp(34, 5)), withLive(hp(34, 1)));
    expect(change).toEqual({ text: "Took 4 damage (34 to 34)", tone: "damage" });
  });

  it("logs gained temporary hit points and nonlethal in the same line as the damage", () => {
    const change = describeLiveChange(withLive(hp(20)), withLive(hp(14, 0, 3)));
    expect(change).toEqual({ text: "Took 6 damage (20 to 14), took 3 nonlethal", tone: "damage" });
  });

  it("names conditions rather than their ids", () => {
    const change = describeLiveChange(
      withLive({ conditions: [] }),
      withLive({ conditions: ["shaken"] }),
    );
    expect(change).toEqual({ text: "Became Shaken", tone: "condition" });
  });

  it("joins several conditions gained at once", () => {
    const change = describeLiveChange(
      withLive({ conditions: [] }),
      withLive({ conditions: ["shaken", "prone", "sickened"] }),
    );
    expect(change?.text).toBe("Became Shaken, Prone, and Sickened");
  });

  it("logs conditions that ended", () => {
    const change = describeLiveChange(
      withLive({ conditions: ["prone"] }),
      withLive({ conditions: [] }),
    );
    expect(change).toEqual({ text: "No longer Prone", tone: "condition" });
  });

  it("folds a hit that also knocked you down into one line", () => {
    const change = describeLiveChange(
      withLive({ ...hp(30), conditions: [] }),
      withLive({ ...hp(18), conditions: ["prone"] }),
    );
    expect(change).toEqual({ text: "Took 12 damage (30 to 18), became Prone", tone: "damage" });
  });

  it("is silent about anything that isn't hit points or conditions", () => {
    const before = withLive({ heroPoints: 1, resources: {} });
    const after = withLive({ heroPoints: 2, resources: { ki: { used: 1, max: 6 } } });
    expect(describeLiveChange(before, after)).toBeNull();
  });

  it("is silent when nothing moved", () => {
    expect(describeLiveChange(withLive(hp(30)), withLive(hp(30)))).toBeNull();
  });

  it("does not read a level-up's new maximum as healing", () => {
    // `model/hp.ts:reconcileCurrentHp` pins current up to a raised max while at
    // full health; that is bookkeeping, not a potion.
    const change = describeLiveChange(withLive(hp(34)), withLive(hp(43)), { maxHpMoved: true });
    expect(change).toBeNull();
  });

  it("does not read a clamp under a lowered maximum as damage", () => {
    expect(describeLiveChange(withLive(hp(43)), withLive(hp(34)), { maxHpMoved: true })).toBeNull();
  });

  it("still logs a condition that landed in the same transition as a maximum move", () => {
    const change = describeLiveChange(
      withLive({ ...hp(34), conditions: [] }),
      withLive({ ...hp(43), conditions: ["fatigued"] }),
      { maxHpMoved: true },
    );
    expect(change).toEqual({ text: "Became Fatigued", tone: "condition" });
  });
});

describe("pushLogEntry", () => {
  it("appends, newest last", () => {
    const log = pushLogEntry(pushLogEntry([], entry("a")), entry("b"));
    expect(log.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("drops the oldest lines past the limit", () => {
    let log: SessionLogEntry[] = [];
    for (let i = 0; i < SESSION_LOG_LIMIT + 5; i += 1) log = pushLogEntry(log, entry(`${i}`));
    expect(log).toHaveLength(SESSION_LOG_LIMIT);
    expect(log[0]!.id).toBe("5");
  });
});

describe("parseSessionLog", () => {
  it("reads back what it stored", () => {
    const stored: SessionLogEntry[] = [{ id: "a", at: 1, text: "Took 3 damage", tone: "damage" }];
    expect(parseSessionLog(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
  });

  it("drops entries that aren't log lines, and anything that isn't a list at all", () => {
    expect(parseSessionLog([{ id: "a" }, null, 7, entry("b")])).toEqual([entry("b")]);
    expect(parseSessionLog({ nope: true })).toEqual([]);
    expect(parseSessionLog(undefined)).toEqual([]);
  });

  it("normalizes an unrecognized tone rather than rendering it", () => {
    const parsed = parseSessionLog([{ id: "a", at: 1, text: "x", tone: "explosive" }]);
    expect(parsed[0]!.tone).toBe("neutral");
  });

  it("truncates an over-long stored log to the limit", () => {
    const stored = Array.from({ length: SESSION_LOG_LIMIT + 10 }, (_, i) => entry(`${i}`, i));
    expect(parseSessionLog(stored)).toHaveLength(SESSION_LOG_LIMIT);
  });
});
