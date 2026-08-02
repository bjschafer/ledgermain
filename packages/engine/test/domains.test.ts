import { describe, expect, it } from "bun:test";

import type { CharacterDoc } from "@pf1/schema";
import { loadRefData } from "@pf1/data-pipeline";

import { compute, deriveResourcePools, resolveClassFeatures } from "../src/index.js";
import type { AbilityView } from "../src/rolldata.js";

const ref = loadRefData();

function raceId(name: string): string {
  const entry = Object.entries(ref.races).find(([, r]) => r.name === name);
  if (!entry) throw new Error(`race not found: ${name}`);
  return entry[0];
}

function makeCleric(level: number, clericDomains: string[]): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "cleric", level }],
    },
    abilities: { str: 10, dex: 10, con: 12, int: 10, wis: 16, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      clericDomains,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

function domainFeatureNames(doc: CharacterDoc): string[] {
  const { classFeatures } = resolveClassFeatures(doc, ref);
  return classFeatures
    .filter((f) => f.origin?.kind === "domain")
    .map((f) => f.name)
    .sort();
}

function makeDruid(level: number, druidNatureBondDomain?: string): CharacterDoc {
  return {
    schemaVersion: 1,
    id: "test",
    ownerId: "owner",
    version: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    identity: {
      name: "Test",
      race: raceId("Human"),
      classes: [{ tag: "druid", level }],
    },
    abilities: { str: 10, dex: 10, con: 12, int: 10, wis: 16, cha: 10 },
    build: {
      feats: [],
      skillRanks: {},
      classFeatureChoices: [],
      spells: { known: [] },
      gear: [],
      druidNatureBondDomain,
    },
    live: {
      hp: { current: 0, temp: 0, nonlethal: 0 },
      conditions: [],
      activeBuffs: [],
      resources: {},
    },
  } as CharacterDoc;
}

describe("cleric domain powers", () => {
  it("a level-1 cleric with Fire domain gets Fire Bolt, not Fire Resistance (level 6)", () => {
    const doc = makeCleric(1, ["Fire"]);
    expect(domainFeatureNames(doc)).toEqual(["Fire Bolt"]);

    const { classFeatures } = resolveClassFeatures(doc, ref);
    const fireBolt = classFeatures.find((f) => f.name === "Fire Bolt")!;
    expect(fireBolt.origin).toEqual({ kind: "domain", label: "Fire Domain" });
    expect(fireBolt.classTag).toBe("cleric");
  });

  it("a level-6 cleric with Fire domain gets both Fire Bolt and Fire Resistance", () => {
    const doc = makeCleric(6, ["Fire"]);
    expect(domainFeatureNames(doc)).toEqual(["Fire Bolt", "Fire Resistance"]);
  });

  it("no chosen domain grants no domain-origin features", () => {
    const doc = makeCleric(6, []);
    expect(domainFeatureNames(doc)).toEqual([]);
  });

  it("an unresolvable domain tag grants nothing, not an error", () => {
    const doc = makeCleric(6, ["NotARealDomain"]);
    expect(domainFeatureNames(doc)).toEqual([]);
  });

  it("Fire Bolt surfaces as a resource pool with max = 3 + Wis mod", () => {
    const doc = makeCleric(1, ["Fire"]);
    const abilities: Record<string, AbilityView> = {
      wis: { base: 16, total: 16, mod: 3 },
    };
    const pools = deriveResourcePools(doc, ref, abilities);
    const fireBolt = pools.find((p) => p.name === "Fire Bolt");
    expect(fireBolt).toBeDefined();
    expect(fireBolt!.max).toBe(6);
    expect(fireBolt!.per).toBe("day");
    expect(fireBolt!.classTag).toBe("cleric");
  });
});

describe("cleric subdomain selection (in place of a parent domain)", () => {
  it("Ash (Fire's subdomain) swaps Fire Resistance for Wall of Ashes and keeps Fire Bolt", () => {
    // APG p. 88: Wall of Ashes replaces the fire resistance power; the
    // domain's 1st-level Fire Bolt is untouched. The replacement comes online
    // at 8th where the power it displaces sat at 6th, so a 6th-level Ash
    // cleric has neither.
    const withAsh = makeCleric(8, ["Ash"]);
    expect(domainFeatureNames(withAsh)).toEqual(["Fire Bolt", "Wall of Ashes"]);
    expect(domainFeatureNames(makeCleric(6, ["Ash"]))).toEqual(["Fire Bolt"]);
    expect(domainFeatureNames(makeCleric(6, ["Fire"]))).toEqual(["Fire Bolt", "Fire Resistance"]);

    const { classFeatures } = resolveClassFeatures(withAsh, ref);
    const fireBolt = classFeatures.find((f) => f.name === "Fire Bolt")!;
    // Label names the subdomain actually chosen, not its parent.
    expect(fireBolt.origin).toEqual({ kind: "domain", label: "Ash Subdomain" });
  });

  it("Deception (Trickery's subdomain) grants Sudden Shift in place of Copycat", () => {
    // APG p. 89. The reported symptom was the reverse: Copycat showing up on
    // a Deception cleric's sheet, and Sudden Shift nowhere at all.
    const doc = makeCleric(8, ["Deception"]);
    expect(domainFeatureNames(doc)).toEqual(["Master's Illusion", "Sudden Shift"]);

    const { classFeatures } = resolveClassFeatures(doc, ref);
    const suddenShift = classFeatures.find((f) => f.name === "Sudden Shift")!;
    expect(suddenShift.origin).toEqual({ kind: "domain", label: "Deception Subdomain" });
    expect(suddenShift.classTag).toBe("cleric");
  });

  it("an imported subdomain power meters its daily uses like a vendored one", () => {
    // The imported powers carry their cap as source metadata that never
    // reaches the prose, so each of these reads as unlimited if it isn't
    // folded back in, and shows up nowhere in the tracker's resource list.
    const abilities: Record<string, AbilityView> = { wis: { base: 16, total: 16, mod: 3 } };
    const pools = deriveResourcePools(makeCleric(8, ["Deception", "Catastrophe"]), ref, abilities);
    const pool = (name: string) => pools.find((p) => p.name === name);

    // Sudden Shift: 3 + Wis modifier per day (APG p. 89).
    expect(pool("Sudden Shift")!.max).toBe(6);
    expect(pool("Sudden Shift")!.per).toBe("day");
    // Deadly Weather: rounds per day equal to cleric level (APG p. 105).
    expect(pool("Deadly Weather")!.max).toBe(8);
  });

  it("a subdomain power that scales past its gate level steps with cleric level", () => {
    // Blood's Wounding Blade: once per day at 8th, plus one more for every
    // four cleric levels beyond 8th (APG p. 87).
    const abilities: Record<string, AbilityView> = { wis: { base: 10, total: 10, mod: 0 } };
    const maxAt = (level: number) =>
      deriveResourcePools(makeCleric(level, ["Blood"]), ref, abilities).find(
        (p) => p.name === "Wounding Blade",
      )?.max;
    expect(maxAt(8)).toBe(1);
    expect(maxAt(11)).toBe(1);
    expect(maxAt(12)).toBe(2);
    expect(maxAt(20)).toBe(4);
  });

  it("a passive subdomain power gets no pool", () => {
    // Self-Realization's Perfected Form is an always-on bonus (APG p. 92),
    // not a metered power — nothing for the tracker to count down.
    const abilities: Record<string, AbilityView> = { wis: { base: 10, total: 10, mod: 0 } };
    const pools = deriveResourcePools(makeCleric(8, ["Self-Realization"]), ref, abilities);
    expect(pools.find((p) => p.name === "Perfected Form")).toBeUndefined();
  });

  it("a subdomain replacement power is level-gated like any other grant", () => {
    // Thievery's Thief of the Gods replaces Master's Illusion, so it inherits
    // that power's 8th-level gate; Copycat is the one Thievery keeps.
    expect(domainFeatureNames(makeCleric(7, ["Thievery"]))).toEqual(["Copycat"]);
    expect(domainFeatureNames(makeCleric(8, ["Thievery"]))).toEqual([
      "Copycat",
      "Thief of the Gods",
    ]);
  });

  it("Cloud (Air's subdomain, structured override) replaces Air's 2nd power with Thundercloud at level 8, keeps Lightning Arc", () => {
    const withCloud = makeCleric(8, ["Cloud"]);
    expect(domainFeatureNames(withCloud)).toEqual(["Lightning Arc", "Thundercloud"]);

    // Air itself grants Electricity Resistance at level 6, not Thundercloud —
    // confirms the subdomain's own `features` fully replaces Air's, not merges.
    const withAir = makeCleric(8, ["Air"]);
    expect(domainFeatureNames(withAir)).toEqual(["Electricity Resistance", "Lightning Arc"]);
  });

  it("Cloud's 8th-level Thundercloud is gated by cleric level like any other grant", () => {
    const doc = makeCleric(6, ["Cloud"]);
    expect(domainFeatureNames(doc)).toEqual(["Lightning Arc"]);
  });
});

describe("Destruction domain's hand-authored 8th-level power", () => {
  // CRB p. 43: Destruction grants Destructive Smite (1st) and Destructive
  // Aura (8th). The Foundry pack has no document for Destructive Aura at
  // all, so it's hand-authored in data-pipeline `supplements.ts` — before
  // that fix, a Destruction cleric never saw their 8th-level power.
  it("a level-1 Destruction cleric gets Destructive Smite only", () => {
    expect(domainFeatureNames(makeCleric(1, ["Destruction"]))).toEqual(["Destructive Smite"]);
  });

  it("a level-8 Destruction cleric gets both Destructive Smite and Destructive Aura", () => {
    expect(domainFeatureNames(makeCleric(8, ["Destruction"]))).toEqual([
      "Destructive Aura",
      "Destructive Smite",
    ]);
  });

  it("Catastrophe/Hatred/Rage subdomains displace Destructive Aura, not Destructive Smite", () => {
    // APG p. 87 (Catastrophe), Champions of Corruption p. 19 (Hatred), APG
    // p. 95 (Rage) each name Destructive Aura as the power their own 8th-level
    // ability replaces; Destructive Smite is untouched.
    expect(domainFeatureNames(makeCleric(8, ["Catastrophe"]))).toEqual([
      "Deadly Weather",
      "Destructive Smite",
    ]);
    expect(domainFeatureNames(makeCleric(8, ["Hatred"]))).toEqual([
      "Destructive Smite",
      "Hateful Aura",
    ]);
    expect(domainFeatureNames(makeCleric(8, ["Rage"]))).toEqual(["Destructive Smite", "Rage"]);
  });

  it("Torture subdomain replaces Destructive Smite instead, keeping Destructive Aura", () => {
    // Book of the Damned p. 182: Painful Smite replaces "the destructive
    // smite power of the Destruction domain" — the opposite of the other
    // three Destruction subdomains.
    expect(domainFeatureNames(makeCleric(8, ["Torture"]))).toEqual([
      "Destructive Aura",
      "Painful Smite",
    ]);
  });
});

describe("Glory domain's hand-authored granted-powers preamble", () => {
  // CRB p. 44: Glory's preamble grants +2 to the DC of channeled positive
  // energy used to harm undead, in addition to its two named powers (Touch
  // of Glory, Divine Presence). The Foundry pack has no document for this
  // bonus either (unlike Travel's speed or Darkness/Rune's bonus feat, it
  // carries no `Domain.changes` entry), so it's hand-authored prose-only:
  // Channel Energy's save DC is a single vendored `dcFormula` this engine
  // evaluates directly with no per-source-modifier target, so there is no
  // real number to wire it onto.
  it("a level-1 Glory cleric gets Touch of Glory and the Channel Boost preamble", () => {
    expect(domainFeatureNames(makeCleric(1, ["Glory"]))).toEqual([
      "Channel Boost",
      "Touch of Glory",
    ]);
  });

  it("a level-8 Glory cleric also gets Divine Presence", () => {
    expect(domainFeatureNames(makeCleric(8, ["Glory"]))).toEqual([
      "Channel Boost",
      "Divine Presence",
      "Touch of Glory",
    ]);
  });

  it("Hubris/Legend subdomains displace Channel Boost; Chivalry keeps it", () => {
    // Divine Anthology p. 23: Hubris's Class Skill and Legend's Bonus Feat
    // each name "the channel boost ability of the Glory domain" as what they
    // replace. Heroes of the High Court p. 21: Chivalry replaces Touch of
    // Glory instead, so it keeps Channel Boost.
    expect(domainFeatureNames(makeCleric(1, ["Hubris"]))).toEqual([
      "Class Skill",
      "Touch of Glory",
    ]);
    expect(domainFeatureNames(makeCleric(1, ["Legend"]))).toEqual(["Bonus Feat", "Touch of Glory"]);
    expect(domainFeatureNames(makeCleric(1, ["Chivalry"]))).toEqual([
      "Bolstering Touch",
      "Channel Boost",
    ]);
  });
});

describe("cleric domain / subdomain direct changes (issue #99)", () => {
  const saveTotals = (doc: CharacterDoc) => {
    const sheet = compute(doc, ref);
    return {
      fort: sheet.saves.fort.total,
      ref: sheet.saves.ref.total,
      will: sheet.saves.will.total,
    };
  };

  it("Protection domain grants a +1 resistance bonus to all saves at level 1", () => {
    const withProtection = saveTotals(makeCleric(1, ["Protection"]));
    const withoutDomain = saveTotals(makeCleric(1, []));
    expect(withProtection.fort - withoutDomain.fort).toBe(1);
    expect(withProtection.ref - withoutDomain.ref).toBe(1);
    expect(withProtection.will - withoutDomain.will).toBe(1);
  });

  it("Protection's save bonus scales to +2 at level 5 and +3 at level 10 (1 + floor(level/5))", () => {
    const l5 = saveTotals(makeCleric(5, ["Protection"]));
    const l5None = saveTotals(makeCleric(5, []));
    expect(l5.will - l5None.will).toBe(2);

    const l10 = saveTotals(makeCleric(10, ["Protection"]));
    const l10None = saveTotals(makeCleric(10, []));
    expect(l10.will - l10None.will).toBe(3);
  });

  it("Purity subdomain (Protection's subdomain) grants the same save resistance", () => {
    const withPurity = saveTotals(makeCleric(5, ["Purity"]));
    const withoutDomain = saveTotals(makeCleric(5, []));
    expect(withPurity.fort - withoutDomain.fort).toBe(2);
    expect(withPurity.ref - withoutDomain.ref).toBe(2);
    expect(withPurity.will - withoutDomain.will).toBe(2);
  });

  it("Travel domain grants +10 base land speed", () => {
    const withTravel = compute(makeCleric(1, ["Travel"]), ref);
    const withoutDomain = compute(makeCleric(1, []), ref);
    expect((withTravel.speeds.land ?? 0) - (withoutDomain.speeds.land ?? 0)).toBe(10);
  });

  it("a subdomain inherits its parent's speed bonus unless it replaces it", () => {
    const land = (doc: CharacterDoc) => compute(doc, ref).speeds.land ?? 0;
    const base = land(makeCleric(1, []));
    // Exploration swaps agile feet only; the +10 ft is part of Travel's
    // granted-powers preamble and stays. Portal's Sacred Threshold replaces
    // the speed increase itself.
    expect(land(makeCleric(1, ["Exploration"])) - base).toBe(10);
    expect(land(makeCleric(1, ["Portal"])) - base).toBe(0);
  });

  it("a domain change is inert without cleric levels (stale tag on a non-cleric)", () => {
    // Same doc shape but the class isn't cleric — the gate must skip it.
    const wizardWithStaleDomain: CharacterDoc = {
      ...makeCleric(5, ["Protection"]),
      identity: {
        name: "Test",
        race: raceId("Human"),
        classes: [{ tag: "wizard", level: 5 }],
      },
    };
    const wizardNoDomain: CharacterDoc = {
      ...wizardWithStaleDomain,
      build: { ...wizardWithStaleDomain.build, clericDomains: [] },
    };
    expect(saveTotals(wizardWithStaleDomain)).toEqual(saveTotals(wizardNoDomain));
  });

  it("a domain with no direct changes (Fire) contributes no save/speed modifier", () => {
    const withFire = saveTotals(makeCleric(5, ["Fire"]));
    const withoutDomain = saveTotals(makeCleric(5, []));
    expect(withFire).toEqual(withoutDomain);
  });
});

describe("inquisitor domains (granted powers only, no bonus spell slots)", () => {
  function makeInquisitor(level: number, clericDomains: string[]): CharacterDoc {
    const doc = makeCleric(level, clericDomains);
    return { ...doc, identity: { ...doc.identity, classes: [{ tag: "inquisitor", level }] } };
  }

  it("grants a domain's powers off the inquisitor level", () => {
    // Balras: Inquisitor 7 with the Magic domain, whose 1st-level granted
    // power is Hand of the Acolyte.
    const { classFeatures } = resolveClassFeatures(makeInquisitor(7, ["Magic"]), ref);
    const domainFeatures = classFeatures.filter((f) => f.origin?.kind === "domain");

    expect(domainFeatures.length).toBeGreaterThan(0);
    expect(domainFeatures.map((f) => f.name)).toContain("Hand of the Acolyte (Domain Power)");
    // Attributed to the class that actually granted it, not a phantom cleric.
    expect(domainFeatures.every((f) => f.classTag === "inquisitor")).toBe(true);
  });

  it("gates a domain power the inquisitor's level hasn't reached", () => {
    // Magic's second granted power (Dispelling Touch) comes at 8th.
    const at7 = domainFeatureNames(makeInquisitor(7, ["Magic"]));
    const at8 = domainFeatureNames(makeInquisitor(8, ["Magic"]));

    expect(at8.length).toBeGreaterThan(at7.length);
  });

  it("grants nothing to a class with no domain access", () => {
    const doc = makeCleric(7, ["Magic"]);
    const fighter = {
      ...doc,
      identity: { ...doc.identity, classes: [{ tag: "fighter", level: 7 }] },
    };
    expect(domainFeatureNames(fighter)).toEqual([]);
  });
});

describe("druid nature-bond domain powers (issue #117)", () => {
  it("a level-1 Wolf druid has no domain-origin class feature yet (Pack Tactics is 8th-level)", () => {
    expect(domainFeatureNames(makeDruid(1, "Wolf"))).toEqual([]);
  });

  it("an 8th-level Wolf druid gets Pack Tactics, and never Improved Trip as a class feature", () => {
    // Ultimate Magic p.36 (PZO1117, per the domain's own vendored `sources`):
    // Wolf's 1st-level power grants Improved Trip as a
    // bonus feat (a fixed feat grant, not prose) and its 8th-level power is
    // Pack Tactics. The bonus feat surfaces via the web layer's
    // `grantedFeats()` (apps/web/src/model/feats.ts's `DruidDomain.changes`
    // path) — it must never also appear here as a classFeatures entry, or a
    // Wolf druid would show it twice.
    const doc = makeDruid(8, "Wolf");
    expect(domainFeatureNames(doc)).toEqual(["Pack Tactics"]);

    const { classFeatures } = resolveClassFeatures(doc, ref);
    const packTactics = classFeatures.find((f) => f.name === "Pack Tactics")!;
    expect(packTactics.origin).toEqual({ kind: "domain", label: "Wolf Domain" });
    expect(packTactics.classTag).toBe("druid");
    expect(classFeatures.some((f) => f.name === "Improved Trip")).toBe(false);
  });

  it("a level-1 Jungle druid gets Brachiation; Trap Sense is gated to 3rd level", () => {
    // Ultimate Magic p.34 (PZO1117, per the domain's own vendored `sources`):
    // Jungle's 1st-level power is Brachiation, its
    // 3rd-level power Trap Sense.
    expect(domainFeatureNames(makeDruid(1, "Jungle"))).toEqual(["Brachiation"]);
    expect(domainFeatureNames(makeDruid(2, "Jungle"))).toEqual(["Brachiation"]);
    expect(domainFeatureNames(makeDruid(3, "Jungle"))).toEqual(["Brachiation", "Trap Sense"]);
  });

  it("no chosen domain grants no domain-origin features", () => {
    expect(domainFeatureNames(makeDruid(8, undefined))).toEqual([]);
  });

  it("an unresolvable domain tag grants nothing, not an error", () => {
    expect(domainFeatureNames(makeDruid(8, "NotARealDruidDomain"))).toEqual([]);
  });

  it("a stale domain tag on a non-druid grants nothing", () => {
    const doc = makeDruid(8, "Wolf");
    const fighter = {
      ...doc,
      identity: { ...doc.identity, classes: [{ tag: "fighter", level: 8 }] },
    };
    expect(domainFeatureNames(fighter)).toEqual([]);
  });
});
