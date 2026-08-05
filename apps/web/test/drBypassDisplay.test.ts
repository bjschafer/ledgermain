import { describe, expect, it } from "bun:test";

import type { WeaponDrBypass } from "@pf1/schema";

import { bypassChipLabel, bypassLine, bypassTip } from "../src/model/drBypassDisplay.js";
import { expectNoDashes } from "./houseStyle.js";

const coldIron: WeaponDrBypass = { qualifier: "cold-iron", sources: ["Cold iron"] };

describe("bypassChipLabel", () => {
  it("reads as prose, not as a slug", () => {
    expect(bypassChipLabel(coldIron)).toBe("Cold iron");
    expect(bypassChipLabel({ qualifier: "magic", sources: ["+1 enhancement"] })).toBe("Magic");
  });
});

describe("bypassTip", () => {
  it("names every source", () => {
    expect(bypassTip({ qualifier: "silver", sources: ["Mithral", "+3 enhancement"] })).toBe(
      "Counts as silver for overcoming damage reduction, from Mithral, +3 enhancement.",
    );
  });

  it("calls out hardness and a condition when they apply", () => {
    const tip = bypassTip({
      qualifier: "adamantine",
      sources: ["Monk 16"],
      hardness: true,
      condition: "while you have at least 1 ki point",
    });
    expect(tip).toContain("Also bypasses hardness.");
    expect(tip).toContain("Applies while you have at least 1 ki point.");
  });

  it("stays inside house style", () => {
    expectNoDashes("bypassTip", bypassTip(coldIron));
    expectNoDashes("bypassChipLabel", bypassChipLabel(coldIron));
  });
});

describe("bypassLine", () => {
  it("joins the qualifiers for the printed sheet", () => {
    expect(
      bypassLine([
        coldIron,
        { qualifier: "silver", sources: ["+3 enhancement"] },
        { qualifier: "magic", sources: ["+3 enhancement"] },
      ]),
    ).toBe("cold iron, silver, magic");
  });
});
