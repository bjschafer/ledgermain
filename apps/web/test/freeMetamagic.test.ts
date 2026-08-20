/**
 * Resource-spend free metamagic (model/freeMetamagic.ts): universalist
 * Metamagic Mastery and Meta-Rage source detection, cost math, gating, and
 * the pool spend on cast. Expected values are hand-computed from the
 * published ability texts:
 *   - Metamagic Mastery (CRB, universalist arcane school, 8th): "once per
 *     day at 8th level and one additional time per day for every two wizard
 *     levels you possess beyond 8th"; "a metamagic feat that increases the
 *     spell level by more than 1 ... an additional daily usage for each
 *     level above 1"; "you cannot use this ability to cast a spell whose
 *     modified spell level would be above the level of the highest-level
 *     spell that you are capable of casting".
 *   - Meta-Rage (ACG, bloodrager Metamagic Rager, 5th): "a number of rounds
 *     of bloodrage equal to twice what the spell's adjusted level would
 *     normally be with the metamagic feat applied (minimum 2 rounds)"; "can
 *     apply only one metamagic feat he knows in this manner with each
 *     casting".
 */

import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import { deriveResourcePools } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import {
  addClass,
  createEmptyDoc,
  setArchetypes,
  setClassLevel,
  setWizardSchool,
  toggleFeat,
} from "../src/model/doc.js";
import {
  freeMetamagicOffer,
  freeMetamagicRemaining,
  type FreeMetamagicSource,
  freeMetamagicSources,
  freeMetamagicSpendMessage,
  slotIncreaseWithFree,
  spendFreeMetamagic,
} from "../src/model/freeMetamagic.js";
import { metamagicEffectiveIncrease, metamagicSlotIncrease } from "../src/model/metamagic.js";

const ref = loadRefData();

function featId(name: string): string {
  const entry = Object.entries(ref.feats).find(([, f]) => f.name === name);
  if (!entry) throw new Error(`feat not found: ${name}`);
  return entry[0];
}

/** A universalist wizard (no school chosen = universalist) with metamagic feats. */
function universalist(level: number, ...featNames: string[]): CharacterDoc {
  let doc = setClassLevel(addClass(createEmptyDoc("t"), "wizard"), "wizard", level);
  for (const n of featNames) doc = toggleFeat(doc, featId(n));
  return doc;
}

/** A Metamagic Rager bloodrager with metamagic feats. */
function metamagicRager(level: number, ...featNames: string[]): CharacterDoc {
  let doc = setClassLevel(addClass(createEmptyDoc("t"), "bloodrager"), "bloodrager", level);
  doc = setArchetypes(doc, ["bloodrager:metamagic-rager"], ref);
  for (const n of featNames) doc = toggleFeat(doc, featId(n));
  return doc;
}

function sourceFor(doc: CharacterDoc, casterTag: string): FreeMetamagicSource | undefined {
  const pools = deriveResourcePools(doc, ref);
  return freeMetamagicSources(doc, ref, casterTag, pools)[0];
}

/** Set a pool's live used counter directly (the tracker syncs pools lazily). */
function withPoolUsed(doc: CharacterDoc, poolId: string, used: number, max: number): CharacterDoc {
  return { ...doc, live: { ...doc.live, resources: { [poolId]: { used, max } } } };
}

describe("freeMetamagicSources", () => {
  it("finds Metamagic Mastery for a universalist wizard of 8th+ level", () => {
    const source = sourceFor(universalist(8, "Empower Spell"), "wizard");
    expect(source?.label).toBe("Metamagic Mastery");
    // CRB: 1/day at 8th.
    expect(source?.pool.max).toBe(1);
    // ... +1 per two levels beyond 8th: 3/day at 12th.
    expect(sourceFor(universalist(12), "wizard")?.pool.max).toBe(3);
  });

  it("offers nothing below 8th level, to a specialist, or to another class tab", () => {
    expect(sourceFor(universalist(7, "Empower Spell"), "wizard")).toBeUndefined();
    const specialist = setWizardSchool(universalist(8, "Empower Spell"), "evo", ref);
    expect(sourceFor(specialist, "wizard")).toBeUndefined();
    expect(sourceFor(universalist(8, "Empower Spell"), "cleric")).toBeUndefined();
  });

  it("finds Meta-Rage for a 5th+ level Metamagic Rager, backed by bloodrage rounds", () => {
    const source = sourceFor(metamagicRager(5, "Empower Spell"), "bloodrager");
    expect(source?.label).toBe("Meta-Rage");
    // Bloodrage rounds at 5th, Con 10: 4 + 0 + (5 - 1) * 2 = 12.
    expect(source?.pool.max).toBe(12);
    expect(source?.unit).toBe("round");
  });

  it("requires the archetype and the 5th-level gate for Meta-Rage", () => {
    let doc = setClassLevel(addClass(createEmptyDoc("t"), "bloodrager"), "bloodrager", 5);
    expect(sourceFor(doc, "bloodrager")).toBeUndefined(); // no archetype
    doc = setArchetypes(doc, ["bloodrager:metamagic-rager"], ref);
    expect(sourceFor(setClassLevel(doc, "bloodrager", 4), "bloodrager")).toBeUndefined();
  });
});

describe("cost math", () => {
  it("Metamagic Mastery costs 1 use, plus 1 per slot level above 1 the feat adds", () => {
    const source = sourceFor(universalist(20), "wizard")!;
    expect(source.costFor(3, 1)).toBe(1); // Still Spell (+1)
    expect(source.costFor(3, 2)).toBe(2); // Empower Spell (+2)
    expect(source.costFor(3, 4)).toBe(4); // Quicken Spell (+4)
    expect(source.costFor(3, 0)).toBe(1); // a +0 feat still spends the base use
  });

  it("Meta-Rage costs twice the spell's adjusted level, minimum 2 rounds", () => {
    const source = sourceFor(metamagicRager(5), "bloodrager")!;
    expect(source.costFor(1, 2)).toBe(6); // Empowered 1st: adjusted 3rd -> 6 rounds
    expect(source.costFor(1, 1)).toBe(4); // Stilled 1st: adjusted 2nd -> 4 rounds
    expect(source.costFor(4, 4)).toBe(16); // Quickened 4th: adjusted 8th -> 16 rounds
    expect(source.costFor(0, 0)).toBe(2); // floor: minimum 2 rounds
  });
});

describe("freeMetamagicOffer", () => {
  const doc = universalist(20, "Empower Spell", "Still Spell", "Heighten Spell");
  const source = sourceFor(doc, "wizard")!; // 7/day at 20th

  it("engages when armed with exactly one feat and enough uses, zeroing the increase", () => {
    const applied = [{ slug: "empower-spell" }];
    const offer = freeMetamagicOffer({
      doc,
      source,
      baseLevel: 3,
      applied,
      maxSlotLevel: 9,
      armed: true,
    });
    expect(offer.cost).toBe(2);
    expect(offer.blocked).toBeUndefined();
    expect(offer.engaged).toBe(true);
    expect(slotIncreaseWithFree(metamagicSlotIncrease(applied), offer)).toBe(0);
  });

  it("does not engage while unarmed (the paid path is untouched)", () => {
    const applied = [{ slug: "empower-spell" }];
    const offer = freeMetamagicOffer({
      doc,
      source,
      baseLevel: 3,
      applied,
      maxSlotLevel: 9,
      armed: false,
    });
    expect(offer.engaged).toBe(false);
    expect(slotIncreaseWithFree(metamagicSlotIncrease(applied), offer)).toBe(3 + 2 - 3); // 2
  });

  it("blocks a second applied feat (one feat per cast)", () => {
    const offer = freeMetamagicOffer({
      doc,
      source,
      baseLevel: 3,
      applied: [{ slug: "empower-spell" }, { slug: "still-spell" }],
      maxSlotLevel: 9,
      armed: true,
    });
    expect(offer.blocked).toContain("single metamagic feat");
    expect(offer.engaged).toBe(false);
  });

  it("blocks when the modified level would exceed the highest castable level", () => {
    // Quickened 6th would be a modified 10th-level spell: above 9th.
    const doc2 = universalist(20, "Quicken Spell");
    const source2 = sourceFor(doc2, "wizard")!;
    const offer = freeMetamagicOffer({
      doc: doc2,
      source: source2,
      baseLevel: 6,
      applied: [{ slug: "quicken-spell" }],
      maxSlotLevel: 9,
      armed: true,
    });
    expect(offer.blocked).toContain("level 10");
    expect(offer.engaged).toBe(false);
  });

  it("Meta-Rage carries no modified-level cap (permissive past the paid slot math)", () => {
    // A 7th-level rager (highest slot: 2nd) empowers a 1st-level spell — the
    // paid path would need a 3rd-level slot he doesn't have; Meta-Rage works.
    const rager = metamagicRager(7, "Empower Spell");
    const ragerSource = sourceFor(rager, "bloodrager")!;
    const offer = freeMetamagicOffer({
      doc: rager,
      source: ragerSource,
      baseLevel: 1,
      applied: [{ slug: "empower-spell" }],
      maxSlotLevel: 2,
      armed: true,
    });
    expect(offer.cost).toBe(6);
    expect(offer.blocked).toBeUndefined();
    expect(offer.engaged).toBe(true);
  });

  it("blocks when the pool cannot cover the cost", () => {
    // 20th-level universalist has 7 uses; leave only 1, then try Empower (2).
    const drained = withPoolUsed(doc, source.pool.id, source.pool.max - 1, source.pool.max);
    expect(freeMetamagicRemaining(drained, source)).toBe(1);
    const offer = freeMetamagicOffer({
      doc: drained,
      source,
      baseLevel: 3,
      applied: [{ slug: "empower-spell" }],
      maxSlotLevel: 9,
      armed: true,
    });
    expect(offer.blocked).toContain("only 1 left");
    expect(offer.engaged).toBe(false);
  });

  it("never double-dips with a static discount: free wins, cost stays raw", () => {
    // With a Magical Lineage discount of 1, the PAID increase for Empower
    // would be 1 — but an engaged free application zeroes the whole increase,
    // and the use cost stays keyed to the raw +2, not the discounted +1.
    const applied = [{ slug: "empower-spell" }];
    const offer = freeMetamagicOffer({
      doc,
      source,
      baseLevel: 3,
      applied,
      maxSlotLevel: 9,
      armed: true,
    });
    expect(offer.cost).toBe(2);
    expect(slotIncreaseWithFree(metamagicSlotIncrease(applied, 1), offer)).toBe(0);
    // Unarmed, the discount applies as usual.
    const unarmed = { ...offer, engaged: false };
    expect(slotIncreaseWithFree(metamagicSlotIncrease(applied, 1), unarmed)).toBe(1);
  });

  it("keeps Heighten's DC bump under a free application (slot 0, effective +N)", () => {
    const applied = [{ slug: "heighten-spell", levels: 3 }];
    const offer = freeMetamagicOffer({
      doc,
      source,
      baseLevel: 2,
      applied,
      maxSlotLevel: 9,
      armed: true,
    });
    expect(offer.cost).toBe(3); // 1 use + 1 per level above 1
    expect(offer.engaged).toBe(true);
    expect(slotIncreaseWithFree(metamagicSlotIncrease(applied), offer)).toBe(0);
    expect(metamagicEffectiveIncrease(applied)).toBe(3);
  });
});

describe("spendFreeMetamagic", () => {
  it("drains the pool by the cost on cast, and only when engaged", () => {
    const doc = metamagicRager(5, "Empower Spell");
    const pools = deriveResourcePools(doc, ref);
    const source = freeMetamagicSources(doc, ref, "bloodrager", pools)[0]!;
    const offer = freeMetamagicOffer({
      doc,
      source,
      baseLevel: 1,
      applied: [{ slug: "empower-spell" }],
      maxSlotLevel: 1,
      armed: true,
    });
    expect(offer.engaged).toBe(true);
    expect(freeMetamagicSpendMessage(offer)).toBe("Spent 6 rounds of Bloodrage (Meta-Rage)");
    const after = spendFreeMetamagic(doc, pools, offer);
    expect(after.live.resources[source.pool.id]).toEqual({ used: 6, max: 12 });
    expect(freeMetamagicRemaining(after, source)).toBe(6);
    // Unarmed offer: a plain cast never touches the pool.
    const idle = freeMetamagicOffer({
      doc,
      source,
      baseLevel: 1,
      applied: [{ slug: "empower-spell" }],
      maxSlotLevel: 1,
      armed: false,
    });
    expect(spendFreeMetamagic(doc, pools, idle)).toBe(doc);
    expect(spendFreeMetamagic(doc, pools, undefined)).toBe(doc);
  });

  it("announces the spend in play language", () => {
    const doc = universalist(20, "Empower Spell");
    const pools = deriveResourcePools(doc, ref);
    const source = freeMetamagicSources(doc, ref, "wizard", pools)[0]!;
    const offer = freeMetamagicOffer({
      doc,
      source,
      baseLevel: 3,
      applied: [{ slug: "empower-spell" }],
      maxSlotLevel: 9,
      armed: true,
    });
    expect(freeMetamagicSpendMessage(offer)).toBe("Spent 2 uses of Metamagic Mastery");
    expect(freeMetamagicSpendMessage({ ...offer, engaged: false })).toBeNull();
  });
});
