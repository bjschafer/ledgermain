import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";
import { SUPPLEMENTAL_RACE_SENSES } from "../src/supplements.js";

/**
 * Race-level senses (darkvision, low-light vision, …) against the real
 * vendored slice. Upstream carries them as description prose only; this pins
 * both halves of `SUPPLEMENTAL_RACE_SENSES` — that every supplemented range
 * matches the race's own write-up, and that the races WITHOUT an entry
 * genuinely have no Senses racial trait rather than having been forgotten.
 *
 * The second half is the audit trap the table exists to close: a race that
 * grows a darkvision line upstream, or one skipped by a typo, fails here
 * instead of silently showing a sightless dwarf.
 */
const ref = loadRefData();

/** Sense-target → value for one race, e.g. `{ sensedv: 60, sensell: 1 }`. */
function senseChanges(raceName: string): Record<string, number> {
  const race = Object.values(ref.races).find((r) => r.name === raceName);
  if (!race) throw new Error(`race "${raceName}" not in the vendored slice`);
  const out: Record<string, number> = {};
  for (const change of race.changes) {
    if (change.target.startsWith("sense")) out[change.target] = Number(change.formula);
  }
  return out;
}

/** The race's description with HTML tags stripped, lowercased. */
function descriptionText(raceName: string): string {
  const race = Object.values(ref.races).find((r) => r.name === raceName);
  if (!race) throw new Error(`race "${raceName}" not in the vendored slice`);
  return (race.description ?? "").replace(/<[^>]*>/g, " ").toLowerCase();
}

describe("race senses", () => {
  it("core races match their published sense lines", () => {
    expect(senseChanges("Dwarf")).toEqual({ sensedv: 60 });
    expect(senseChanges("Elf")).toEqual({ sensell: 1 });
    expect(senseChanges("Gnome")).toEqual({ sensell: 1 });
    expect(senseChanges("Half-Elf")).toEqual({ sensell: 1 });
    expect(senseChanges("Half-Orc")).toEqual({ sensedv: 60 });
    // Halfling's Keen Senses is a +2 Perception bonus, NOT a vision trait.
    expect(senseChanges("Halfling")).toEqual({});
    expect(senseChanges("Human")).toEqual({});
  });

  it("the three 120-ft. underground races get superior darkvision, not 60", () => {
    expect(senseChanges("Drow").sensedv).toBe(120);
    expect(senseChanges("Drow Noble").sensedv).toBe(120);
    expect(senseChanges("Duergar").sensedv).toBe(120);
    expect(senseChanges("Munavri").sensedv).toBe(120);
    // Svirfneblin are the only 120-ft. race that also has low-light vision.
    expect(senseChanges("Svirfneblin")).toEqual({ sensedv: 120, sensell: 1 });
  });

  it("carries the non-vision senses their write-ups grant", () => {
    expect(senseChanges("Caligni")).toEqual({ sensesid: 1 });
    expect(senseChanges("Sahuagin")).toEqual({ sensedv: 60, sensebse: 30 });
    expect(senseChanges("Rougarou")).toEqual({ sensell: 1, sensesc: 30 });
  });

  it("omits senses a race only has situationally", () => {
    // Blindsight 10 ft. costs a swift action and lasts only while the
    // cecaelia concentrates — not an unconditional sheet line.
    expect(senseChanges("Cecaelia")).toEqual({ sensedv: 60 });
    // Skinwalker darkvision 60 ft. applies in bestial form only.
    expect(senseChanges("Skinwalker")).toEqual({ sensell: 1 });
    // Adaro's Keen Scent works underwater only.
    expect(senseChanges("Adaro").sensesc).toBeUndefined();
  });

  it("every supplemented race exists and got exactly the table's senses", () => {
    for (const [name, senses] of Object.entries(SUPPLEMENTAL_RACE_SENSES)) {
      expect(senseChanges(name)).toEqual({ ...senses });
    }
  });

  it("every race with sense prose is in the table — no silent gaps", () => {
    // Exempt: prose that names a sense the race does not actually have as an
    // unconditional trait (see SUPPLEMENTAL_RACE_SENSES's exclusion list).
    const KEYWORDS = ["darkvision", "low-light", "lowlight", "low light", "see in darkness"];
    const missing = Object.values(ref.races)
      .filter((race) => SUPPLEMENTAL_RACE_SENSES[race.name] === undefined)
      .filter((race) => {
        const text = descriptionText(race.name);
        return KEYWORDS.some((k) => text.includes(k));
      })
      .map((race) => race.name);
    expect(missing).toEqual([]);
  });

  it("races left out of the table have no Senses racial trait at all", () => {
    const uncovered = Object.values(ref.races)
      .filter((race) => SUPPLEMENTAL_RACE_SENSES[race.name] === undefined)
      .map((race) => race.name)
      .sort();
    expect(uncovered).toEqual([
      "Ghoran",
      "Gillman",
      "Green Martian",
      "Halfling",
      "Human",
      "Kasatha",
      "Lashunta (Female)",
      "Lashunta (Male)",
      "Lizardfolk",
      "Primitive Human",
    ]);
  });
});
