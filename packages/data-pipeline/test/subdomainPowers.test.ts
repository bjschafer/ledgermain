import { describe, expect, it } from "bun:test";

import type { ClassFeature, Domain, Subdomain } from "@pf1/schema";

import {
  applySubdomainPowerSupplements,
  normalizePowerName,
  parseSubdomainPowerSets,
} from "../src/transform/subdomainPowers.js";
import type { PfDataDictionary } from "../src/util/pfdata.js";

/**
 * Unit coverage for the subdomain granted-power import, on hand-built input
 * shaped like the real Pf Data 1e domain files. `refdata.test.ts` covers the
 * result against the real vendored slice.
 */

const TRICKERY: PfDataDictionary = {
  trickery: {
    name: "Trickery",
    description: [
      "## Trickery",
      "",
      "‹SOURCE PRPG Core Rulebook/48›",
      "",
      '::ab[Copycat (Sp)]{id=cat icon=magic standard="You can create an illusory double of yourself." useMod=Wis3}',
      "",
      '::ab[Master\'s Illusion (Sp)]{id=ill l=8 icon=protect standard="You can create an illusion that hides your allies." useNC}',
      "",
      "::h3[Deception Subdomain]{jl}",
      "",
      "‹SOURCE Advanced Player's Guide/89›",
      "",
      '::ab[Sudden Shift (Sp)]{replace="The ‹‹copycat/#cat›› power of the Trickery domain" icon=power immediate="You can teleport up to 10 feet." useMod=Wis3}',
      "",
      '::spelllist[Replacement Domain Spells]{from=domain l2="mirror image"}',
      "",
      "::h3[Variant Domain Powers]{jl}",
      "",
      '::ab[Some GM Option]{ability="Not a subdomain."}',
    ],
  },
};

const TRICKERY_TAGS = new Set(["Trickery"]);

describe("parseSubdomainPowerSets", () => {
  it("reads a subdomain's replacement power, its level, ability type, prose, and displaced target", () => {
    const [set, ...rest] = parseSubdomainPowerSets([TRICKERY], TRICKERY_TAGS);
    // The parent domain's own powers and the "Variant Domain Powers" block
    // are not subdomain sections.
    expect(rest).toEqual([]);
    expect(set!.subdomainKey).toBe("deception");
    expect(set!.parentDomainTag).toBe("Trickery");
    // The section's own citation, not the parent domain's CRB one.
    expect(set!.sources).toEqual([{ id: "advanced-player-s-guide", pages: "89" }]);
    expect(set!.powers).toEqual([
      {
        name: "Sudden Shift",
        abilityType: "sp",
        level: 0,
        description: "<p>You can teleport up to 10 feet.</p>",
        replaces: "copycat",
      },
    ]);
  });

  it("skips a domain entry that isn't in the vendored slice", () => {
    expect(parseSubdomainPowerSets([TRICKERY], new Set(["Fire"]))).toEqual([]);
  });

  it("keeps a stated level gate as-is", () => {
    const dict: PfDataDictionary = {
      d: {
        name: "Trickery",
        description: [
          "::h3[Thievery Subdomain]{jl}",
          "",
          '::ab[Thief of the Gods (Su)]{replace="The ‹‹master\'s illusion/#ill›› power of the Trickery domain" l=8 free="You gain a bonus on Sleight of Hand checks."}',
        ],
      },
    };
    const [set] = parseSubdomainPowerSets([dict], TRICKERY_TAGS);
    expect(set!.powers[0]!.level).toBe(8);
    expect(set!.powers[0]!.replaces).toBe("master's illusion");
  });
});

describe("normalizePowerName", () => {
  it("folds the disambiguators and ability-type markers the two sources disagree on", () => {
    expect(normalizePowerName("Agile Feet (Domain Power)")).toBe("agile feet");
    expect(normalizePowerName("Copycat (Sp)")).toBe("copycat");
    expect(normalizePowerName("Master’s Illusion")).toBe("master's illusion");
  });
});

function domain(tag: string, overrides: Partial<Domain> = {}): Domain {
  return {
    id: `domain-${tag}`,
    name: `${tag} Domain`,
    uuid: `Compendium.pf1.class-abilities.Item.domain-${tag}`,
    tag,
    features: [
      { level: 0, uuid: "u:copycat", featureId: "copycat", name: "Copycat", resolved: true },
      {
        level: 8,
        uuid: "u:illusion",
        featureId: "illusion",
        name: "Master's Illusion",
        resolved: true,
      },
    ],
    changes: [],
    ...overrides,
  };
}

function subdomain(name: string, tag: string, parents: string[]): Subdomain {
  return {
    id: `sub-${tag}`,
    name,
    uuid: `Compendium.pf1.class-abilities.Item.sub-${tag}`,
    tag,
    parentDomainTags: parents,
    features: [],
    changes: [],
  };
}

describe("applySubdomainPowerSupplements", () => {
  it("swaps the displaced power out, keeps the rest, and synthesizes a class feature", () => {
    const subs = [subdomain("Deception Subdomain", "Deception", ["Trickery"])];
    const features: ClassFeature[] = [];
    const result = applySubdomainPowerSupplements(
      subs,
      [domain("Trickery")],
      parseSubdomainPowerSets([TRICKERY], TRICKERY_TAGS),
      features,
    );

    expect(result).toEqual({ supplemented: 1, vendored: 0, unmatched: [] });
    expect(subs[0]!.features.map((f) => f.name)).toEqual(["Sudden Shift", "Master's Illusion"]);
    expect(features).toHaveLength(1);
    expect(features[0]!.id).toBe("subdomain-power:deception:sudden-shift");
    expect(features[0]!.abilityType).toBe("sp");
    expect(subs[0]!.features[0]!.featureId).toBe(features[0]!.id);
    expect(subs[0]!.features[0]!.resolved).toBe(true);
  });

  it("leaves a subdomain the Foundry pack already resolved exactly as it was", () => {
    const vendored = subdomain("Deception Subdomain", "Deception", ["Trickery"]);
    vendored.features = [
      { level: 0, uuid: "u:vendored", featureId: "vendored", name: "Vendored", resolved: true },
    ];
    const features: ClassFeature[] = [];
    const result = applySubdomainPowerSupplements(
      [vendored],
      [domain("Trickery")],
      parseSubdomainPowerSets([TRICKERY], TRICKERY_TAGS),
      features,
    );

    expect(result.vendored).toBe(1);
    expect(vendored.features.map((f) => f.name)).toEqual(["Vendored"]);
    expect(features).toEqual([]);
  });

  it("reports a subdomain no section could be matched to instead of guessing", () => {
    const subs = [subdomain("Nonesuch Subdomain", "Nonesuch", ["Trickery"])];
    const result = applySubdomainPowerSupplements(
      subs,
      [domain("Trickery")],
      parseSubdomainPowerSets([TRICKERY], TRICKERY_TAGS),
      [],
    );
    expect(result.unmatched).toEqual(["Nonesuch Subdomain"]);
    expect(subs[0]!.features).toEqual([]);
  });

  it("inherits the parent's direct bonus, and drops it when the subdomain replaces it", () => {
    const speed = [{ formula: "10", target: "landSpeed", type: "base" }];
    const travel = (dict: PfDataDictionary, tag: string) => {
      const subs = [subdomain(`${tag} Subdomain`, tag, ["Travel"])];
      applySubdomainPowerSupplements(
        subs,
        [domain("Travel", { changes: speed })],
        parseSubdomainPowerSets([dict], new Set(["Travel"])),
        [],
      );
      return subs[0]!.changes;
    };

    const keeps: PfDataDictionary = {
      d: {
        name: "Travel",
        description: [
          "::h3[Exploration Subdomain]{jl}",
          "",
          '::ab[Door Sight (Su)]{replace="The ‹‹copycat/#cat›› power of the Travel domain" ability="You see through surfaces."}',
        ],
      },
    };
    const replaces: PfDataDictionary = {
      d: {
        name: "Travel",
        description: [
          "::h3[Portal Subdomain]{jl}",
          "",
          '::ab[Sacred Threshold (Su)]{replace="The ‹‹base speed increase/#speed›› power of the Travel domain" standard="You bless a portal."}',
        ],
      },
    };
    expect(travel(keeps, "Exploration")).toEqual(speed);
    expect(travel(replaces, "Portal")).toEqual([]);
  });

  it("does not stack an inherited bonus onto a subdomain that states its own", () => {
    const subs = [subdomain("Deception Subdomain", "Deception", ["Trickery"])];
    subs[0]!.changes = [{ formula: "1", target: "allSavingThrows", type: "resist" }];
    const result = applySubdomainPowerSupplements(
      subs,
      [
        domain("Trickery", {
          changes: [{ formula: "9", target: "allSavingThrows", type: "resist" }],
        }),
      ],
      parseSubdomainPowerSets([TRICKERY], TRICKERY_TAGS),
      [],
    );
    expect(result.supplemented).toBe(1);
    expect(subs[0]!.changes).toEqual([{ formula: "1", target: "allSavingThrows", type: "resist" }]);
  });
});
