import { describe, expect, it } from "bun:test";

import {
  blessingClassFeatures,
  parseBlessingDeities,
  parseBlessingPowers,
  transformBlessings,
} from "../src/transform/warpriestBlessings.js";
import type { PfDataDictionary } from "../src/util/pfdata.js";

/**
 * Unit coverage for the blessing import, on hand-built input shaped like the
 * real Pf Data 1e blessing file (mirrors `subdomainPowers.test.ts`).
 * `warpriestBlessings.test.ts` covers the result against the real vendored
 * slice.
 */

const AIR_BODY = [
  "**Deities:** ‹faith/Gozreh›, ‹faith/Shelyn›",
  "",
  "**Zephyr's Gift (minor):** At 1st level, you can touch a ranged weapon.",
  "",
  "**Soaring Assault (major):** At 10th level, you can touch an ally and give her flight, as ‹spell/fly›.",
];

const DICT: PfDataDictionary = {
  not_found: {
    name: "Unknown",
    description: ["## Error", "", "Unable to find the requested blessing."],
  },
  air: {
    name: "Air",
    sources: ["Advanced Class Guide"],
    description: ["## Air", "", "‹SOURCE Advanced Class Guide/63›  ", ...AIR_BODY],
  },
  // A conditional-rule entry (no named deities, mirrors Earthquake/Flood/Tornado/Wildfire).
  tornado: {
    name: "Tornado",
    description: [
      "## Tornado",
      "",
      "‹SOURCE Advanced Class Guide/68›",
      "",
      "**Deities:** Evil deities that offer the ‹blessing/Air› blessing or nonevil deities with disasters in their portfolios",
      "",
      "**Storm's Fury (minor):** At 1st level, you gain resistance.",
      "",
      "**Eye of the Storm (major):** At 10th level, you gain immunity.",
    ],
  },
  // A splatbook-variant entry: its own replacement minor power appears AFTER the base pair.
  community: {
    name: "Community",
    sources: ["Advanced Class Guide"],
    description: [
      "## Community",
      "",
      "‹SOURCE Advanced Class Guide/65›  ",
      "**Deities:** ‹faith/Erastil›",
      "",
      "**Communal Aid (minor):** At 1st level, you can aid another.",
      "",
      "**Fight as One (major):** At 10th level, allies gain a bonus.",
      "",
      "### Cooperation",
      "",
      "‹SOURCE Healer's Handbook/13›",
      "",
      "**Replacement Blessing:** The following minor blessing replaces the communal aid ability of the Community blessing.",
      "",
      "*Team Effort (minor):* At 1st level, you grant a teamwork feat.",
    ],
  },
  // Structurally filtered out — never a catalog entry (see pfDataCatalogEntries).
  cooperation: { redirect: "community" },
};

describe("parseBlessingDeities", () => {
  it("extracts every ‹faith/...› name off the Deities line", () => {
    expect(parseBlessingDeities(AIR_BODY)).toEqual(["Gozreh", "Shelyn"]);
  });

  it("returns undefined for a conditional-rule line with no named deity", () => {
    const lines = [
      "**Deities:** Evil deities that offer the ‹blessing/Air› blessing or nonevil deities with disasters in their portfolios",
      "",
      "**X (minor):** text",
      "",
      "**Y (major):** text",
    ];
    expect(parseBlessingDeities(lines)).toBeUndefined();
  });

  it("returns undefined when the body carries no Deities line at all", () => {
    expect(
      parseBlessingDeities(["**X (minor):** text", "", "**Y (major):** text"]),
    ).toBeUndefined();
  });
});

describe("parseBlessingPowers", () => {
  it("splits the minor/major label from its prose, colon inside the bold markers", () => {
    const { minor, major } = parseBlessingPowers(AIR_BODY);
    expect(minor.name).toBe("Zephyr's Gift");
    expect(minor.description).toBe("<p>At 1st level, you can touch a ranged weapon.</p>");
    expect(major.name).toBe("Soaring Assault");
    expect(major.description).toContain("At 10th level, you can touch an ally");
  });

  it("resolves a ‹spell/...› cross-ref inside a power's own prose", () => {
    const { major } = parseBlessingPowers(AIR_BODY);
    expect(major.description).toContain("as fly");
    expect(major.description).not.toMatch(/[‹›]/);
  });

  it("takes the FIRST minor/major pair, ignoring a later splatbook-variant replacement", () => {
    const { minor, major } = parseBlessingPowers([
      "**Deities:** ‹faith/Erastil›",
      "",
      "**Communal Aid (minor):** At 1st level, you can aid another.",
      "",
      "**Fight as One (major):** At 10th level, allies gain a bonus.",
      "",
      "*Team Effort (minor):* At 1st level, you grant a teamwork feat.",
    ]);
    expect(minor.name).toBe("Communal Aid");
    expect(major.name).toBe("Fight as One");
  });

  it("throws when an entry is missing a minor or major power line", () => {
    expect(() => parseBlessingPowers(["**Deities:** ‹faith/Erastil›"])).toThrow();
  });
});

describe("transformBlessings", () => {
  const blessings = transformBlessings(DICT);
  const byId = Object.fromEntries(blessings.map((b) => [b.id, b]));

  it("drops the 'not_found' sentinel and structurally-filtered redirect entries", () => {
    expect(blessings).toHaveLength(3);
    expect(byId.not_found).toBeUndefined();
    expect(byId.cooperation).toBeUndefined();
  });

  it("maps a real entry's id, uuid, deities, and split powers", () => {
    const air = byId.air!;
    expect(air.id).toBe("air");
    expect(air.uuid).toBe("pfdata:blessing:air");
    expect(air.deities).toEqual(["Gozreh", "Shelyn"]);
    expect(air.minorPower.name).toBe("Zephyr's Gift");
    expect(air.majorPower.name).toBe("Soaring Assault");
  });

  it("leaves deities undefined for a conditional-rule entry", () => {
    expect(byId.tornado!.deities).toBeUndefined();
  });

  it("gives each power a deterministic featureId keyed off the blessing id", () => {
    expect(byId.air!.minorPower.featureId).toBe("blessing-power:air:minor");
    expect(byId.air!.majorPower.featureId).toBe("blessing-power:air:major");
  });
});

describe("blessingClassFeatures", () => {
  it("registers one ClassFeature stub per power, matching each blessing's featureId", () => {
    const blessings = transformBlessings(DICT);
    const features = blessingClassFeatures(blessings);
    expect(features).toHaveLength(blessings.length * 2);

    const air = blessings.find((b) => b.id === "air")!;
    const minorFeature = features.find((f) => f.id === air.minorPower.featureId);
    expect(minorFeature?.name).toBe(air.minorPower.name);
    expect(minorFeature?.description).toBe(air.minorPower.description);
    expect(minorFeature?.changes).toEqual([]);
    expect(minorFeature?.grantsBuffs).toEqual([]);
  });
});
