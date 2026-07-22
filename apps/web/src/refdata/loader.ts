/**
 * Browser RefData loader. The Node-fs `loadRefData()` in @pf1/data-pipeline can't
 * run in the browser, so we `fetch` the vendored JSON that `scripts/copy-refdata.ts`
 * places under `public/data/`. This is the ONE module that knows how RefData
 * reaches the client — Stage 5 swaps it for lazy R2 loading without touching the
 * rest of the app.
 */
import type { RefData, RefDataMeta } from "@pf1/schema";

const BASE = `${import.meta.env.BASE_URL}data`;

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

let cache: Promise<RefData> | undefined;

/** Load (and memoise) the full normalized reference dataset. */
export function loadRefData(): Promise<RefData> {
  if (!cache) cache = fetchAll();
  return cache;
}

async function fetchAll(): Promise<RefData> {
  const [
    meta,
    races,
    racialTraits,
    classes,
    classFeature,
    feats,
    traits,
    spells,
    buffs,
    items,
    spellLists,
    domainSpellLists,
    bloodlineSpellLists,
    armors,
    weapons,
    archetypes,
    archetypeFeatures,
    domains,
    subdomains,
    subdomainSpellLists,
    druidDomains,
    wizardSchools,
    ragePowers,
    rogueTalents,
    ninjaTricks,
    slayerTalents,
    vigilanteTalents,
    vigilanteSocialTalents,
  ] = await Promise.all([
    getJson<RefDataMeta>("meta.json"),
    getJson<RefData["races"]>("races.json"),
    getJson<RefData["racialTraits"]>("racial-traits.json"),
    getJson<RefData["classes"]>("classes.json"),
    getJson<RefData["classFeatures"]>("class-features.json"),
    getJson<RefData["feats"]>("feats.json"),
    getJson<RefData["traits"]>("traits.json"),
    getJson<RefData["spells"]>("spells.json"),
    getJson<RefData["buffs"]>("buffs.json"),
    getJson<RefData["items"]>("items.json"),
    getJson<RefData["spellLists"]>("spell-lists.json"),
    getJson<RefData["domainSpellLists"]>("domain-spell-lists.json"),
    getJson<RefData["bloodlineSpellLists"]>("bloodline-spell-lists.json"),
    getJson<RefData["armors"]>("armors.json"),
    getJson<RefData["weapons"]>("weapons.json"),
    getJson<RefData["archetypes"]>("archetypes.json"),
    getJson<RefData["archetypeFeatures"]>("archetype-features.json"),
    getJson<RefData["domains"]>("domains.json"),
    getJson<RefData["subdomains"]>("subdomains.json"),
    getJson<RefData["subdomainSpellLists"]>("subdomain-spell-lists.json"),
    getJson<RefData["druidDomains"]>("druid-domains.json"),
    getJson<RefData["wizardSchools"]>("wizard-schools.json"),
    getJson<RefData["ragePowers"]>("rage-powers.json"),
    getJson<RefData["rogueTalents"]>("rogue-talents.json"),
    getJson<RefData["ninjaTricks"]>("ninja-tricks.json"),
    getJson<RefData["slayerTalents"]>("slayer-talents.json"),
    getJson<RefData["vigilanteTalents"]>("vigilante-talents.json"),
    getJson<RefData["vigilanteSocialTalents"]>("vigilante-social-talents.json"),
  ]);
  return {
    meta,
    races,
    racialTraits,
    classes,
    classFeatures: classFeature,
    feats,
    traits,
    spells,
    buffs,
    items,
    spellLists,
    domainSpellLists,
    bloodlineSpellLists,
    armors,
    weapons,
    archetypes,
    archetypeFeatures,
    domains,
    subdomains,
    subdomainSpellLists,
    druidDomains,
    wizardSchools,
    ragePowers,
    rogueTalents,
    ninjaTricks,
    slayerTalents,
    vigilanteTalents,
    vigilanteSocialTalents,
  };
}
