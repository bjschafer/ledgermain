import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";

import {
  currentVigilanteIdentity,
  setVigilanteIdentity,
  toggleVigilanteIdentity,
} from "../src/model/vigilanteIdentity.js";

function makeDoc(vigilanteIdentity?: "social" | "vigilante"): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: { name: "Test", race: "", classes: [{ tag: "vigilante", level: 5 }] },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    build: { feats: [], skillRanks: {}, classFeatureChoices: [], spells: { known: [] }, gear: [] },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
      vigilanteIdentity,
    },
  };
}

describe("model/vigilanteIdentity", () => {
  it("defaults to 'social' when unset", () => {
    expect(currentVigilanteIdentity(makeDoc())).toBe("social");
  });

  it("setVigilanteIdentity sets explicitly", () => {
    const doc = setVigilanteIdentity(makeDoc(), "vigilante");
    expect(currentVigilanteIdentity(doc)).toBe("vigilante");
  });

  it("toggleVigilanteIdentity flips social <-> vigilante", () => {
    const doc = makeDoc("social");
    const flipped = toggleVigilanteIdentity(doc);
    expect(currentVigilanteIdentity(flipped)).toBe("vigilante");
    const flippedAgain = toggleVigilanteIdentity(flipped);
    expect(currentVigilanteIdentity(flippedAgain)).toBe("social");
  });

  it("toggle from an unset (default 'social') identity flips to 'vigilante'", () => {
    const doc = makeDoc(undefined);
    expect(currentVigilanteIdentity(toggleVigilanteIdentity(doc))).toBe("vigilante");
  });
});
