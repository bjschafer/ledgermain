/**
 * Hand-computed fixture tests for the gunslinger Grit / swashbuckler Panache
 * spend toggles (`grit-panache-spends.ts`).
 *
 * RAW numbers verified against the vendored `class-features.json` (Gunslinger
 * Initiative, id `ZMk7lj8hea8clAxe`, granted at 3rd level) and `feats.json`
 * (No Name, id `x7aISVUmTxBBBzPm`) for the gunslinger side; against
 * Pathfinder Unchained (Dizzying Defense, 15th level swashbuckler deed) and
 * the vendored `archetype-features.json` (courser's Swift Target/Confounding
 * Target, azatariel's Elysian Conviction) for the swashbuckler side — see
 * `grit-panache-spends.ts`'s file doc comment for the exact quoted text each
 * of these was checked against.
 */

import { describe, expect, it } from "bun:test";

import type { ActiveBuff, CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools } from "../src/index.js";
import {
  DIZZYING_DEFENSE,
  ELYSIAN_CONVICTION,
  GUNSLINGER_INITIATIVE,
  gritToggleOptions,
  NO_NAME_DISGUISE,
  panacheToggleOptions,
} from "../src/grit-panache-spends.js";

const ref = loadRefData();

const NO_NAME_FEAT_ID = "x7aISVUmTxBBBzPm";
const COURSER_ID = "swashbuckler:courser";
const AZATARIEL_ID = "swashbuckler:azatariel";

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeDoc(opts: {
  tag: "gunslinger" | "swashbuckler";
  level: number;
  abilities?: CharacterDoc["abilities"];
  feats?: string[];
  archetypes?: string[];
  activeBuffs?: ActiveBuff[];
}): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: opts.tag, level: opts.level }],
    },
    abilities: opts.abilities ?? { str: 14, dex: 14, con: 12, int: 10, wis: 12, cha: 16 },
    build: {
      feats: opts.feats ?? [],
      archetypes: opts.archetypes ?? [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      weapons: [],
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: opts.activeBuffs ?? [],
      resources: {},
    },
  };
}

function tableBuff(option: {
  id: string;
  name: string;
  changes: ActiveBuff["changes"];
}): ActiveBuff {
  return {
    instanceId: `buff-${option.id}`,
    effectTag: option.id,
    name: option.name,
    changes: option.changes,
  };
}

describe("gritToggleOptions", () => {
  it("gunslinger 3+ offers Gunslinger Initiative", () => {
    expect(gritToggleOptions(3, new Set()).map((o) => o.id)).toContain("grit:gunslingerInitiative");
  });

  it("gunslinger below 3 does not offer Gunslinger Initiative", () => {
    expect(gritToggleOptions(2, new Set()).map((o) => o.id)).not.toContain(
      "grit:gunslingerInitiative",
    );
  });

  it("offers No Name's Disguise clause only when the feat is known", () => {
    expect(gritToggleOptions(1, new Set()).map((o) => o.id)).not.toContain("grit:noNameDisguise");
    expect(gritToggleOptions(1, new Set(["no-name"])).map((o) => o.id)).toContain(
      "grit:noNameDisguise",
    );
  });
});

describe("deriveResourcePools: Grit pool (gunslinger)", () => {
  it("gunslinger 3 shows Gunslinger Initiative on the pool, toggling yields +2 init", () => {
    const doc = makeDoc({ tag: "gunslinger", level: 3 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const grit = pools.find((p) => p.name === "Grit");
    expect(grit?.tableOptions?.map((o) => o.id)).toContain("grit:gunslingerInitiative");

    const withToggle = compute(
      makeDoc({ tag: "gunslinger", level: 3, activeBuffs: [tableBuff(GUNSLINGER_INITIATIVE)] }),
      ref,
    );
    expect(withToggle.initiative.total).toBe(sheet.initiative.total + 2);
  });

  it("gunslinger 1 does NOT show Gunslinger Initiative on the pool", () => {
    const doc = makeDoc({ tag: "gunslinger", level: 1 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    const grit = pools.find((p) => p.name === "Grit");
    expect(grit?.tableOptions?.map((o) => o.id) ?? []).not.toContain("grit:gunslingerInitiative");
  });

  it("no-name feat holder's Grit pool shows the Disguise toggle; a non-holder's doesn't", () => {
    const holder = makeDoc({ tag: "gunslinger", level: 1, feats: [NO_NAME_FEAT_ID] });
    const nonHolder = makeDoc({ tag: "gunslinger", level: 1 });
    const holderPools = deriveResourcePools(holder, ref, compute(holder, ref).abilities);
    const nonHolderPools = deriveResourcePools(nonHolder, ref, compute(nonHolder, ref).abilities);
    expect(holderPools.find((p) => p.name === "Grit")?.tableOptions?.map((o) => o.id)).toContain(
      "grit:noNameDisguise",
    );
    expect(
      nonHolderPools.find((p) => p.name === "Grit")?.tableOptions?.map((o) => o.id) ?? [],
    ).not.toContain("grit:noNameDisguise");
  });

  it("No Name's Disguise toggle adds +10 to Disguise", () => {
    const noBuff = compute(makeDoc({ tag: "gunslinger", level: 1, feats: [NO_NAME_FEAT_ID] }), ref);
    const withBuff = compute(
      makeDoc({
        tag: "gunslinger",
        level: 1,
        feats: [NO_NAME_FEAT_ID],
        activeBuffs: [tableBuff(NO_NAME_DISGUISE)],
      }),
      ref,
    );
    expect(withBuff.skills.dis?.total).toBe((noBuff.skills.dis?.total ?? 0) + 10);
  });
});

describe("drift guard: the vendored Gunslinger Initiative Change stays a no-op", () => {
  it("gunslinger 3 with the toggle OFF gets no contribution from the vendored class feature", () => {
    // buildRollData() never populates a `resources` key (rolldata.ts), so the
    // vendored ClassFeature's own `if(gt(@resources.grit.value,0),2)` Change
    // always evaluates to 0 — GUNSLINGER_INITIATIVE above is the player-
    // declared substitute. If this assertion ever fails, `@resources` has
    // started resolving in compute's roll data: remove either the vendored
    // Change's silent no-op assumption here or the GUNSLINGER_INITIATIVE
    // toggle in grit-panache-spends.ts, not both — applying both would
    // double the +2.
    const sheet = compute(makeDoc({ tag: "gunslinger", level: 3 }), ref);
    const comp = sheet.initiative.components.find((c) => c.source === "Gunslinger Initiative");
    expect(comp).toBeDefined();
    expect(comp?.value).toBe(0);
  });
});

describe("panacheToggleOptions", () => {
  it("swashbuckler 15+ offers Dizzying Defense", () => {
    expect(panacheToggleOptions(15, []).map((o) => o.id)).toContain("panache:dizzyingDefense");
  });

  it("swashbuckler below 15 does not offer Dizzying Defense", () => {
    expect(panacheToggleOptions(14, []).map((o) => o.id)).not.toContain("panache:dizzyingDefense");
  });

  it("courser 1-3 offers Courser Stride at +5 ft, courser 4+ upgrades to +10 ft (never both)", () => {
    const low = panacheToggleOptions(1, [COURSER_ID]);
    const high = panacheToggleOptions(4, [COURSER_ID]);
    expect(low.filter((o) => o.id === "panache:courserStride")).toHaveLength(1);
    expect(low.find((o) => o.id === "panache:courserStride")?.changes[0]?.formula).toBe("5");
    expect(high.filter((o) => o.id === "panache:courserStride")).toHaveLength(1);
    expect(high.find((o) => o.id === "panache:courserStride")?.changes[0]?.formula).toBe("10");
  });

  it("non-courser swashbucklers never see Courser Stride", () => {
    expect(panacheToggleOptions(4, []).map((o) => o.id)).not.toContain("panache:courserStride");
  });

  it("azatariel 2+ offers Elysian Conviction; non-azatariel and sub-2nd-level don't", () => {
    expect(panacheToggleOptions(2, [AZATARIEL_ID]).map((o) => o.id)).toContain(
      "panache:elysianConviction",
    );
    expect(panacheToggleOptions(1, [AZATARIEL_ID]).map((o) => o.id)).not.toContain(
      "panache:elysianConviction",
    );
    expect(panacheToggleOptions(2, []).map((o) => o.id)).not.toContain("panache:elysianConviction");
  });
});

describe("deriveResourcePools: Panache pool (swashbuckler)", () => {
  it("swashbuckler 15 gets Dizzying Defense: +4 dodge AC, -2 melee attack when toggled", () => {
    const doc = makeDoc({ tag: "swashbuckler", level: 15 });
    const sheet = compute(doc, ref);
    const pools = deriveResourcePools(doc, ref, sheet.abilities);
    expect(pools.find((p) => p.name === "Panache")?.tableOptions?.map((o) => o.id)).toContain(
      "panache:dizzyingDefense",
    );

    const withToggle = compute(
      makeDoc({
        tag: "swashbuckler",
        level: 15,
        activeBuffs: [tableBuff(DIZZYING_DEFENSE)],
      }),
      ref,
    );
    expect(withToggle.ac.normal).toBe(sheet.ac.normal + 4);
    expect(withToggle.attack.melee.total).toBe(sheet.attack.melee.total - 2);
  });

  it("courser swashbuckler 1 gets +5 speed via the toggle; courser 4 gets +10", () => {
    const lowDoc = makeDoc({ tag: "swashbuckler", level: 1, archetypes: [COURSER_ID] });
    const lowSheet = compute(lowDoc, ref);
    const lowOption = panacheToggleOptions(1, [COURSER_ID]).find(
      (o) => o.id === "panache:courserStride",
    )!;
    const lowWithToggle = compute(
      makeDoc({
        tag: "swashbuckler",
        level: 1,
        archetypes: [COURSER_ID],
        activeBuffs: [tableBuff(lowOption)],
      }),
      ref,
    );
    expect(lowWithToggle.speeds.land).toBe((lowSheet.speeds.land ?? 0) + 5);

    const highDoc = makeDoc({ tag: "swashbuckler", level: 4, archetypes: [COURSER_ID] });
    const highSheet = compute(highDoc, ref);
    const highOption = panacheToggleOptions(4, [COURSER_ID]).find(
      (o) => o.id === "panache:courserStride",
    )!;
    const highWithToggle = compute(
      makeDoc({
        tag: "swashbuckler",
        level: 4,
        archetypes: [COURSER_ID],
        activeBuffs: [tableBuff(highOption)],
      }),
      ref,
    );
    expect(highWithToggle.speeds.land).toBe((highSheet.speeds.land ?? 0) + 10);
  });

  it("azatariel 2 with Cha 16 (+3 mod): Elysian Conviction toggle adds +3 to Will vs. mind-affecting", () => {
    const doc = makeDoc({
      tag: "swashbuckler",
      level: 2,
      archetypes: [AZATARIEL_ID],
      abilities: { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 16 },
    });
    const sheet = compute(doc, ref);
    const withToggle = compute(
      makeDoc({
        tag: "swashbuckler",
        level: 2,
        archetypes: [AZATARIEL_ID],
        abilities: { str: 12, dex: 14, con: 12, int: 10, wis: 10, cha: 16 },
        activeBuffs: [tableBuff(ELYSIAN_CONVICTION)],
      }),
      ref,
    );
    expect(withToggle.saves.will.total).toBe(sheet.saves.will.total);
    expect(withToggle.saves.will.conditionals).toEqual([
      { total: sheet.saves.will.total + 3, categories: ["mind"], labels: ["mind-affecting"] },
    ]);
  });
});
