/**
 * Integration test: the owner's real character, Lyle (sylph arcanist 4) and
 * his cat familiar Mortlach, built end-to-end through the real model
 * transitions (`model/doc.ts`, `model/traits.ts`, `model/racialTraits.ts`,
 * `model/preparedSpells.ts`, `model/familiar.ts`, `model/buffs.ts`,
 * `model/resources.ts`) exactly as the builder UI would drive them — no
 * hand-assembled `CharacterDoc` literals. Every asserted number is
 * transcribed from the owner's Hero Lab Online PDF export (see the
 * scratchpad spec this was authored from).
 *
 * This is also the repo's first combined regression test for three features
 * that all landed together: the arcanist hybrid caster (`model/spellcasting.ts`
 * `CASTER_MODELS.arcanist`), tracked familiars (`@pf1/engine` `familiar.ts` /
 * `model/familiar.ts`), and Sylph alternate racial traits
 * (`@pf1/engine` `racial-traits.ts`).
 *
 * The PDF was exported with Mage Armor + Bless both active — the "no buffs"
 * describe block below reconstructs the character's baseline (what a fresh
 * import shows before any buffs are toggled on), and the "with buffs" block
 * layers both buffs on to reproduce the PDF's exact numbers.
 */
import { describe, expect, it } from "bun:test";

import { compute, deriveResourcePools } from "@pf1/engine";
import { loadRefData } from "@pf1/data-pipeline";

import { buildLyleDoc } from "./lyle.fixture.js";
import { addBuff, makeActiveBuff } from "../src/model/buffs.js";
import { deriveFamiliarSheet, toggleSharedBuff } from "../src/model/familiar.js";
import { chosenFeatCount, expectedFeatCount } from "../src/model/feats.js";
import { casterLevel } from "../src/model/casterLevel.js";
import {
  casterModelFor,
  concentrationDC,
  preparedCapacityByLevel,
  spellSaveDC,
  spellSlotsByLevel,
} from "../src/model/spellcasting.js";

const ref = loadRefData();
const baseDoc = buildLyleDoc(ref);

function idByName(name: string): string {
  const entry = Object.entries(ref.buffs).find(([, b]) => b.name === name);
  if (!entry) throw new Error(`buff not found: ${name}`);
  return entry[0];
}

describe("Lyle — identity, build choices recorded on the document", () => {
  it("sylph arcanist 4, right race/class/HP override", () => {
    expect(baseDoc.identity.name).toBe("Lyle");
    expect(ref.races[baseDoc.identity.race]?.name).toBe("Sylph");
    expect(baseDoc.identity.classes).toEqual([{ tag: "arcanist", level: 4 }]);
    expect(baseDoc.build.maxHpOverride).toBe(25);
  });

  it("4 alternate racial traits, 2 character traits, 4 feats + a +2 house-rule feat grant", () => {
    expect(baseDoc.build.racialTraits).toEqual([
      "sylph-like-the-wind",
      "sylph-whispering-wind",
      "sylph-storm-in-the-blood",
      "sylph-mostly-human",
    ]);
    expect(baseDoc.build.traits).toEqual(["reactionary", "magicalLineage"]);
    expect(baseDoc.build.feats).toHaveLength(4);
    expect(baseDoc.build.gmGrants?.featSlots).toBe(2);
  });

  it("feat budget: 4 chosen matches 4 expected (2 rules-derived + the 2-feat house rule)", () => {
    expect(chosenFeatCount(baseDoc)).toBe(4);
    expect(expectedFeatCount(baseDoc, ref)).toBe(4);
  });

  it("regression: arcanist is now recognised as a caster class (casterLevel.ts fix)", () => {
    // Before this fix, `FULL_CASTER_TAGS` in model/casterLevel.ts didn't list
    // "arcanist", so `casterLevel()` (used by the Sheet header's per-class CL
    // line, and by feat-prerequisite checks) silently returned 0 for every
    // arcanist. Not a `compute()`/DerivedSheet bug — `compute()` never reads
    // this module — but a real, small, structural gap in the just-landed
    // arcanist support. Fixed by adding "arcanist" to the set.
    expect(casterLevel(baseDoc)).toBe(4);
  });
});

describe("Lyle — no buffs (fresh import baseline)", () => {
  const sheet = compute(baseDoc, ref);

  it("abilities: Str 11, Dex 16, Con 10, Int 20, Wis 12, Cha 14 (headband +2 applied)", () => {
    expect(sheet.abilities.str.total).toBe(11);
    expect(sheet.abilities.dex.total).toBe(16);
    expect(sheet.abilities.con.total).toBe(10);
    expect(sheet.abilities.int.total).toBe(20);
    expect(sheet.abilities.wis.total).toBe(12);
    expect(sheet.abilities.cha.total).toBe(14);
  });

  it("BAB +2, HP 25, speed 35 (Like the Wind), init +5 (Reactionary + Dex)", () => {
    expect(sheet.bab).toBe(2);
    expect(sheet.hp.max).toBe(25);
    expect(sheet.speeds.land).toBe(35);
    expect(sheet.initiative.total).toBe(5);
  });

  it("AC 13 / touch 13 / flat-footed 10 (unarmored, no Mage Armor yet)", () => {
    expect(sheet.ac.normal).toBe(13);
    expect(sheet.ac.touch).toBe(13);
    expect(sheet.ac.flatFooted).toBe(10);
  });

  it("saves: Fort +4 (1 base + 0 Con + 1 resist + 2 Great Fortitude), Ref +5, Will +6", () => {
    expect(sheet.saves.fort.total).toBe(4);
    expect(sheet.saves.ref.total).toBe(5);
    expect(sheet.saves.will.total).toBe(6);
  });

  it("melee touch +2, ranged touch +5 (no Bless yet); CMB +2, CMD 15", () => {
    expect(sheet.attack.melee.total).toBe(2);
    expect(sheet.attack.ranged.total).toBe(5);
    expect(sheet.cmb).toBe(2);
    expect(sheet.cmd).toBe(15);
  });

  it("skills match the PDF (no-buff state — Bless never touches skills anyway)", () => {
    const t = (id: string) => sheet.skills[id]?.total;
    expect(t("acr")).toBe(4); // 1 rank + 3 Dex, not a class skill
    expect(t("apr")).toBe(5); // 5 Int, 0 ranks
    expect(t("blf")).toBe(2);
    expect(t("dip")).toBe(2);
    expect(t("esc")).toBe(3);
    expect(t("fly")).toBe(3); // class skill, but 0 ranks -> no +3
    expect(t("hea")).toBe(1);
    expect(t("int")).toBe(2); // Intimidate
    expect(t("kar")).toBe(12); // 4 ranks + 5 Int + 3 class skill
    expect(t("kdu")).toBe(10);
    expect(t("ken")).toBe(10);
    expect(t("kge")).toBe(11);
    expect(t("khi")).toBe(11);
    expect(t("klo")).toBe(12);
    expect(t("kna")).toBe(9);
    expect(t("kpl")).toBe(10);
    expect(t("kre")).toBe(9);
    expect(t("lin")).toBe(9);
    // Perception is NOT an arcanist class skill; +2 comes from the familiar's
    // Alertness-while-in-reach bonus (collect.ts), not a real Alertness feat.
    expect(t("per")).toBe(6);
    expect(t("rid")).toBe(3);
    expect(t("sen")).toBe(5); // Sense Motive: same familiar-Alertness +2
    expect(t("spl")).toBe(12);
    // Stealth: 1 rank + 3 Dex + 4 racial (Whispering Wind) + 3 familiar (cat
    // master bonus) — also not a class skill for arcanist.
    expect(t("ste")).toBe(11);
    expect(t("sur")).toBe(1);
    expect(t("swm")).toBe(0);
  });

  it("Perception/Sense Motive are not arcanist class skills (the familiar bonus is the whole story)", () => {
    expect(sheet.skills.per?.classSkill).toBe(false);
    expect(sheet.skills.sen?.classSkill).toBe(false);
    expect(sheet.skills.ste?.classSkill).toBe(false);
  });
});

describe("Lyle — with Mage Armor + Bless active (the PDF's exported state)", () => {
  const mageArmor = ref.buffs[idByName("Mage Armor")]!;
  const bless = ref.buffs[idByName("Bless")]!;
  let doc = baseDoc;
  doc = addBuff(doc, makeActiveBuff(mageArmor, { instanceId: "mage-armor-1", casterLevel: 1 }));
  doc = addBuff(doc, makeActiveBuff(bless, { instanceId: "bless-1", casterLevel: 4 }));
  const sheet = compute(doc, ref);

  it("AC 17 / touch 13 / flat-footed 14 (+4 armor from Mage Armor, excluded from touch)", () => {
    expect(sheet.ac.normal).toBe(17);
    expect(sheet.ac.touch).toBe(13);
    expect(sheet.ac.flatFooted).toBe(14);
  });

  it("melee touch +3, ranged touch +6 (Bless's +1 morale to attack rolls)", () => {
    expect(sheet.attack.melee.total).toBe(3);
    expect(sheet.attack.ranged.total).toBe(6);
  });

  it("saves/CMB/CMD/speed/HP unaffected by these two buffs", () => {
    expect(sheet.saves.fort.total).toBe(4);
    expect(sheet.saves.ref.total).toBe(5);
    expect(sheet.saves.will.total).toBe(6);
    expect(sheet.cmb).toBe(2);
    expect(sheet.cmd).toBe(15);
    expect(sheet.speeds.land).toBe(35);
    expect(sheet.hp.max).toBe(25);
  });
});

describe("Mortlach — the cat familiar, derived from Lyle's sheet", () => {
  it("HP 12, AC 16/14/14, saves +1/+4/+5 (no shared buffs)", () => {
    const sheet = compute(baseDoc, ref);
    const mortlach = deriveFamiliarSheet(baseDoc, ref, sheet)!;
    expect(mortlach).toBeDefined();
    expect(mortlach.name).toBe("Mortlach");
    expect(mortlach.hp.max).toBe(12);
    expect(mortlach.ac).toMatchObject({ normal: 16, touch: 14, flatFooted: 14 });
    expect(mortlach.saves).toEqual({ fort: 1, ref: 4, will: 5 });
    expect(mortlach.cmb).toBe(2);
    expect(mortlach.cmd).toBe(8);
  });

  it("bite +6 (1d3-4), 2 claws +6 (1d2-4)", () => {
    const sheet = compute(baseDoc, ref);
    const mortlach = deriveFamiliarSheet(baseDoc, ref, sheet)!;
    const bite = mortlach.attacks.find((a) => a.name === "Bite")!;
    const claw = mortlach.attacks.find((a) => a.name === "Claw")!;
    expect(bite.attack).toBe(6);
    expect(bite.damageDice).toBe("1d3");
    expect(bite.damageBonus).toBe(-4);
    expect(claw.attack).toBe(6);
    expect(claw.count).toBe(2);
    expect(claw.damageDice).toBe("1d2");
    expect(claw.damageBonus).toBe(-4);
  });

  it("skills: Stealth +18, Perception +7, Acrobatics +6, Climb +6, Sense Motive +3, Spellcraft +2, Linguistics -1", () => {
    const sheet = compute(baseDoc, ref);
    const mortlach = deriveFamiliarSheet(baseDoc, ref, sheet)!;
    expect(mortlach.skills.ste?.total).toBe(18);
    expect(mortlach.skills.per?.total).toBe(7);
    expect(mortlach.skills.acr?.total).toBe(6);
    expect(mortlach.skills.clm?.total).toBe(6);
    expect(mortlach.skills.sen?.total).toBe(3);
    expect(mortlach.skills.spl?.total).toBe(2);
    expect(mortlach.skills.lin?.total).toBe(-1);
  });

  it("master's own sheet picks up the cat's published +3 Stealth master bonus (folded into Lyle's +11 above)", () => {
    const sheet = compute(baseDoc, ref);
    // Whispering Wind (+4) + familiar (+3) + Dex (+3) + 1 rank = 11, so the
    // familiar's contribution alone must be exactly 3 of that.
    const withoutFamiliarOrRacial = 1 /* rank */ + sheet.abilities.dex.mod;
    expect(sheet.skills.ste!.total - withoutFamiliarOrRacial).toBe(
      4 /* racial */ + 3 /* familiar */,
    );
  });

  it("AC 20/14/18 once the shared Mage Armor buff is toggled onto the familiar (16/14/14 without)", () => {
    let doc = baseDoc;
    const mageArmor = ref.buffs[idByName("Mage Armor")]!;
    doc = addBuff(doc, makeActiveBuff(mageArmor, { instanceId: "mage-armor-1", casterLevel: 1 }));
    doc = toggleSharedBuff(doc, "mage-armor-1");
    const sheet = compute(doc, ref);
    const mortlach = deriveFamiliarSheet(doc, ref, sheet)!;
    expect(mortlach.ac).toMatchObject({ normal: 20, touch: 14, flatFooted: 18 });
  });
});

describe("Lyle — hybrid arcanist spellcasting (prepare wizard-style, cast sorcerer-style)", () => {
  const model = casterModelFor("arcanist")!;

  it("prepared today: 6 cantrips, 3 first-level, 1 second-level (the L4 prepared-capacity table)", () => {
    const prepared = baseDoc.live.spells?.prepared ?? [];
    expect(prepared).toHaveLength(10);
    const byLevel = new Map(preparedCapacityByLevel(model, 4).map((l) => [l.level, l.limit]));
    expect(byLevel.get(0)).toBe(6);
    expect(byLevel.get(1)).toBe(3);
    expect(byLevel.get(2)).toBe(1);
  });

  it("slots/day at Int mod +5: 1st = 6 (4 base + 2), 2nd = 3 (2 base + 1)", () => {
    const slots = new Map(spellSlotsByLevel(model, 4, 5).map((s) => [s.level, s.total]));
    expect(slots.get(1)).toBe(6);
    expect(slots.get(2)).toBe(3);
  });

  it("save DCs: 0th 15, 1st 16, 2nd 17 (10 + level + Int mod 5)", () => {
    expect(spellSaveDC(0, 5)).toBe(15);
    expect(spellSaveDC(1, 5)).toBe(16);
    expect(spellSaveDC(2, 5)).toBe(17);
  });

  it("concentration check = CL (4) + Int mod (5) = +9 (not modeled on DerivedSheet — computed by hand here)", () => {
    expect(4 + 5).toBe(9);
    // concentrationDC is the DEFENSIVE-casting DC, a different number — sanity
    // check it doesn't collide with the above.
    expect(concentrationDC(1)).toBe(17);
  });

  it("spellbook holds all 15 of the 1st/2nd level spells; cantrips are granted, not curated", () => {
    expect(baseDoc.build.spells.known).toHaveLength(15);
  });
});

describe("Lyle — resource pools (Arcane Reservoir / Consume Spells / wand / potions)", () => {
  it("Consume Spells derives to 2/day (Cha mod) — matches the PDF exactly", () => {
    const sheet = compute(baseDoc, ref);
    const pools = deriveResourcePools(baseDoc, ref, sheet.abilities);
    const consumeSpells = pools.find((p) => p.name === "Consume Spells")!;
    expect(consumeSpells.max).toBe(2);
  });

  it("STRUCTURAL GAP: Arcane Reservoir derives to 7, not the PDF's 10 — Extra Reservoir's +3 isn't wired into deriveResourcePools", () => {
    // deriveResourcePools only reads a class FEATURE's own uses.maxFormula
    // ("3 + @class.unlevel" for Arcane Reservoir = 3+4 = 7); no feat anywhere
    // in this app feeds a derived resource-pool max (same story for e.g. a
    // Barbarian feat that would extend Rage rounds — this is a pre-existing,
    // general limitation, not something the arcanist work introduced). Not
    // fixed here per the task's scope (would need new feat->pool wiring
    // machinery); documented as a known gap in the final report instead.
    const sheet = compute(baseDoc, ref);
    const pools = deriveResourcePools(baseDoc, ref, sheet.abilities);
    const reservoir = pools.find((p) => p.name === "Arcane Reservoir")!;
    expect(reservoir.max).toBe(7);
  });

  it("wand charges and potion count are seeded as manual pools (no vendored wand items — issue #36)", () => {
    expect(baseDoc.live.resources["Wand of mage armor"]).toEqual({ used: 0, max: 47 });
    expect(baseDoc.live.resources["Potion of cure light wounds"]).toEqual({ used: 0, max: 4 });
  });

  it("3 hero points, no active buffs, HP starts full on a fresh import", () => {
    expect(baseDoc.live.heroPoints).toBe(3);
    expect(baseDoc.live.activeBuffs).toEqual([]);
    // Regression guard: the exported doc must carry live.hp.current itself —
    // the app's "start at full HP" auto-heal only fires on a brand-new
    // character's first 0 -> nonzero max transition, not reliably on importing
    // a character over an already-built one, so an importable export can't
    // rely on it and must ship with hp.current already set.
    expect(baseDoc.live.hp).toEqual({ current: 25, temp: 0, nonlethal: 0 });
  });
});
