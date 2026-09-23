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
  "@HL[Deities:] ‹faith/Gozreh›, ‹faith/Shelyn›",
  "",
  '::ab[Zephyr\'s Gift (minor)]{icon=boost-def flavor="You can touch any one ranged weapon." l1="For 1 minute, attacks with it take no range penalties."}',
  "",
  '::ab[Soaring Assault (major)]{icon=power-boost flavor="You can touch an ally and give her the gift of flight (as ‹spell/fly›)." l10="The ally gains a fly speed of 60 feet."}',
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
      "@HL[Deities:] Evil deities that offer the ‹blessing/Air› blessing or nonevil deities with disasters in their portfolios",
      "",
      '::ab[Dust Devil (minor)]{icon=lower l1="The target is ‹misc/dazzled› for 1 minute."}',
      "",
      '::ab[Howling Gale (major)]{icon=aura l10="You invoke a howling windstorm around yourself."}',
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
      "@HL[Deities:] ‹faith/Erastil›",
      "",
      '::ab[Communal Aid (minor)]{icon=boost l1="The aid another bonus increases to +4."}',
      "",
      '::ab[Fight as One (major)]{icon=boost l10="Allies gain a +2 insight bonus on attacks."}',
      "",
      "### Cooperation",
      "",
      "‹SOURCE Healer's Handbook/13›",
      "",
      "@HL[ReplacementBlessing:] The following minor blessing replaces the *communal aid* ability of the Community blessing.",
      "",
      '::ab[Team Effort (minor)]{icon=power l1="The touched ally gains the benefit of the chosen teamwork feat."}',
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
      "@HL[Deities:] Evil deities that offer the ‹blessing/Air› blessing or nonevil deities with disasters in their portfolios",
      "",
      '::ab[X (minor)]{l1="text"}',
      "",
      '::ab[Y (major)]{l10="text"}',
    ];
    expect(parseBlessingDeities(lines)).toBeUndefined();
  });

  it("returns undefined when the body carries no Deities line at all", () => {
    expect(
      parseBlessingDeities(['::ab[X (minor)]{l1="text"}', "", '::ab[Y (major)]{l10="text"}']),
    ).toBeUndefined();
  });
});

describe("parseBlessingPowers", () => {
  it("splits the minor/major tier off the directive's label, keeping its prose", () => {
    const { minor, major } = parseBlessingPowers(AIR_BODY);
    expect(minor.name).toBe("Zephyr's Gift");
    expect(minor.description).toBe(
      "<p>You can touch any one ranged weapon. At 1st level: For 1 minute, attacks with it take no range penalties.</p>",
    );
    expect(major.name).toBe("Soaring Assault");
    expect(major.description).toContain("At 10th level: The ally gains a fly speed");
  });

  it("reads a fenced power's prose, led by the fence's action label", () => {
    const { major } = parseBlessingPowers([
      '::ab[Scaly Touch (minor)]{icon=def l1="You grant an ally reptilian scales."}',
      "",
      ':::ab{title="Serpent Fang (major)" icon=melee action="At 10th Level"}',
      "",
      "As a @HLstandard_action you can manifest venomous fangs for 1 minute.",
      "",
      ":::",
    ]);
    expect(major.name).toBe("Serpent Fang");
    expect(major.description).toBe(
      "<p><strong>At 10th level:</strong> As a standard action you can manifest venomous fangs for 1 minute.</p>",
    );
  });

  it("resolves a ‹spell/...› cross-ref inside a power's own prose", () => {
    const { major } = parseBlessingPowers(AIR_BODY);
    expect(major.description).toContain("(as fly)");
    expect(major.description).not.toMatch(/[‹›]/);
  });

  it("takes the FIRST minor/major pair, ignoring a later splatbook-variant replacement", () => {
    const { minor, major } = parseBlessingPowers([
      "@HL[Deities:] ‹faith/Erastil›",
      "",
      '::ab[Communal Aid (minor)]{l1="The aid another bonus increases to +4."}',
      "",
      '::ab[Fight as One (major)]{l10="Allies gain a +2 insight bonus on attacks."}',
      "",
      '::ab[Team Effort (minor)]{l1="The touched ally gains a teamwork feat."}',
    ]);
    expect(minor.name).toBe("Communal Aid");
    expect(major.name).toBe("Fight as One");
  });

  it("throws when an entry is missing a minor or major power line", () => {
    expect(() => parseBlessingPowers(["@HL[Deities:] ‹faith/Erastil›"])).toThrow();
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
