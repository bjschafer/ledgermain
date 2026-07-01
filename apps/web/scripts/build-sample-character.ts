/**
 * Generates the pre-built sample character shipped with the app so new users
 * have something to explore instead of a blank sheet (`src/data/sample-character.json`,
 * committed). Re-run with `bun run sample:build` after a RefData bump if any of
 * the named lookups below no longer resolve (the script throws instead of
 * silently emitting a broken doc).
 *
 * Uses the same pure `model/` transitions the builder UI calls, so the emitted
 * doc is exactly what the app itself would have produced choice-by-choice —
 * no hand-authored JSON to drift from the schema.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { loadRefData } from "@pf1/data-pipeline";
import { compute, deriveResourcePools } from "@pf1/engine";
import type { ArmorRef, RefData, WeaponRef } from "@pf1/schema";

import { addBuff, makeActiveBuff } from "../src/model/buffs.js";
import {
  addAbilityIncrease,
  addClass,
  addGearItem,
  addWeaponFromRef,
  addWornArmorFromRef,
  createEmptyDoc,
  setAbility,
  setAlignment,
  setArchetypes,
  setClassLevel,
  setClericDomains,
  setDeity,
  setFavoredClassBonus,
  setGender,
  setHeight,
  setName,
  setRace,
  setSkillRank,
  setWeight,
  toggleFeat,
} from "../src/model/doc.js";
import { setFeatChoice } from "../src/model/feats.js";
import { applyDamage, restHp } from "../src/model/hp.js";
import { prepareDomainSpell, prepareSpell, setExpendedAt } from "../src/model/preparedSpells.js";
import { drainResource, syncDerivedPools } from "../src/model/resources.js";

const ref = loadRefData();

function byName<T extends { name: string }>(record: Record<string, T>, name: string): T & { id: string } {
  const entry = Object.entries(record).find(([, v]) => v.name === name);
  if (!entry) throw new Error(`RefData lookup failed: no entry named "${name}"`);
  return { ...entry[1], id: entry[0] } as T & { id: string };
}

function raceId(refData: RefData, name: string): string {
  return byName(refData.races, name).id;
}
function feat(refData: RefData, name: string): string {
  return byName(refData.feats, name).id;
}
function armor(refData: RefData, name: string): ArmorRef {
  return byName(refData.armors, name) as unknown as ArmorRef;
}
function weapon(refData: RefData, name: string): WeaponRef {
  return byName(refData.weapons, name) as unknown as WeaponRef;
}
function itemId(refData: RefData, name: string): string {
  return byName(refData.items, name).id;
}
function spellId(refData: RefData, name: string): string {
  const entry = Object.entries(refData.spells).find(([, v]) => v.name === name);
  if (!entry) throw new Error(`RefData lookup failed: no spell named "${name}"`);
  return entry[0];
}
function buff(refData: RefData, name: string) {
  return byName(refData.buffs, name);
}

let doc = createEmptyDoc("sample-kordrek-ironvein");
doc = setName(doc, "Kordrek Ironvein");
doc = setRace(doc, raceId(ref, "Dwarf"));
doc = setAlignment(doc, "LG");
doc = setDeity(doc, "Torag");
doc = setGender(doc, "Male");
doc = setHeight(doc, "4 ft. 3 in.");
doc = setWeight(doc, "185 lb.");

doc = setAbility(doc, "str", 14);
doc = setAbility(doc, "dex", 12);
doc = setAbility(doc, "con", 12);
doc = setAbility(doc, "int", 10);
doc = setAbility(doc, "wis", 16);
doc = setAbility(doc, "cha", 12);

doc = addClass(doc, "cleric");
doc = setClassLevel(doc, "cleric", 5);
for (let level = 0; level < 5; level += 1) {
  doc = setFavoredClassBonus(doc, level, "hp");
}
doc = addAbilityIncrease(doc, "wis"); // level-4 increase

doc = setClericDomains(doc, ["War", "Strength"]);
doc = setArchetypes(doc, []);

doc = setSkillRank(doc, "hea", 5);
doc = setSkillRank(doc, "kre", 3);
doc = setSkillRank(doc, "dip", 3);
doc = setSkillRank(doc, "sen", 3);

doc = toggleFeat(doc, feat(ref, "Toughness"));
doc = toggleFeat(doc, feat(ref, "Selective Channeling"));
const skillFocus = feat(ref, "Skill Focus");
doc = toggleFeat(doc, skillFocus);
doc = setFeatChoice(doc, skillFocus, "hea");

doc = addWornArmorFromRef(doc, armor(ref, "Chainmail"));
doc = addWornArmorFromRef(doc, armor(ref, "Heavy Steel Shield"));
doc = addWeaponFromRef(doc, weapon(ref, "Heavy Mace"));
doc = addGearItem(doc, itemId(ref, "Cloak of Resistance +1"));

// Daily prepared loadout: a handful of cantrips, a mostly-full 1st/2nd level
// loadout (a couple already cast), and the two domains' bonus slots.
for (const name of ["Guidance", "Light", "Resistance"]) {
  doc = prepareSpell(doc, spellId(ref, name));
}
for (const name of ["Cure Light Wounds", "Cure Light Wounds", "Bless", "Divine Favor"]) {
  doc = prepareSpell(doc, spellId(ref, name));
}
for (const name of ["Cure Moderate Wounds", "Align Weapon"]) {
  doc = prepareSpell(doc, spellId(ref, name));
}
for (const name of ["Cure Serious Wounds", "Dispel Magic"]) {
  doc = prepareSpell(doc, spellId(ref, name));
}
doc = prepareDomainSpell(doc, spellId(ref, "Magic Weapon")); // War, L1
doc = prepareDomainSpell(doc, spellId(ref, "Enlarge Person")); // Strength, L1
doc = prepareDomainSpell(doc, spellId(ref, "Spiritual Weapon")); // War, L2
doc = prepareDomainSpell(doc, spellId(ref, "Bull's Strength")); // Strength, L2
doc = prepareDomainSpell(doc, spellId(ref, "Magic Vestment")); // War, L3
doc = prepareDomainSpell(doc, spellId(ref, "Magic Vestment")); // Strength, L3 (same spell, separate domain slot)

// Mark a couple already cast, so the tracker opens mid-adventuring-day rather
// than freshly rested.
{
  const prepared = doc.live.spells?.prepared ?? [];
  const expendFirst = (matchSpellId: string, kind?: "normal" | "domain") => {
    const idx = prepared.findIndex(
      (p) => p.spellId === matchSpellId && (kind === undefined || (p.kind ?? "normal") === kind),
    );
    if (idx >= 0) doc = setExpendedAt(doc, idx, true);
  };
  expendFirst(spellId(ref, "Cure Light Wounds"));
  expendFirst(spellId(ref, "Bless"));
  expendFirst(spellId(ref, "Magic Weapon"), "domain");
}

doc = addBuff(
  doc,
  makeActiveBuff(buff(ref, "Bull's Strength"), { casterLevel: 5, remainingRounds: 42 }),
);

doc = addBuff(doc, makeActiveBuff(buff(ref, "Bless"), { casterLevel: 5, remainingRounds: 6 }));

doc = { ...doc, live: { ...doc.live, heroPoints: 2 } };

// Sync + partially spend Channel Energy so the resource panel isn't at a
// pristine full-day state either.
{
  const sheet = compute(doc, ref);
  const pools = deriveResourcePools(doc, ref, sheet.abilities);
  doc = syncDerivedPools(doc, pools);
  const channel = pools.find((p) => p.name === "Channel Energy");
  if (channel) doc = drainResource(doc, channel.id, 2);
}

// Bruised from the fight that used those resources, not walking around at
// full HP.
{
  const sheet = compute(doc, ref);
  doc = restHp(doc, sheet.hp.max);
  doc = applyDamage(doc, Math.round(sheet.hp.max * 0.3));
}

doc = { ...doc, updatedAt: "2026-01-01T00:00:00.000Z" };

// Sanity check: make sure the doc computes cleanly before we ship it.
compute(doc, ref);

const here = dirname(fileURLToPath(import.meta.url));
const dest = join(here, "../src/data/sample-character.json");
writeFileSync(dest, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`[build-sample-character] wrote ${dest}`);
