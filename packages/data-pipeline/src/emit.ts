import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { RefData } from "@pf1/schema";

/** Deterministic JSON with recursively sorted object keys → stable, diffable. */
function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2) + "\n";
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Map of RefData collection → output filename. */
const FILES: { key: keyof RefData; file: string }[] = [
  { key: "races", file: "races.json" },
  { key: "racialTraits", file: "racial-traits.json" },
  { key: "classes", file: "classes.json" },
  { key: "classFeatures", file: "class-features.json" },
  { key: "feats", file: "feats.json" },
  { key: "traits", file: "traits.json" },
  { key: "spells", file: "spells.json" },
  { key: "buffs", file: "buffs.json" },
  { key: "items", file: "items.json" },
  { key: "spellLists", file: "spell-lists.json" },
  { key: "domainSpellLists", file: "domain-spell-lists.json" },
  { key: "bloodlineSpellLists", file: "bloodline-spell-lists.json" },
  { key: "armors", file: "armors.json" },
  { key: "weapons", file: "weapons.json" },
  { key: "archetypes", file: "archetypes.json" },
  { key: "archetypeFeatures", file: "archetype-features.json" },
  { key: "domains", file: "domains.json" },
  { key: "subdomains", file: "subdomains.json" },
  { key: "subdomainSpellLists", file: "subdomain-spell-lists.json" },
  { key: "druidDomains", file: "druid-domains.json" },
  { key: "wizardSchools", file: "wizard-schools.json" },
];

/**
 * Write each RefData collection to its own JSON file, hash the contents, then
 * write meta.json (with the hashes) last so meta is content-addressable.
 */
export function emit(refData: RefData, outputDir: string): void {
  mkdirSync(outputDir, { recursive: true });
  const hashes: Record<string, string> = {};

  for (const { key, file } of FILES) {
    const text = stableStringify(refData[key]);
    writeFileSync(join(outputDir, file), text);
    hashes[file] = sha256(text);
  }

  const meta = { ...refData.meta, hashes };
  writeFileSync(join(outputDir, "meta.json"), stableStringify(meta));
}
