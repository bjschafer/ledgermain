/**
 * Undo's one promise: it is exact or unavailable, never approximately right.
 * An undo that is offered leaves the character exactly as if the undone steps
 * had never happened, with every change made since that wasn't an undo step
 * (a rename, a retimed buff, the round clock) still applied.
 *
 * Checked by brute force rather than by listing cases: random sequences of the
 * real transitions the tracker and builder run, classified by the real log
 * classifier, fed through the same `observeTransition` the app calls, then
 * undone all the way back. Each undo that comes back is compared against
 * replaying only the non-step changes onto the doc as it was. A new
 * transition joins by being added to `TRANSITIONS`; nothing here encodes how
 * the history merges, so this can't pass by agreeing with the implementation.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { ActiveBuff, CharacterDoc } from "@pf1/schema";

import {
  addBuff,
  advanceRound,
  removeBuff,
  resetRound,
  setBuffRounds,
  toggleBuffMaster,
  toggleBuffPaused,
} from "../src/model/buffs.js";
import { activateCondition, toggleCondition } from "../src/model/conditions.js";
import { createEmptyDoc, setName, setNotes } from "../src/model/doc.js";
import { applyDamage, applyHealing } from "../src/model/hp.js";
import { prepareSpell, removePreparedAt, setExpendedAt } from "../src/model/preparedSpells.js";
import { drainResource } from "../src/model/resources.js";
import { classifyTransition } from "../src/model/sessionLog.js";
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

const hasBuff = (d: CharacterDoc, id: string) =>
  d.live.activeBuffs.some((b) => b.instanceId === id);

/** Mid-fight, with something real under every transition below. */
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
  doc = addBuff(doc, buff("mage-armor", "Mage Armor"));
  doc = activateCondition(doc, "shaken", 4);
  doc = prepareSpell(doc, spellId("Magic Missile"));
  doc = prepareSpell(doc, spellId("Shield"));
  doc = prepareSpell(doc, spellId("Sleep"));
  doc = setExpendedAt(doc, 2, true);
  return doc;
}

type Transition = (d: CharacterDoc) => CharacterDoc;

/** Real transitions, logged and not. Which is which is the classifier's call. */
const TRANSITIONS: Record<string, Transition> = {
  "take damage": (d) => applyDamage(d, 7),
  heal: (d) => applyHealing(d, 4, 40),
  "toggle prone": (d) => toggleCondition(d, "prone"),
  "become sickened for 2 rounds": (d) => activateCondition(d, "sickened", 2),
  "bless goes up": (d) => (hasBuff(d, "bless") ? d : addBuff(d, buff("bless", "Bless", 10))),
  "haste ends": (d) => removeBuff(d, "haste"),
  "pause mage armor": (d) => toggleBuffPaused(d, "mage-armor"),
  "cast the first prepared spell": (d) => setExpendedAt(d, 0, true),
  "recover the first prepared spell": (d) => setExpendedAt(d, 0, false),
  "spend from a pool": (d) => drainResource(d, "pool", 1),
  "next round": (d) => advanceRound(d).doc,
  "end combat": (d) => resetRound(d),
  rename: (d) => setName(d, d.identity.name === "Kael" ? "Mira" : "Kael"),
  "edit notes": (d) => setNotes(d, `${d.identity.notes ?? ""}+`),
  "retime haste": (d) => setBuffRounds(d, "haste", 2),
  "retime bless": (d) => setBuffRounds(d, "bless", 3),
  "keep haste off the master": (d) => toggleBuffMaster(d, "haste"),
  "prepare another spell": (d) => prepareSpell(d, spellId("Grease")),
  "unprepare the second spell": (d) => removePreparedAt(d, 1),
};
const NAMES = Object.keys(TRANSITIONS);

/** Mulberry32: a fixed seed, so a failure reproduces. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Undo re-stamps `version` and saving stamps `updatedAt`; neither is character state. */
function comparable(doc: CharacterDoc | undefined) {
  return doc && { ...doc, version: 0, updatedAt: "" };
}

interface Applied {
  name: string;
  step: boolean;
  /** The doc just before this change. */
  before: CharacterDoc;
}

describe("undo is exact or unavailable", () => {
  it("the catalog covers both sides of the line, and the round clock", () => {
    const start = midFight();
    const kinds = new Set(
      NAMES.map((name) => {
        const decision = classifyTransition(start, TRANSITIONS[name]!(start), { refData: ref });
        return decision === null ? "silent" : decision.undoable ? "step" : "divider";
      }),
    );
    expect([...kinds].sort()).toEqual(["divider", "silent", "step"]);
  });

  it("every undo it offers equals replaying only the changes that weren't steps", () => {
    const random = rng(74);
    let offered = 0;
    let refused = 0;

    for (let trial = 0; trial < 400; trial++) {
      const state = createUndoHistoryState();
      let doc = midFight();
      const applied: Applied[] = [];

      for (let n = 0; n < 8; n++) {
        const name = NAMES[Math.floor(random() * NAMES.length)]!;
        const moved = TRANSITIONS[name]!(doc);
        // `update()` drops a transition that returns the same doc.
        if (moved === doc) continue;
        const next = { ...moved, version: doc.version + 1 };
        const decision = classifyTransition(doc, next, { refData: ref });
        const step = decision?.undoable ?? false;
        observeTransition(state, doc, next, step ? `${trial}-${n}` : null);
        applied.push({ name, step, before: doc });
        doc = next;
      }

      // Walk back every step the history still holds, newest first.
      let remaining = applied.filter((a) => a.step);
      for (;;) {
        const restored = consumeSnapshot(state, doc.id);
        if (!restored) break;
        const undone = remaining.pop();
        if (!undone) throw new Error("history held a step the sequence never took");
        let expected = undone.before;
        for (const later of applied.slice(applied.indexOf(undone) + 1)) {
          if (!later.step) expected = TRANSITIONS[later.name]!(expected);
        }
        const trace = applied.map((a) => (a.step ? `[${a.name}]` : a.name)).join(" > ");
        expect(comparable(restored.doc), `${trace}\nundoing [${undone.name}]`).toEqual(
          comparable(expected),
        );
        doc = restored.doc;
        offered++;
        // Undoing a step drops it from the sequence: later replays never see it.
        applied.splice(applied.indexOf(undone), 1);
      }
      refused += remaining.length;
    }

    // Both outcomes have to actually happen for this to prove anything.
    expect(offered).toBeGreaterThan(300);
    expect(refused).toBeGreaterThan(50);
  });
});
