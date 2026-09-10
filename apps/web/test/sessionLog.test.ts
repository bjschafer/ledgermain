import { describe, expect, it } from "bun:test";

import type { CharacterDoc, RefData } from "@pf1/schema";

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

function withBuild(
  live: Partial<CharacterDoc["live"]>,
  build: Partial<CharacterDoc["build"]>,
): CharacterDoc {
  const doc = withLive(live);
  return { ...doc, build: { ...doc.build, ...build } };
}

function hp(current: number, temp = 0, nonlethal = 0): Partial<CharacterDoc["live"]> {
  return { hp: { current, temp, nonlethal } };
}

function entry(id: string, at = 0): SessionLogEntry {
  return { id, at, text: id, tone: "neutral", kind: "hp" };
}

/** The text alone, for the many cases where tone and kind aren't the point. */
function text(before: CharacterDoc, after: CharacterDoc): string | undefined {
  return describeLiveChange(before, after)?.text;
}

describe("describeLiveChange: hit points", () => {
  it("logs damage with the hit points either side of it", () => {
    const change = describeLiveChange(withLive(hp(34)), withLive(hp(27)));
    expect(change).toEqual({ text: "Took 7 damage (34 to 27)", tone: "damage", kind: "hp" });
  });

  it("logs healing", () => {
    const change = describeLiveChange(withLive(hp(27)), withLive(hp(34)));
    expect(change).toEqual({ text: "Healed 7 (27 to 34)", tone: "healing", kind: "hp" });
  });

  it("counts temporary hit points spent absorbing a hit as damage taken", () => {
    // 5 temp soaks the first 5 of a 10-point hit; current takes the other 5.
    const change = describeLiveChange(withLive(hp(34, 5)), withLive(hp(29, 0)));
    expect(change?.text).toBe("Took 10 damage (34 to 29)");
    expect(change?.tone).toBe("damage");
  });

  it("logs a hit fully absorbed by temporary hit points, which never touches current HP", () => {
    const change = describeLiveChange(withLive(hp(34, 5)), withLive(hp(34, 1)));
    expect(change?.text).toBe("Took 4 damage (34 to 34)");
  });

  it("logs gained temporary hit points and nonlethal in the same line as the damage", () => {
    const change = describeLiveChange(withLive(hp(20)), withLive(hp(14, 0, 3)));
    expect(change?.text).toBe("Took 6 damage (20 to 14), took 3 nonlethal");
  });

  it("logs stabilizing, and losing it again", () => {
    const dying = withLive({ ...hp(-4) });
    const stable = withLive({ ...hp(-4), stable: true });
    expect(describeLiveChange(dying, stable)).toEqual({
      text: "Stabilized",
      tone: "healing",
      kind: "hp",
    });
    expect(text(stable, dying)).toBe("No longer stabilized");
  });
});

describe("describeLiveChange: conditions", () => {
  it("names conditions rather than their ids", () => {
    const change = describeLiveChange(
      withLive({ conditions: [] }),
      withLive({ conditions: ["shaken"] }),
    );
    expect(change).toEqual({ text: "Became Shaken", tone: "condition", kind: "condition" });
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
    expect(change?.text).toBe("No longer Prone");
  });

  it("folds a hit that also knocked you down into one line, kinded by what led it", () => {
    const change = describeLiveChange(
      withLive({ ...hp(30), conditions: [] }),
      withLive({ ...hp(18), conditions: ["prone"] }),
    );
    expect(change).toEqual({
      text: "Took 12 damage (30 to 18), became Prone",
      tone: "damage",
      kind: "hp",
    });
  });
});

describe("describeLiveChange: afflictions", () => {
  it("logs ability damage taken and recovered, by ability name", () => {
    const clean = withLive({});
    const poisoned = withLive({ abilityDamage: { str: 4 } });
    expect(describeLiveChange(clean, poisoned)).toEqual({
      text: "Took 4 Strength damage",
      tone: "damage",
      kind: "affliction",
    });
    expect(text(poisoned, withLive({ abilityDamage: { str: 3 } }))).toBe(
      "Recovered 1 Strength damage",
    );
  });

  it("keeps drain and penalty distinct from damage", () => {
    expect(text(withLive({}), withLive({ abilityDrain: { con: 2 } }))).toBe(
      "Drained 2 Constitution",
    );
    expect(text(withLive({ abilityDrain: { con: 2 } }), withLive({}))).toBe(
      "Restored 2 Constitution",
    );
    expect(text(withLive({}), withLive({ abilityPenalty: { dex: 2 } }))).toBe(
      "Took a 2 point Dexterity penalty",
    );
    expect(text(withLive({ abilityPenalty: { dex: 1 } }), withLive({}))).toBe(
      "Shook off 1 point of Dexterity penalty",
    );
  });

  it("logs negative levels, keeping permanent ones labelled", () => {
    expect(text(withLive({}), withLive({ negativeLevels: { temporary: 2 } }))).toBe(
      "Gained 2 negative levels",
    );
    expect(text(withLive({}), withLive({ negativeLevels: { permanent: 1 } }))).toBe(
      "Gained 1 permanent negative level",
    );
    expect(text(withLive({ negativeLevels: { temporary: 1 } }), withLive({}))).toBe(
      "Cleared 1 negative level",
    );
  });
});

describe("describeLiveChange: hero points", () => {
  it("says how many are left after spending one", () => {
    const change = describeLiveChange(withLive({ heroPoints: 3 }), withLive({ heroPoints: 2 }));
    expect(change).toEqual({
      text: "Spent 1 hero point (2 left)",
      tone: "neutral",
      kind: "heroPoint",
    });
  });

  it("says how many are held after gaining one", () => {
    expect(text(withLive({ heroPoints: 1 }), withLive({ heroPoints: 2 }))).toBe(
      "Gained 1 hero point (2 held)",
    );
  });
});

describe("describeLiveChange: spells", () => {
  const prepared = (spellId: string, expended: boolean) => ({
    spells: { prepared: [{ spellId, expended }] },
  });

  it("names a prepared spell that was cast", () => {
    const change = describeLiveChange(
      withLive(prepared("magic-missile", false)),
      withLive(prepared("magic-missile", true)),
    );
    expect(change).toEqual({ text: "Cast magic-missile", tone: "neutral", kind: "spell" });
  });

  it("uses RefData for the spell's name when it has it", () => {
    const change = describeLiveChange(
      withLive(prepared("magic-missile", false)),
      withLive(prepared("magic-missile", true)),
      { refData: { spells: { "magic-missile": { name: "Magic Missile" } } } as unknown as RefData },
    );
    expect(change?.text).toBe("Cast Magic Missile");
  });

  it("does not read a deleted prepared spell as a slot coming back", () => {
    const before = withLive(prepared("magic-missile", true));
    const after = withLive({ spells: { prepared: [] } });
    expect(describeLiveChange(before, after)).toBeNull();
  });

  it("logs a spontaneous caster's slot by level, and a cantrip by name", () => {
    expect(
      text(
        withLive({ spells: { prepared: [], slotsUsed: {} } }),
        withLive({
          spells: { prepared: [], slotsUsed: { 3: 1 } },
        }),
      ),
    ).toBe("Cast a 3rd level spell");
    expect(
      text(
        withLive({ spells: { prepared: [], slotsUsed: { 1: 2 } } }),
        withLive({
          spells: { prepared: [], slotsUsed: { 1: 0 } },
        }),
      ),
    ).toBe("Recovered 2 1st level slots");
  });

  it("counts a second caster class's slots alongside the primary one's", () => {
    expect(
      text(
        withLive({ spells: { prepared: [] } }),
        withLive({
          spells: { prepared: [], slotsUsedByClass: { bard: { 2: 1 } } },
        }),
      ),
    ).toBe("Cast a 2nd level spell");
  });
});

describe("describeLiveChange: buffs", () => {
  const buff = (instanceId: string, name: string, remainingRounds?: number) => ({
    instanceId,
    name,
    changes: [],
    ...(remainingRounds === undefined ? {} : { remainingRounds }),
  });

  it("logs a buff going up with the rounds it has left", () => {
    const change = describeLiveChange(
      withLive({ activeBuffs: [] }),
      withLive({ activeBuffs: [buff("b1", "Bless", 10)] }),
    );
    expect(change).toEqual({ text: "Bless is up for 10 rounds", tone: "neutral", kind: "buff" });
  });

  it("logs an indefinite buff without inventing a duration", () => {
    expect(
      text(
        withLive({ activeBuffs: [] }),
        withLive({ activeBuffs: [buff("b1", "Bull's Strength")] }),
      ),
    ).toBe("Bull's Strength is up");
  });

  it("logs a buff ending", () => {
    expect(
      text(withLive({ activeBuffs: [buff("b1", "Bless")] }), withLive({ activeBuffs: [] })),
    ).toBe("Bless ended");
  });

  it("does not repeat a spell that put its own buff up in the same tap", () => {
    // The spells panel's Apply spends the slot and applies the buff at once;
    // "Cast Bless, Bless is up" says the same thing twice.
    const before = withLive({ spells: { prepared: [{ spellId: "Bless", expended: false }] } });
    const after = withLive({
      spells: { prepared: [{ spellId: "Bless", expended: true }] },
      activeBuffs: [buff("b1", "Bless", 10)],
    });
    expect(text(before, after)).toBe("Cast Bless");
  });
});

describe("describeLiveChange: resources", () => {
  it("logs a pool spent, with what is left", () => {
    const change = describeLiveChange(
      withLive({ resources: { ki: { used: 0, max: 6 } } }),
      withLive({ resources: { ki: { used: 1, max: 6 } } }),
    );
    expect(change).toEqual({ text: "Spent 1 Ki (5 left)", tone: "neutral", kind: "resource" });
  });

  it("reads a camelCase pool id as words when nothing can name it", () => {
    expect(
      text(
        withLive({ resources: { bardicPerformance: { used: 2, max: 10 } } }),
        withLive({ resources: { bardicPerformance: { used: 5, max: 10 } } }),
      ),
    ).toBe("Spent 3 Bardic Performance (5 left)");
  });

  it("prefers the name the caller resolves", () => {
    const change = describeLiveChange(
      withLive({ resources: { layOnHands: { used: 0, max: 5 } } }),
      withLive({ resources: { layOnHands: { used: 1, max: 5 } } }),
      { resourceName: (id) => (id === "layOnHands" ? "Lay on Hands" : undefined) },
    );
    expect(change?.text).toBe("Spent 1 Lay on Hands (4 left)");
  });

  it("says nothing about a pool that only just appeared under a build edit", () => {
    expect(
      describeLiveChange(
        withLive({ resources: {} }),
        withLive({ resources: { ki: { used: 0, max: 6 } } }),
      ),
    ).toBeNull();
  });
});

describe("describeLiveChange: forms and companions", () => {
  const form = (formName: string) => ({
    activeForm: { tier: "beastShapeII", creatureType: "animal", size: "lg" as const, formName },
  });

  it("logs taking a form and returning from it", () => {
    expect(text(withLive({}), withLive(form("Dire Wolf")))).toBe("Took the form of Dire Wolf");
    expect(text(withLive(form("Dire Wolf")), withLive({}))).toBe("Returned to your own form");
    expect(text(withLive(form("Dire Wolf")), withLive(form("Giant Eagle")))).toBe(
      "Changed form to Giant Eagle",
    );
  });

  it("logs a companion's own damage under its own name", () => {
    const build = { familiar: { speciesId: "cat", name: "Mortlach" } };
    const change = describeLiveChange(
      withBuild({ familiar: { damage: 0 } }, build),
      withBuild({ familiar: { damage: 4 } }, build),
    );
    expect(change).toEqual({
      text: "Mortlach took 4 damage",
      tone: "damage",
      kind: "companion",
    });
  });

  it("falls back to a plain label when the companion has no name", () => {
    expect(text(withLive({ familiar: { damage: 0 } }), withLive({ familiar: { damage: 2 } }))).toBe(
      "Familiar took 2 damage",
    );
  });

  it("logs a companion's own conditions", () => {
    expect(
      text(
        withLive({ animalCompanion: { conditions: [] } }),
        withLive({ animalCompanion: { conditions: ["shaken"] } }),
      ),
    ).toBe("Animal companion became Shaken");
  });

  it("logs an eidolon being summoned and dismissed", () => {
    expect(text(withLive({ eidolon: {} }), withLive({ eidolon: { summoned: true } }))).toBe(
      "Eidolon is summoned",
    );
    expect(text(withLive({ eidolon: { summoned: true } }), withLive({ eidolon: {} }))).toBe(
      "Eidolon is dismissed",
    );
  });

  it("says nothing about a shared buff moving onto a companion", () => {
    // The buff itself already earned a line; which creatures it reaches is
    // bookkeeping on top of that.
    expect(
      describeLiveChange(
        withLive({ familiar: { sharedBuffIds: [] } }),
        withLive({ familiar: { sharedBuffIds: ["b1"] } }),
      ),
    ).toBeNull();
  });
});

describe("describeLiveChange: what it stays quiet about", () => {
  it("is silent when nothing moved", () => {
    expect(describeLiveChange(withLive(hp(30)), withLive(hp(30)))).toBeNull();
  });

  it("is silent about the round clock and a condition's countdown", () => {
    expect(
      describeLiveChange(
        withLive({ round: 3, conditionRounds: { fatigued: 4 }, conditions: ["fatigued"] }),
        withLive({ round: 4, conditionRounds: { fatigued: 3 }, conditions: ["fatigued"] }),
      ),
    ).toBeNull();
  });

  it("is silent about build edits and bookkeeping it does not track", () => {
    expect(describeLiveChange(withLive({ xp: 0 }), withLive({ xp: 1200 }))).toBeNull();
    expect(describeLiveChange(withLive({}), withLive({ money: { gp: 40 } }))).toBeNull();
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
    expect(change?.text).toBe("Became Fatigued");
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
    const stored: SessionLogEntry[] = [
      { id: "a", at: 1, text: "Took 3 damage", tone: "damage", kind: "hp" },
    ];
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

  it("gives a line stored before lines were categorized a category anyway", () => {
    const parsed = parseSessionLog([{ id: "a", at: 1, text: "Took 3 damage", tone: "damage" }]);
    expect(parsed[0]!.kind).toBe("other");
  });

  it("truncates an over-long stored log to the limit", () => {
    const stored = Array.from({ length: SESSION_LOG_LIMIT + 10 }, (_, i) => entry(`${i}`, i));
    expect(parseSessionLog(stored)).toHaveLength(SESSION_LOG_LIMIT);
  });
});
