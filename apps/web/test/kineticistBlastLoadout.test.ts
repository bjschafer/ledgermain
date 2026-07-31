/**
 * The per-activation blast loadout: `model/kineticistBuild.ts`'s live-state
 * transitions and `model/kineticistBlastDisplay.ts`'s line strings.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc, DerivedKineticBlast, DerivedKineticBlastBurn } from "@pf1/schema";

import { createEmptyDoc } from "../src/model/doc.js";
import {
  blastBurnLabel,
  blastBurnWarning,
  blastSubLine,
  deliveryLabel,
} from "../src/model/kineticistBlastDisplay.js";
import {
  clearKineticistBlastLoadout,
  knownKineticistInfusions,
  setKineticistBlastInfusion,
  setKineticistGatherPower,
  toggleKineticistMetakinesis,
  toggleKineticistWildTalent,
} from "../src/model/kineticistBuild.js";

const ref = loadRefData();

function kineticist(): CharacterDoc {
  const d = createEmptyDoc("t");
  return { ...d, identity: { ...d.identity, classes: [{ tag: "kineticist", level: 9 }] } };
}

describe("loadout transitions", () => {
  it("sets and clears each slot, and an emptied loadout goes back to undefined", () => {
    const armed = setKineticistBlastInfusion(kineticist(), "form", "universal:torrent");
    expect(armed.live.kineticistBlastLoadout?.form).toBe("universal:torrent");

    const cleared = setKineticistBlastInfusion(armed, "form", null);
    // Not an empty object: a leftover shell would keep the panel looking armed.
    expect(cleared.live.kineticistBlastLoadout).toBeUndefined();
  });

  it("keeps the other slots when one changes", () => {
    let doc = setKineticistBlastInfusion(kineticist(), "form", "universal:torrent");
    doc = setKineticistBlastInfusion(doc, "substance", "fire:dazzlingInfusion");
    doc = setKineticistGatherPower(doc, "move");
    expect(doc.live.kineticistBlastLoadout).toEqual({
      form: "universal:torrent",
      substance: "fire:dazzlingInfusion",
      gatherPower: "move",
    });
  });

  it("toggles Metakinesis options on and off", () => {
    let doc = toggleKineticistMetakinesis(kineticist(), "empower");
    doc = toggleKineticistMetakinesis(doc, "maximize");
    expect(doc.live.kineticistBlastLoadout?.metakinesis).toEqual(["empower", "maximize"]);
    doc = toggleKineticistMetakinesis(doc, "empower");
    expect(doc.live.kineticistBlastLoadout?.metakinesis).toEqual(["maximize"]);
    doc = toggleKineticistMetakinesis(doc, "maximize");
    expect(doc.live.kineticistBlastLoadout).toBeUndefined();
  });

  it("clears everything in one call", () => {
    let doc = setKineticistBlastInfusion(kineticist(), "form", "universal:torrent");
    doc = toggleKineticistMetakinesis(doc, "quicken");
    expect(clearKineticistBlastLoadout(doc).live.kineticistBlastLoadout).toBeUndefined();
  });
});

describe("knownKineticistInfusions()", () => {
  it("splits the character's picks by slot and leaves utility talents out", () => {
    let doc = toggleKineticistWildTalent(kineticist(), "universal:torrent"); // form
    doc = toggleKineticistWildTalent(doc, "fire:dazzlingInfusion"); // substance
    doc = toggleKineticistWildTalent(doc, "water:kineticHealer"); // utility

    expect(knownKineticistInfusions(doc, ref, "form").map((i) => i.name)).toEqual(["Torrent"]);
    expect(knownKineticistInfusions(doc, ref, "substance").map((i) => i.name)).toEqual([
      "Dazzling Infusion",
    ]);
  });
});

const BURN: DerivedKineticBlastBurn = {
  blast: 0,
  infusions: 0,
  infusionSpecialization: 0,
  metakinesis: 0,
  gatherPower: 0,
  total: 0,
  perRoundLimit: 2,
  maxHeld: 6,
  held: 0,
};

describe("blastBurnLabel()", () => {
  it("prints nothing at all for a free blast", () => {
    expect(blastBurnLabel(BURN)).toBeNull();
  });

  it("shows the gross cost alongside the net when something reduced it", () => {
    expect(
      blastBurnLabel({ ...BURN, blast: 2, infusions: 2, infusionSpecialization: 1, total: 3 }),
    ).toBe("3 burn (4 reduced by 1)");
  });

  it("shows a reduction that took the cost to nothing", () => {
    expect(blastBurnLabel({ ...BURN, infusions: 1, infusionSpecialization: 1, total: 0 })).toBe(
      "0 burn (1 reduced by 1)",
    );
  });
});

describe("blastBurnWarning()", () => {
  it("flags a cost past the per-round limit", () => {
    expect(blastBurnWarning({ ...BURN, total: 3 })).toBe("Over the 2/round burn limit");
  });

  it("flags a cost that would pass the ceiling on burn held", () => {
    expect(blastBurnWarning({ ...BURN, total: 2, held: 5 })).toBe("Would pass 6 burn held (5 now)");
  });

  it("says nothing about a cost she can pay", () => {
    expect(blastBurnWarning({ ...BURN, total: 2, held: 1 })).toBeNull();
  });
});

const LINE: DerivedKineticBlast = {
  id: "fireBlast",
  name: "Fire Blast",
  kind: "simple",
  blastType: "energy",
  descriptor: "fire",
  touch: true,
  attack: { total: 8, components: [] },
  damageBonus: { total: 2, components: [] },
  damageDice: "5d6",
  crit: "×2",
  range: 30,
  elements: ["fire"],
  effectiveSpellLevel: 4,
  burnCost: BURN,
  infusions: [],
  delivery: "ranged",
};

describe("blastSubLine()", () => {
  it("reads delivery, range, and descriptor for a bare blast", () => {
    expect(blastSubLine(LINE)).toBe("ranged touch · 30 ft · fire");
  });

  it("replaces the range with the area once a form infusion shapes it", () => {
    expect(
      blastSubLine({
        ...LINE,
        delivery: "area",
        area: "30-ft. line",
        burnCost: { ...BURN, infusions: 2, total: 2 },
      }),
    ).toBe("area · 30-ft. line · fire · 2 burn");
  });

  it("names a self-centered area rather than printing a range of 0", () => {
    expect(deliveryLabel({ ...LINE, delivery: "area", range: 0 })).toBe("area, centered on you");
    expect(blastSubLine({ ...LINE, delivery: "area", range: 0, area: "15-ft. cone" })).toBe(
      "area, centered on you · 15-ft. cone · fire",
    );
  });

  it("says a rider infusion rides your own attacks", () => {
    expect(deliveryLabel({ ...LINE, delivery: "rider" })).toBe("rides your attacks");
  });
});
