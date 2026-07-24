import { describe, expect, it } from "bun:test";

import type { DerivedSense } from "@pf1/schema";

import { senseChipLabel, senseTip } from "../src/model/sensesDisplay.js";

function sense(over: Partial<DerivedSense> = {}): DerivedSense {
  return {
    kind: "darkvision",
    label: "Darkvision",
    range: 60,
    components: [
      { source: "Dwarf", sourceId: "race-dwarf", type: "racial", value: 60, applied: true },
    ],
    ...over,
  };
}

describe("senseChipLabel", () => {
  it("appends the range for a ranged sense", () => {
    expect(senseChipLabel(sense())).toBe("Darkvision 60 ft.");
  });

  it("leaves a rangeless flag sense bare", () => {
    expect(
      senseChipLabel(sense({ kind: "lowLight", label: "Low-light vision", range: undefined })),
    ).toBe("Low-light vision");
  });
});

describe("senseTip", () => {
  it("names the granting source", () => {
    expect(senseTip(sense())).toBe("Granted by Dwarf");
  });

  it("spells out which shorter-ranged grants the winner supersedes", () => {
    const overridden = sense({
      range: 90,
      components: [
        { source: "Half-Orc", type: "racial", value: 60, applied: false },
        { source: "Acute Darkvision", type: "base", value: 90, applied: true },
      ],
    });
    expect(senseTip(overridden)).toBe("Granted by Acute Darkvision · overrides Half-Orc 60 ft.");
  });

  it("omits the range on an overridden flag sense, where a value would be meaningless", () => {
    const flag = sense({
      kind: "lowLight",
      label: "Low-light vision",
      range: undefined,
      components: [
        { source: "Elf", type: "racial", value: 1, applied: true },
        { source: "Shadow's Sight", type: "untyped", value: 1, applied: false },
      ],
    });
    expect(senseTip(flag)).toBe("Granted by Elf · overrides Shadow's Sight");
  });
});
