import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { RefData, RefDataMeta } from "@pf1/schema";

import { OUTPUT_DIR } from "./config.js";

export { normalize } from "./normalize.js";
export { emit } from "./emit.js";
export * from "./config.js";

function readJson<T>(dir: string, file: string): T {
  return JSON.parse(readFileSync(join(dir, file), "utf8")) as T;
}

/**
 * Load the vendored, normalized RefData from disk (default: the committed
 * `data/` directory). Reassembles the per-collection files into one RefData.
 */
export function loadRefData(dir: string = OUTPUT_DIR): RefData {
  const meta = readJson<RefDataMeta>(dir, "meta.json");
  return {
    meta,
    races: readJson(dir, "races.json"),
    racialTraits: readJson(dir, "racial-traits.json"),
    classes: readJson(dir, "classes.json"),
    classFeatures: readJson(dir, "class-features.json"),
    feats: readJson(dir, "feats.json"),
    traits: readJson(dir, "traits.json"),
    spells: readJson(dir, "spells.json"),
    buffs: readJson(dir, "buffs.json"),
    items: readJson(dir, "items.json"),
    spellLists: readJson(dir, "spell-lists.json"),
    domainSpellLists: readJson(dir, "domain-spell-lists.json"),
    bloodlineSpellLists: readJson(dir, "bloodline-spell-lists.json"),
    armors: readJson(dir, "armors.json"),
    weapons: readJson(dir, "weapons.json"),
    archetypes: readJson(dir, "archetypes.json"),
    archetypeFeatures: readJson(dir, "archetype-features.json"),
    domains: readJson(dir, "domains.json"),
    subdomains: readJson(dir, "subdomains.json"),
    subdomainSpellLists: readJson(dir, "subdomain-spell-lists.json"),
    druidDomains: readJson(dir, "druid-domains.json"),
    druidDomainSpellLists: readJson(dir, "druid-domain-spell-lists.json"),
    elementalSchoolSpellLists: readJson(dir, "elemental-school-spell-lists.json"),
    wizardSchools: readJson(dir, "wizard-schools.json"),
    ragePowers: readJson(dir, "rage-powers.json"),
    hexes: readJson(dir, "hexes.json"),
    shamanHexes: readJson(dir, "shaman-hexes.json"),
    magusArcana: readJson(dir, "magus-arcana.json"),
    rogueTalents: readJson(dir, "rogue-talents.json"),
    ninjaTricks: readJson(dir, "ninja-tricks.json"),
    slayerTalents: readJson(dir, "slayer-talents.json"),
    vigilanteTalents: readJson(dir, "vigilante-talents.json"),
    vigilanteSocialTalents: readJson(dir, "vigilante-social-talents.json"),
    arcanistExploits: readJson(dir, "arcanist-exploits.json"),
    investigatorTalents: readJson(dir, "investigator-talents.json"),
    kineticWildTalents: readJson(dir, "kinetic-wild-talents.json"),
    mesmeristTricks: readJson(dir, "mesmerist-tricks.json"),
    mesmeristBoldStares: readJson(dir, "mesmerist-bold-stares.json"),
    phrenicAmplifications: readJson(dir, "phrenic-amplifications.json"),
    psychicDisciplines: readJson(dir, "psychic-disciplines.json"),
    occultistImplements: readJson(dir, "occultist-implements.json"),
    mediumSpirits: readJson(dir, "medium-spirits.json"),
    oracleMysteries: readJson(dir, "oracle-mysteries.json"),
    oracleCurses: readJson(dir, "oracle-curses.json"),
    witchPatrons: readJson(dir, "witch-patrons.json"),
    shamanSpirits: readJson(dir, "shaman-spirits.json"),
    sorcererBloodlines: readJson(dir, "sorcerer-bloodlines.json"),
    bloodragerBloodlines: readJson(dir, "bloodrager-bloodlines.json"),
    alchemistDiscoveries: readJson(dir, "alchemist-discoveries.json"),
    monkKiPowers: readJson(dir, "monk-ki-powers.json"),
    monkStyleStrikes: readJson(dir, "monk-style-strikes.json"),
    cavalierOrders: readJson(dir, "cavalier-orders.json"),
    shifterAspects: readJson(dir, "shifter-aspects.json"),
  };
}
