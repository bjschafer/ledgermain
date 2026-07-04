/**
 * Shared doc-construction fixture for Lyle — the owner's real character (sylph
 * arcanist 4 + cat familiar Mortlach), built entirely through the real model
 * transitions (never hand-assembled JSON) so this doubles as the arcanist +
 * tracked-familiar + sylph-alternate-racial-traits integration fixture (see
 * `lyle.integration.test.ts`) AND the source of truth for the
 * `lyle-ledgermain.json` file the owner imports from the UI.
 *
 * Every number here is transcribed from the owner's Hero Lab Online PDF
 * export (see the scratchpad spec this was built from) — the PDF was
 * exported with Mage Armor + Bless active, so this fixture builds the
 * BUFF-FREE base document; the integration test layers the two buffs on
 * top for the "with buffs" assertions, and the exported JSON stays
 * buff-free (a fresh import should start with nothing active).
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  addClass,
  addCustomGearItem,
  addGearItem,
  createEmptyDoc,
  setAbility,
  setAge,
  setAlignment,
  setBonusLanguages,
  setClassLevel,
  setGender,
  setGmGrantFeatSlots,
  setHeight,
  setMaxHpOverride,
  setMoney,
  setRace,
  setSkillRank,
  setWeight,
  toggleFeat,
  toggleKnownSpell,
} from "../src/model/doc.js";
import { toggleTrait } from "../src/model/traits.js";
import { toggleRacialTrait } from "../src/model/racialTraits.js";
import { prepareSpell } from "../src/model/preparedSpells.js";
import { setFamiliar, setFamiliarInReach, setFamiliarNotes } from "../src/model/familiar.js";
import { setHeroPoints } from "../src/model/heroPoints.js";
import { addManualPool } from "../src/model/resources.js";
import { restHp } from "../src/model/hp.js";

/** Find a RefData entity's id by its exact display name. Throws if not found (fail fast). */
function idByName<T extends { name: string }>(map: Record<string, T>, name: string): string {
  const entry = Object.entries(map).find(([, v]) => v.name === name);
  if (!entry) throw new Error(`ref lookup failed: no entry named "${name}"`);
  return entry[0];
}

/** Non-zero skill ranks, transcribed from the PDF's Skills block. */
const SKILL_RANKS: Record<string, number> = {
  acr: 1,
  kar: 4,
  kdu: 2,
  ken: 2,
  kge: 3,
  khi: 3,
  klo: 4,
  kna: 1,
  kpl: 2,
  kre: 1,
  lin: 1,
  per: 3,
  sen: 2,
  spl: 4,
  ste: 1,
};

/**
 * The arcanist spellbook (`build.spells.known`) — every 1st/2nd level spell
 * on the PDF's spell list. Cantrips are NOT stored here: the arcanist caster
 * model has `grantsAllCantrips: true`, so 0th-level spells come for free from
 * the class list (see `model/spellcasting.ts` `grantedCantrips`) rather than
 * being curated in the spellbook.
 */
const SPELLBOOK_1ST_2ND = [
  "Burning Hands",
  "Expeditious Retreat",
  "Magic Missile",
  "Snowball",
  "Vanish",
  "Molten Orb",
  "Hydraulic Push",
  "Celestial Healing",
  "Incessant Buzzing",
  "Clarion Call",
  "Darting Duplicate",
  "Bungle",
  "Ear-Piercing Scream",
  "Create Pit",
  "Stone Call",
];

/** Prepared cantrips today (0th, 6 — the L4 arcanist prepared-cantrip cap). */
const PREPARED_CANTRIPS = [
  "Detect Magic",
  "Light",
  "Mending",
  "Prestidigitation",
  "Ray of Frost",
  "Read Magic",
];

/** Prepared 1st-level spells today (3 — the L4 arcanist prepared cap at 1st). */
const PREPARED_1ST = ["Burning Hands", "Expeditious Retreat", "Magic Missile"];

/** Prepared 2nd-level spells today (1 — the L4 arcanist prepared cap at 2nd). */
const PREPARED_2ND = ["Create Pit"];

/**
 * Build Lyle's document, buff-free (no `live.activeBuffs`) — the state a
 * fresh import should start in. Callers that need the PDF's as-exported
 * state (Mage Armor + Bless active) layer those two buffs on top separately
 * (see `lyle.integration.test.ts`), since a character import should never
 * start with stale buffs ticking down.
 */
export function buildLyleDoc(ref: RefData): CharacterDoc {
  let doc = createEmptyDoc("lyle");

  // --- identity --------------------------------------------------------------
  doc = setAlignment(doc, "Neutral Good");
  doc = setGender(doc, "Male");
  doc = setAge(doc, "65");
  doc = setHeight(doc, "5'7\"");
  doc = setWeight(doc, "135 lb");
  doc = { ...doc, identity: { ...doc.identity, name: "Lyle" } };

  // --- race + alternate racial traits -----------------------------------------
  doc = setRace(doc, idByName(ref.races, "Sylph"));
  for (const traitId of [
    "sylph-like-the-wind", // +5 base speed (30 -> 35), replaces Energy Resistance
    "sylph-whispering-wind", // +4 racial Stealth, replaces the feather fall SLA
    "sylph-storm-in-the-blood", // fast healing 2/round on electricity dmg, 8 hp/day at L4 — display-only
    "sylph-mostly-human", // counts as humanoid (human) + outsider (native) — display-only
  ]) {
    doc = toggleRacialTrait(doc, traitId);
  }

  // --- abilities (BASE scores — racial/item adjustments apply through compute()) --
  // Final: Str 11, Dex 16 (14+2 racial), Con 10 (12-2 racial), Int 20 (18+2
  // racial), Wis 12, Cha 14 (12 base + 2 from the equipped Headband below).
  doc = setAbility(doc, "str", 11);
  doc = setAbility(doc, "dex", 14);
  doc = setAbility(doc, "con", 12);
  doc = setAbility(doc, "int", 18);
  doc = setAbility(doc, "wis", 12);
  doc = setAbility(doc, "cha", 12);

  // --- class -------------------------------------------------------------------
  doc = addClass(doc, "arcanist");
  doc = setClassLevel(doc, "arcanist", 4);
  doc = setMaxHpOverride(doc, 25); // PDF: 25 max HP (d6 HD + FCB, entered directly per spec)
  doc = restHp(doc, 25); // full HP, no damage taken — a fresh import shouldn't start at 0/25

  // --- traits (character traits, not racial) ----------------------------------
  doc = toggleTrait(doc, "reactionary"); // +2 trait Initiative
  doc = toggleTrait(doc, "magicalLineage"); // Magic Missile — no numeric effect modeled

  // --- feats -------------------------------------------------------------------
  // House rule: "Feats Allowed: +2" per the PDF's own adjustment line — recorded
  // as a GM grant so the 4 real feats (2 rules-expected + 2 house-rule) don't
  // trip the budget warning. Alertness is deliberately NOT here — it's granted
  // by the familiar while in reach (see collect.ts's tracked-familiar branch),
  // not an owned feat (spec explicitly calls this out).
  doc = setGmGrantFeatSlots(doc, 2);
  for (const featName of [
    "Endurance",
    "Extra Arcanist Exploit",
    "Extra Reservoir",
    "Great Fortitude",
  ]) {
    doc = toggleFeat(doc, idByName(ref.feats, featName));
  }

  // --- skills --------------------------------------------------------------------
  for (const [skill, ranks] of Object.entries(SKILL_RANKS)) {
    doc = setSkillRank(doc, skill, ranks);
  }

  // --- languages -----------------------------------------------------------------
  // Racial (Common, Auran) are automatic; these are the PDF's bonus languages.
  // Note: Mostly Human's RAW says Auran is no longer automatic, but the engine
  // has no `Change` target for "languages" to suppress it — a documented,
  // pre-existing cosmetic gap (racial-traits.ts), not something new here.
  doc = setBonusLanguages(doc, [
    "Celestial",
    "Dwarven",
    "Elven",
    "Gnome",
    "Sylvan",
    "The Old Tongue",
  ]);

  // --- gear --------------------------------------------------------------------
  doc = addGearItem(doc, idByName(ref.items, "Cloak of Resistance +1"));
  doc = addGearItem(doc, idByName(ref.items, "Headband of Alluring Charisma +2"));
  // Wand of Mage Armor: no wand items are vendored (issue #36) — custom item;
  // its 47 charges are tracked as a manual resource pool below, and "using" it
  // means toggling the vendored Mage Armor buff (CL 1, +4 armor) in the tracker.
  doc = addCustomGearItem(doc, "Wand of mage armor (47 charges)");
  doc = addCustomGearItem(doc, "Potion of cure light wounds", { quantity: 4 });
  // Bloodstone collar: display-only custom item (worn by Mortlach) — its RAW
  // effect (familiar stabilizes at -1 hp, remaining damage to master, 3 uses
  // before it goes mundane) has no engine hook, so it's a reminder only.
  doc = addCustomGearItem(
    doc,
    "Collar, bloodstone (worn by Mortlach — stabilizes at -1 hp; 3 uses before mundane)",
  );
  doc = addCustomGearItem(doc, "Arcanist Starting Spellbook", { weight: 3 });
  doc = addCustomGearItem(doc, "Artisan's outfit");

  doc = setMoney(doc, "gp", 1117);
  doc = setMoney(doc, "sp", 5);

  // --- spellbook (known 1st/2nd level spells) -----------------------------------
  for (const name of SPELLBOOK_1ST_2ND) {
    doc = toggleKnownSpell(doc, ref, idByName(ref.spells, name), "arcanist");
  }

  // --- prepared today (per PDF) --------------------------------------------------
  for (const name of [...PREPARED_CANTRIPS, ...PREPARED_1ST, ...PREPARED_2ND]) {
    doc = prepareSpell(doc, idByName(ref.spells, name));
  }

  // --- familiar (Mortlach the cat) -------------------------------------------------
  doc = setFamiliar(doc, "cat", "Mortlach");
  doc = setFamiliarInReach(doc, true);
  // Arcanist exploits (Familiar, Potent Magic, Quick Study) have no dedicated
  // build field yet (the exploit picker is deferred) — recorded as a note per
  // the spec's documented pragmatic path.
  doc = setFamiliarNotes(
    doc,
    "Arcanist exploits: Familiar (Mortlach), Potent Magic, Quick Study — no exploit picker yet, recorded here as a note.",
  );

  // --- live resource pools -----------------------------------------------------
  // Arcane Reservoir / Consume Spells are class-feature-derived pools
  // (deriveResourcePools reads their `uses.maxFormula` off the class feature,
  // not from here) — seeded at full (used: 0) for a fresh import. Arcane
  // Reservoir's derived max is 10: the feature's own "3 + class level" = 7,
  // plus Extra Reservoir's +3 (FEAT_POOL_EFFECTS in feat-effects.ts, honored
  // by deriveResourcePools) — matches the PDF exactly.
  doc = { ...doc, live: { ...doc.live, resources: { ...doc.live.resources } } };
  doc = seedPool(doc, "CtDtLshBC8pc64JV", 10); // Arcane Reservoir (class-derived max)
  doc = seedPool(doc, "jkigrVeg3TUKg0Gy", 2); // Consume Spells (class-derived max, Cha mod)
  doc = addManualPool(doc, "Wand of mage armor", 47);
  doc = addManualPool(doc, "Potion of cure light wounds", 4);

  doc = setHeroPoints(doc, 3);

  return doc;
}

/** Seed a class-feature-derived pool's `used` count (its `max` is display-only — see doc comment above). */
function seedPool(doc: CharacterDoc, id: string, max: number): CharacterDoc {
  return {
    ...doc,
    live: { ...doc.live, resources: { ...doc.live.resources, [id]: { used: 0, max } } },
  };
}
