/**
 * The undo history's one promise: undoing a logged step leaves the character
 * exactly as if that step had never happened, with every unlogged edit made
 * after it still in place. Checked against the real transitions the tracker
 * and builder run, with the real log classifier deciding which side of the
 * line each one falls on, so a transition that starts or stops logging moves
 * itself between the tables below instead of silently passing.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { ActiveBuff, CharacterDoc } from "@pf1/schema";

import { addBuff, advanceRound, setBuffRounds, toggleBuffMaster } from "../src/model/buffs.js";
import { activateCondition, toggleCondition } from "../src/model/conditions.js";
import { createEmptyDoc, setName, setNotes } from "../src/model/doc.js";
import { applyDamage } from "../src/model/hp.js";
import { prepareSpell, removePreparedAt, setExpendedAt } from "../src/model/preparedSpells.js";
import { drainResource } from "../src/model/resources.js";
import { describeLiveChange } from "../src/model/sessionLog.js";
import {
  consumeSnapshot,
  createUndoHistoryState,
  observeTransition,
} from "../src/state/undoSnapshot.js";

const ref = loadRefData();

function spellId(name: string): string {
  const spell = Object.values(ref.spells).find((s) => s.name === name);
  if (!spell) throw new Error(`no spell named ${name}`);
  return spell.id;
}

function buff(instanceId: string, name: string, remainingRounds?: number): ActiveBuff {
  return { instanceId, name, changes: [], ...(remainingRounds ? { remainingRounds } : {}) };
}

/**
 * Mid-fight: hurt, timed buff and condition already up, spells prepared with
 * one already cast, a pool partly spent. Enough on the sheet that every
 * transition below has something real to move.
 */
function midFight(): CharacterDoc {
  const base = createEmptyDoc("c");
  let doc: CharacterDoc = {
    ...base,
    identity: { ...base.identity, classes: [{ tag: "wizard", level: 5 }] },
    live: {
      ...base.live,
      hp: { current: 30, temp: 0, nonlethal: 0 },
      resources: { pool: { used: 1, max: 5 } },
    },
  };
  doc = addBuff(doc, buff("haste", "Haste", 5));
  doc = activateCondition(doc, "shaken", 4);
  doc = prepareSpell(doc, spellId("Magic Missile"));
  doc = prepareSpell(doc, spellId("Shield"));
  doc = prepareSpell(doc, spellId("Sleep"));
  doc = setExpendedAt(doc, 2, true);
  return doc;
}

type Transition = (d: CharacterDoc) => CharacterDoc;

/** Changes that write a log line, and so are undo steps. */
const LOGGED: Record<string, Transition> = {
  "take damage": (d) => applyDamage(d, 7),
  "become prone": (d) => toggleCondition(d, "prone"),
  "a timed buff goes up": (d) => addBuff(d, buff("bless", "Bless", 10)),
  "a buff ends": (d) => ({
    ...d,
    live: { ...d.live, activeBuffs: d.live.activeBuffs.filter((b) => b.instanceId !== "haste") },
  }),
  "cast a prepared spell": (d) => setExpendedAt(d, 0, true),
  "spend from a pool": (d) => drainResource(d, "pool", 1),
};

/** Changes that write no line, and so must survive an undo of an earlier step. */
const UNLOGGED: Record<string, Transition> = {
  "advance the round": (d) => advanceRound(d).doc,
  rename: (d) => setName(d, "Renamed"),
  "edit notes": (d) => setNotes(d, "a note"),
  "retime a buff": (d) => setBuffRounds(d, "haste", 2),
  "retime the buff the logged step added": (d) => setBuffRounds(d, "bless", 3),
  "keep a buff off the master": (d) => toggleBuffMaster(d, "haste"),
  "prepare another spell": (d) => prepareSpell(d, spellId("Grease")),
  "unprepare a spell": (d) => removePreparedAt(d, 1),
};

describe("undo after unlogged edits", () => {
  const start = midFight();

  for (const [name, transition] of Object.entries(LOGGED)) {
    it(`"${name}" writes a log line`, () => {
      expect(describeLiveChange(start, transition(start), { refData: ref })).not.toBeNull();
    });
  }

  for (const [name, transition] of Object.entries(UNLOGGED)) {
    it(`"${name}" writes no log line`, () => {
      const after = transition(start);
      expect(after).not.toBe(start);
      expect(describeLiveChange(start, after, { refData: ref })).toBeNull();
    });
  }

  /**
   * Undoing a step restores what that step changed, as it was. An unlogged
   * edit that only reached something the logged step had taken away never
   * touched it, so the restored item comes back unedited: a buff that ended
   * and is undone a round later returns with the rounds it ended with.
   */
  const REACHED_ONLY_WHAT_LOGGED_REMOVED = new Set(["a buff ends × advance the round"]);

  for (const [loggedName, logged] of Object.entries(LOGGED)) {
    for (const [unloggedName, unlogged] of Object.entries(UNLOGGED)) {
      const pair = `${loggedName} × ${unloggedName}`;
      it(`undoing "${loggedName}" after "${unloggedName}" keeps only the unlogged edit`, () => {
        const state = createUndoHistoryState();
        const afterLogged = logged(start);
        observeTransition(state, start, afterLogged, "line");
        const afterUnlogged = unlogged(afterLogged);
        observeTransition(state, afterLogged, afterUnlogged, null);
        const restored = consumeSnapshot(state, start.id)?.doc;

        if (Bun.deepEquals(afterUnlogged, afterLogged)) {
          // An edit to something the logged step removed changes nothing, so
          // the undo is a plain revert.
          expect(restored).toEqual(start);
        } else if (REACHED_ONLY_WHAT_LOGGED_REMOVED.has(pair)) {
          const haste = (d?: CharacterDoc) =>
            d?.live.activeBuffs.find((b) => b.instanceId === "haste");
          expect(haste(restored)).toEqual(haste(start));
          expect({ ...restored, live: { ...restored!.live, activeBuffs: [] } }).toEqual({
            ...unlogged(start),
            live: { ...unlogged(start).live, activeBuffs: [] },
          });
        } else {
          expect(restored).toEqual(unlogged(start));
        }
      });
    }
  }

  it("walks back two logged steps past unlogged edits on both sides", () => {
    const state = createUndoHistoryState();
    const steps: [Transition, boolean][] = [
      [LOGGED["take damage"]!, true],
      [UNLOGGED["advance the round"]!, false],
      [LOGGED["a timed buff goes up"]!, true],
      [UNLOGGED["prepare another spell"]!, false],
      [UNLOGGED["retime a buff"]!, false],
    ];
    let doc = start;
    for (const [step, isLogged] of steps) {
      const next = step(doc);
      observeTransition(state, doc, next, isLogged ? "line" : null);
      doc = next;
    }
    consumeSnapshot(state, start.id);
    const restored = consumeSnapshot(state, start.id)?.doc;

    let expected = start;
    for (const [step, isLogged] of steps) if (!isLogged) expected = step(expected);
    expect(restored).toEqual(expected);
  });
});
