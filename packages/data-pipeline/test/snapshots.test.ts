import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";

/**
 * Snapshot a few representative entities across the slice. These lock the shape
 * of the normalized output so accidental transform changes are caught; bumping
 * the pinned SHA will surface here as a reviewable snapshot diff.
 */
const ref = loadRefData();

function byName<T extends { name: string }>(rec: Record<string, T>, name: string) {
  return Object.values(rec).find((e) => e.name === name);
}

// Descriptions are large free-text HTML; drop them from snapshots for signal.
function omitDescription<T extends { description?: string }>(entity: T) {
  const { description: _description, ...rest } = entity;
  return rest;
}

describe("normalized-output snapshots", () => {
  it("class: Barbarian", () => {
    expect(omitDescription(byName(ref.classes, "Barbarian")!)).toMatchSnapshot();
  });

  it("class feature: Rage", () => {
    expect(omitDescription(ref.classFeatures[
      byName(ref.classes, "Barbarian")!.features.find((f) => f.name === "Rage")!
        .featureId
    ]!)).toMatchSnapshot();
  });

  it("feat: Cleave (prerequisites)", () => {
    expect(byName(ref.feats, "Cleave")!.prerequisites).toMatchSnapshot();
  });

  it("spell: Fireball", () => {
    expect(omitDescription(byName(ref.spells, "Fireball")!)).toMatchSnapshot();
  });

  it("buff: Fighting Defensively (formula DSL + dodge stacking)", () => {
    expect(omitDescription(byName(ref.buffs, "Fighting Defensively")!))
      .toMatchSnapshot();
  });

  it("race: Human", () => {
    expect(omitDescription(byName(ref.races, "Human")!)).toMatchSnapshot();
  });
});
