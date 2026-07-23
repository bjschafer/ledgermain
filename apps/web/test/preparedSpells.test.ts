import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import {
  addClass,
  createEmptyDoc,
  migrateDoc,
  parentDomainTagOf,
  setClericDomains,
  setDruidNatureBondDomain,
  setWizardOppositionSchools,
  setWizardSchool,
  toggleKnownSpell,
} from "../src/model/doc.js";
import {
  classSpellsByLevel,
  clearPrepared,
  domainSpellLevelMap,
  isSchoolSlotEligible,
  oppositionCost,
  prepareDomainSpell,
  prepareSchoolSpell,
  prepareSpell,
  preparedSpells,
  reconcileGrantedCantrips,
  removePreparedAt,
  restPreparedSpells,
  schoolSlotCapacity,
  setExpendedAt,
  unprepareSpell,
} from "../src/model/preparedSpells.js";
import { casterModelFor, spellSlotsByLevel } from "../src/model/spellcasting.js";

const ref = loadRefData();

function fresh(): CharacterDoc {
  return createEmptyDoc("t");
}

describe("preparedSpells transitions", () => {
  it("prepare appends independent instances (same spell twice)", () => {
    let doc = fresh();
    doc = prepareSpell(doc, "fireball");
    doc = prepareSpell(doc, "fireball");
    expect(preparedSpells(doc)).toEqual([
      { spellId: "fireball", expended: false },
      { spellId: "fireball", expended: false },
    ]);
  });

  it("cast expends one instance; rest un-expends without dropping it", () => {
    let doc = fresh();
    doc = prepareSpell(doc, "fireball");
    doc = setExpendedAt(doc, 0, true);
    expect(preparedSpells(doc)[0]!.expended).toBe(true);

    doc = restPreparedSpells(doc);
    expect(preparedSpells(doc)).toEqual([{ spellId: "fireball", expended: false }]);
  });

  it("unprepare removes a non-expended instance before an expended one", () => {
    let doc = fresh();
    doc = prepareSpell(doc, "fireball"); // index 0
    doc = prepareSpell(doc, "fireball"); // index 1
    doc = setExpendedAt(doc, 0, true); // index 0 cast
    doc = unprepareSpell(doc, "fireball");
    // The still-available (index 1) copy is removed; the cast one is kept.
    expect(preparedSpells(doc)).toEqual([{ spellId: "fireball", expended: true }]);
  });

  it("removePreparedAt and clearPrepared drop instances", () => {
    let doc = fresh();
    doc = prepareSpell(doc, "a");
    doc = prepareSpell(doc, "b");
    doc = removePreparedAt(doc, 0);
    expect(preparedSpells(doc)).toEqual([{ spellId: "b", expended: false }]);
    expect(preparedSpells(clearPrepared(doc))).toEqual([]);
  });

  it("transitions are no-ops on out-of-range / unknown targets", () => {
    const doc = prepareSpell(fresh(), "a");
    expect(setExpendedAt(doc, 5, true)).toBe(doc);
    expect(removePreparedAt(doc, -1)).toBe(doc);
    expect(unprepareSpell(doc, "missing")).toBe(doc);
    expect(restPreparedSpells(doc)).toBe(doc); // nothing expended
  });
});

describe("migrateDoc()", () => {
  it("moves a legacy build.spells.prepared doc to live.spells", () => {
    const legacy = {
      ...fresh(),
      build: { ...fresh().build, spells: { known: ["x"], prepared: [] } },
      live: { ...fresh().live, spells: undefined },
    } as unknown as CharacterDoc;
    const migrated = migrateDoc(legacy);
    expect(migrated.live.spells).toEqual({ prepared: [] });
    expect(migrated.build.spells).toEqual({ known: ["x"] });
    expect("prepared" in migrated.build.spells).toBe(false);
  });

  it("is a no-op for an already-current doc", () => {
    const doc = fresh();
    expect(migrateDoc(doc)).toBe(doc);
  });
});

describe("spellSlotsByLevel() — wizard", () => {
  const wizard = casterModelFor("wizard")!;

  it("level-1 wizard with Int +0: 3 cantrips + 1 first-level, no bonus", () => {
    const slots = spellSlotsByLevel(wizard, 1, 0);
    expect(slots).toEqual([
      { level: 0, base: 3, bonus: 0, total: 3 },
      { level: 1, base: 1, bonus: 0, total: 1 },
    ]);
  });

  it("Int +3 grants a bonus first-level slot but never bonus cantrips", () => {
    const slots = spellSlotsByLevel(wizard, 1, 3);
    expect(slots.find((s) => s.level === 0)).toEqual({
      level: 0,
      base: 3,
      bonus: 0,
      total: 3,
    });
    expect(slots.find((s) => s.level === 1)).toEqual({
      level: 1,
      base: 1,
      bonus: 1,
      total: 2,
    });
  });

  it("omits inaccessible spell levels", () => {
    const slots = spellSlotsByLevel(wizard, 1, 5);
    expect(slots.map((s) => s.level)).toEqual([0, 1]);
  });
});

describe("reconcileGrantedCantrips()", () => {
  // Two real wizard cantrip ids and one real level-1 spell from the vendored data.
  const cantripIds = ref.spellLists["wizard"]![0]!;
  const fireballId = ref.spellLists["wizard"]![3]![0]!;
  const c1 = cantripIds[0]!;
  const c2 = cantripIds[1]!;

  function wizardDoc(): CharacterDoc {
    return addClass(fresh(), "wizard");
  }

  it("strips cantrips from build.spells.known but keeps level 1+ spells", () => {
    let doc = wizardDoc();
    doc = {
      ...doc,
      build: {
        ...doc.build,
        spells: { known: [c1, fireballId, c2] },
      },
    };
    const result = reconcileGrantedCantrips(doc, ref);
    expect(result.build.spells.known).toEqual([fireballId]);
  });

  it("dedupes cantrips in live.spells.prepared (keeps first instance)", () => {
    let doc = wizardDoc();
    doc = {
      ...doc,
      build: { ...doc.build, spells: { known: [fireballId] } },
      live: {
        ...doc.live,
        spells: {
          prepared: [
            { spellId: c1, expended: false },
            { spellId: fireballId, expended: true },
            { spellId: c1, expended: false },
            { spellId: c2, expended: false },
            { spellId: c1, expended: true },
          ],
        },
      },
    };
    const result = reconcileGrantedCantrips(doc, ref);
    expect(result.live.spells!.prepared).toEqual([
      { spellId: c1, expended: false },
      { spellId: fireballId, expended: true },
      { spellId: c2, expended: false },
    ]);
  });

  it("is a no-op when no cantrips are stored", () => {
    let doc = wizardDoc();
    doc = {
      ...doc,
      build: { ...doc.build, spells: { known: [fireballId] } },
    };
    expect(reconcileGrantedCantrips(doc, ref)).toBe(doc);
  });

  it("is a no-op for a non-caster (no spell list)", () => {
    const doc = addClass(fresh(), "fighter");
    expect(reconcileGrantedCantrips(doc, ref)).toBe(doc);
  });
});

describe("classSpellsByLevel()", () => {
  it("groups the cleric class list by level, sorted by name within a level", () => {
    const byLevel = classSpellsByLevel(ref, "cleric");
    const l1 = byLevel.get(1);
    expect(l1).toBeDefined();
    expect(l1!.length).toBeGreaterThan(0);
    for (let i = 1; i < l1!.length; i++) {
      expect(l1![i - 1]!.name.localeCompare(l1![i]!.name)).toBeLessThanOrEqual(0);
    }
    // Every id at level 1 really is a level-1 cleric spell per the raw list.
    const rawL1 = new Set(ref.spellLists["cleric"]![1]);
    expect(l1!.every((sp) => rawL1.has(sp.id))).toBe(true);
  });

  it("excludeCantrips drops level 0 entirely", () => {
    const withCantrips = classSpellsByLevel(ref, "cleric");
    expect(withCantrips.has(0)).toBe(true);
    const without = classSpellsByLevel(ref, "cleric", { excludeCantrips: true });
    expect(without.has(0)).toBe(false);
    expect(without.get(1)).toEqual(withCantrips.get(1));
  });

  it("returns an empty map for a tag with no spell list", () => {
    expect(classSpellsByLevel(ref, "fighter").size).toBe(0);
  });
});

describe("domain spell slots (cleric)", () => {
  function clericDoc(): CharacterDoc {
    let doc = addClass(fresh(), "cleric");
    doc = setClericDomains(doc, ["Air"]);
    return doc;
  }

  it("prepareDomainSpell stores an instance with kind: 'domain'", () => {
    const doc = clericDoc();
    const out = prepareDomainSpell(doc, "obscuringMist");
    expect(preparedSpells(out)).toEqual([
      { spellId: "obscuringMist", expended: false, kind: "domain" },
    ]);
  });

  it("prepareSpell stores an instance WITHOUT kind (defaults to 'normal')", () => {
    const doc = clericDoc();
    const out = prepareSpell(doc, "cureLightWounds");
    expect(preparedSpells(out)).toEqual([{ spellId: "cureLightWounds", expended: false }]);
  });

  it("unprepareSpell with kind restricts removal to that slot kind", () => {
    let doc = clericDoc();
    doc = prepareSpell(doc, "cureLightWounds"); // normal
    doc = prepareDomainSpell(doc, "obscuringMist"); // domain
    // unprepare looking only for a domain slot of cureLightWounds — no match.
    doc = unprepareSpell(doc, "cureLightWounds", "domain");
    expect(preparedSpells(doc).length).toBe(2);
    // remove the domain obscuringMist — keeps the normal.
    doc = unprepareSpell(doc, "obscuringMist", "domain");
    expect(preparedSpells(doc)).toEqual([{ spellId: "cureLightWounds", expended: false }]);
  });

  it("unprepareSpell without kind finds any slot", () => {
    let doc = clericDoc();
    doc = prepareDomainSpell(doc, "obscuringMist");
    doc = unprepareSpell(doc, "obscuringMist");
    expect(preparedSpells(doc)).toEqual([]);
  });

  it("domainSpellLevelMap inverts the chosen domains' lists", () => {
    const airIds = ref.domainSpellLists["Air"];
    expect(airIds).toBeDefined();
    const map = domainSpellLevelMap(ref, ["Air"]);
    // Sanity: Air L1 (Obscuring Mist) → level 1 in the map.
    const l1id = airIds![1]![0]!;
    expect(map.get(l1id)).toBe(1);
    // Empty when no tags chosen.
    expect(domainSpellLevelMap(ref, []).size).toBe(0);
    // Unknown tag yields nothing.
    expect(domainSpellLevelMap(ref, ["NotARealDomain"]).size).toBe(0);
  });

  it("domainSpellLevelMap falls back to subdomainSpellLists for a subdomain tag", () => {
    const cloudIds = ref.subdomainSpellLists["Cloud"];
    expect(cloudIds).toBeDefined();
    const map = domainSpellLevelMap(ref, ["Cloud"]);
    const l1id = cloudIds![1]![0]!;
    expect(map.get(l1id)).toBe(1);
    // A domain tag and a subdomain tag both resolve when chosen together.
    const combined = domainSpellLevelMap(ref, ["Fire", "Cloud"]);
    const fireIds = ref.domainSpellLists["Fire"];
    expect(combined.get(fireIds![1]![0]!)).toBe(1);
    expect(combined.get(l1id)).toBe(1);
  });

  it("parentDomainTagOf resolves a subdomain tag to its parent, a domain tag to itself", () => {
    expect(parentDomainTagOf(ref, "Cloud")).toBe("Air");
    expect(parentDomainTagOf(ref, "Fire")).toBe("Fire");
    expect(parentDomainTagOf(ref, "NotARealTag")).toBe("NotARealTag");
  });

  it("setClericDomains stores a subdomain tag directly (swap-in-place)", () => {
    const doc = setClericDomains(fresh(), ["Cloud", "Fire"]);
    expect(doc.build.clericDomains).toEqual(["Cloud", "Fire"]);
  });

  it("setClericDomains caps at two domains and ignores blanks", () => {
    const doc = setClericDomains(fresh(), ["Air", "Fire", "Void", "", " "]);
    expect(doc.build.clericDomains).toEqual(["Air", "Fire"]);
  });

  it("migrateDoc backfills clericDomains for older docs", () => {
    const stale: CharacterDoc = {
      ...createEmptyDoc("t"),
      build: {
        feats: [],
        skillRanks: {},
        classFeatureChoices: [],
        spells: { known: [] },
        gear: [],
      } as unknown as CharacterDoc["build"],
    };
    const out = migrateDoc(stale);
    expect(out.build.clericDomains).toEqual([]);
  });
});

describe("nature-bond domain spell slots (druid)", () => {
  it("druidDomainSpellLists is populated for all 25 vendored druid domains", () => {
    expect(Object.keys(ref.druidDomainSpellLists).length).toBe(25);
    // Wolf's list runs the full 1–9 with resolvable spell ids.
    const wolf = ref.druidDomainSpellLists["Wolf"];
    expect(wolf).toBeDefined();
    for (let lvl = 1; lvl <= 9; lvl++) {
      const id = wolf![lvl]?.[0];
      expect(id).toBeDefined();
      expect(ref.spells[id!]).toBeDefined();
    }
  });

  it("domainSpellLevelMap('druid') inverts the chosen domain's druid list", () => {
    const wolf = ref.druidDomainSpellLists["Wolf"]!;
    const map = domainSpellLevelMap(ref, ["Wolf"], "druid");
    expect(map.get(wolf[1]![0]!)).toBe(1);
    expect(map.get(wolf[9]![0]!)).toBe(9);
    // The default ('cleric') variant reads a different source and finds nothing
    // for a druid-only tag.
    expect(domainSpellLevelMap(ref, ["Wolf"]).size).toBe(0);
  });

  it("resolves the druid list for a name that also collides with a cleric tag", () => {
    // Vermin exists as both a cleric subdomain and a druid domain — the two
    // variants must draw from their own sources.
    const druid = domainSpellLevelMap(ref, ["Vermin"], "druid");
    const cleric = domainSpellLevelMap(ref, ["Vermin"], "cleric");
    expect(druid.size).toBeGreaterThan(0);
    expect(cleric.size).toBeGreaterThan(0);
  });

  it("prepareDomainSpell stores a druid domain pick as kind: 'domain'", () => {
    let doc = addClass(fresh(), "druid");
    doc = setDruidNatureBondDomain(doc, "Wolf");
    const wolfL1 = ref.druidDomainSpellLists["Wolf"]![1]![0]!;
    const out = prepareDomainSpell(doc, wolfL1);
    expect(preparedSpells(out)).toEqual([{ spellId: wolfL1, expended: false, kind: "domain" }]);
  });
});

describe("wizard school slots + opposition cost", () => {
  // Real wizard level-1 spells from the vendored data: Burning Hands (evo),
  // Sleep (enc). Used for the plan's worked example (an Evocation specialist
  // opposing Enchantment).
  function spellIdByName(name: string): string {
    const entry = Object.entries(ref.spells).find(([, s]) => s.name === name);
    if (!entry) throw new Error(`spell not found: ${name}`);
    return entry[0];
  }
  const burningHandsId = spellIdByName("Burning Hands");
  const sleepId = spellIdByName("Sleep");
  const burningHands = ref.spells[burningHandsId]!;
  const sleep = ref.spells[sleepId]!;

  function evocationWizardDoc(): CharacterDoc {
    let doc = addClass(fresh(), "wizard");
    doc = setWizardSchool(doc, "evo");
    doc = setWizardOppositionSchools(doc, ["enc", "nec"]);
    doc = toggleKnownSpell(doc, ref, burningHandsId, "wizard");
    doc = toggleKnownSpell(doc, ref, sleepId, "wizard");
    return doc;
  }

  it("isSchoolSlotEligible is true for an in-school spell in the spellbook, false for others", () => {
    const doc = evocationWizardDoc();
    expect(isSchoolSlotEligible(burningHands, doc, ref)).toBe(true);
    expect(isSchoolSlotEligible(sleep, doc, ref)).toBe(false);
  });

  it("isSchoolSlotEligible is false for an in-school spell NOT in the spellbook", () => {
    // Same evocation specialty, but Burning Hands was never learned — PF1 RAW
    // requires the bonus school slot to be filled from the wizard's spellbook.
    let doc = addClass(fresh(), "wizard");
    doc = setWizardSchool(doc, "evo");
    expect(isSchoolSlotEligible(burningHands, doc, ref)).toBe(false);
  });

  it("isSchoolSlotEligible is always false for a Universalist", () => {
    let doc = setWizardSchool(addClass(fresh(), "wizard"), "uni");
    doc = toggleKnownSpell(doc, ref, burningHandsId, "wizard");
    doc = toggleKnownSpell(doc, ref, sleepId, "wizard");
    expect(isSchoolSlotEligible(burningHands, doc, ref)).toBe(false);
    expect(isSchoolSlotEligible(sleep, doc, ref)).toBe(false);
  });

  it("isSchoolSlotEligible is always false when no school is chosen", () => {
    let doc = addClass(fresh(), "wizard");
    doc = toggleKnownSpell(doc, ref, burningHandsId, "wizard");
    expect(isSchoolSlotEligible(burningHands, doc, ref)).toBe(false);
  });

  it("oppositionCost is 2 for an opposition-school spell, 1 otherwise", () => {
    const doc = evocationWizardDoc();
    expect(oppositionCost(sleep, doc)).toBe(2);
    expect(oppositionCost(burningHands, doc)).toBe(1);
  });

  it("oppositionCost is 1 for everyone when no opposition schools are set", () => {
    const doc = addClass(fresh(), "wizard");
    expect(oppositionCost(sleep, doc)).toBe(1);
    expect(oppositionCost(burningHands, doc)).toBe(1);
  });

  it("schoolSlotCapacity is one per level 1-9, zero for cantrips", () => {
    expect(schoolSlotCapacity(0)).toBe(0);
    expect(schoolSlotCapacity(1)).toBe(1);
    expect(schoolSlotCapacity(9)).toBe(1);
    expect(schoolSlotCapacity(10)).toBe(0);
  });

  it("prepareSchoolSpell stores an instance with kind: 'school'", () => {
    const doc = evocationWizardDoc();
    const out = prepareSchoolSpell(doc, burningHandsId);
    expect(preparedSpells(out)).toEqual([
      { spellId: burningHandsId, expended: false, kind: "school" },
    ]);
  });

  it("unprepareSpell with kind: 'school' restricts removal to school slots", () => {
    let doc = evocationWizardDoc();
    doc = prepareSpell(doc, burningHandsId); // normal
    doc = prepareSchoolSpell(doc, burningHandsId); // school
    doc = unprepareSpell(doc, burningHandsId, "school");
    expect(preparedSpells(doc)).toEqual([{ spellId: burningHandsId, expended: false }]);
  });
});
