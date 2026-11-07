import { describe, expect, it } from "bun:test";

import { ARCANE_RESERVOIR_SPELL_DC_ID, compute, deriveResourcePools } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import { payArmedReservoirDc, reservoirDcArmed } from "../src/model/arcaneReservoirSpend.js";
import { toggleTableBuff } from "../src/model/buffs.js";
import { createEmptyDoc } from "../src/model/doc.js";
import { syncDerivedPools } from "../src/model/resources.js";

const ref = loadRefData();

function arcanist(level: number): CharacterDoc {
  const base = createEmptyDoc("t");
  return {
    ...base,
    identity: { ...base.identity, classes: [{ tag: "arcanist", level }] },
    abilities: { ...base.abilities, cha: 14 },
  };
}

function poolsOf(doc: CharacterDoc) {
  const sheet = compute(doc, ref);
  return deriveResourcePools(doc, ref, sheet.abilities, sheet.abilityDCs);
}

function arm(doc: CharacterDoc): CharacterDoc {
  const pool = poolsOf(doc).find((p) => p.name === "Arcane Reservoir")!;
  const option = pool.tableOptions!.find((o) => o.id === ARCANE_RESERVOIR_SPELL_DC_ID)!;
  return toggleTableBuff(syncDerivedPools(doc, [pool]), option);
}

function reservoirUsed(doc: CharacterDoc): number {
  const pool = poolsOf(doc).find((p) => p.name === "Arcane Reservoir")!;
  return doc.live.resources[pool.id]?.used ?? 0;
}

describe("payArmedReservoirDc", () => {
  // ACG p.9: a free action as the spell is cast, 1 point, at most 1 per spell.
  it("spends 1 reservoir point and switches the spend off", () => {
    const armed = arm(arcanist(5));
    expect(reservoirDcArmed(armed)).toBe(true);

    const paid = payArmedReservoirDc(armed, poolsOf(armed));
    expect(reservoirUsed(paid)).toBe(1);
    expect(reservoirDcArmed(paid)).toBe(false);
    expect(compute(paid, ref).spellDCs?.all ?? 0).toBe(0);
  });

  it("is a no-op when nothing is armed", () => {
    const doc = arcanist(5);
    expect(payArmedReservoirDc(doc, poolsOf(doc))).toBe(doc);
  });

  it("still disarms with the reservoir empty", () => {
    let doc = arm(arcanist(1));
    const pool = poolsOf(doc).find((p) => p.name === "Arcane Reservoir")!;
    const max = doc.live.resources[pool.id]!.max;
    doc = {
      ...doc,
      live: { ...doc.live, resources: { ...doc.live.resources, [pool.id]: { used: max, max } } },
    };

    const paid = payArmedReservoirDc(doc, poolsOf(doc));
    expect(reservoirUsed(paid)).toBe(max);
    expect(reservoirDcArmed(paid)).toBe(false);
  });
});
