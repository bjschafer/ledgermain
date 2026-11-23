import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { loadRefData } from "@pf1/data-pipeline";
import { compute } from "@pf1/engine";

import { importCharacterFile } from "../src/model/importExternalFile.js";
import { importFoundryActor } from "../src/model/importFoundry.js";

const refData = loadRefData();

/** The slice of a Foundry actor export these tests edit. */
interface ActorExport {
  [key: string]: unknown;
  system: { attributes: { hp: Record<string, number> } };
  items: { type: string; name: string; system: Record<string, unknown> }[];
}

/** A real export from the oracle fixtures, freshly parsed so a test can edit it. */
function exportOf(fixture: string): ActorExport {
  const file: { scenarios: { base: { actor: ActorExport } } } = JSON.parse(
    readFileSync(join(import.meta.dir, "fixtures/foundry", `${fixture}.json`), "utf8"),
  );
  return file.scenarios.base.actor;
}

function setClassHp(actor: ActorExport, name: string, hp: number): void {
  const item = actor.items.find((i) => i.type === "class" && i.name === name);
  if (!item) throw new Error(`no ${name} class item`);
  item.system.hp = hp;
}

describe("importFoundryActor", () => {
  it("is picked by the file dispatcher for a Foundry export", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(exportOf("human-fighter-6")));
    const { report } = await importCharacterFile(bytes, refData);
    expect(report?.source).toBe("foundry");
  });

  it("maps an archetype by class, and prefers a hand-authored racial trait over its vendored twin", () => {
    // Sacred Tattoo is in both catalogs; only the hand-authored one retires the
    // trait it replaces. Rock Climber exists only in the vendored catalog.
    const { doc } = importFoundryActor(exportOf("half-orc-two-handed-fighter-5"), refData);
    expect(doc.build.archetypes).toEqual(["fighter:two-handed-fighter"]);
    expect(doc.build.racialTraits).toEqual(["half-orc-sacred-tattoo"]);
    expect(doc.build.vendoredRacialTraits?.map((id) => refData.racialTraits[id]!.name)).toEqual([
      "Rock Climber",
    ]);
  });

  it("keeps a non-average class HP total as rolls with the same maximum", () => {
    // Average dice are 40 (10 + 6 × 5); the sheet's 58 adds Con 2 × 6 and Toughness 6.
    const actor = exportOf("human-fighter-6");
    setClassHp(actor, "Fighter", 45);
    const { doc } = importFoundryActor(actor, refData);
    expect(doc.build.settings?.hpMode).toBe("rolled");
    expect(compute(doc, refData).hp.max).toBe(63);
  });

  it("spreads a multiclass HP total across each class's own levels", () => {
    // Cleric 3 at 20 (8 max at 1st, then 12 over two levels) and Barbarian 2 at
    // 15: rolls 6, 6, 8, 7 after the first level, 3 over the average-based 52.
    const actor = exportOf("dwarf-cleric-3-barbarian-2");
    setClassHp(actor, "Cleric", 20);
    setClassHp(actor, "Barbarian", 15);
    const { doc } = importFoundryActor(actor, refData);
    expect(doc.build.hpRolls?.slice(1)).toEqual([6, 6, 8, 7]);
    expect(compute(doc, refData).hp.max).toBe(55);
  });

  it("reads current HP as an offset from the maximum", () => {
    const actor = exportOf("human-fighter-6");
    actor.system.attributes.hp.offset = -12;
    actor.system.attributes.hp.nonlethal = 3;
    const { doc } = importFoundryActor(actor, refData);
    expect(doc.live.hp).toEqual({ current: 46, temp: 0, nonlethal: 3 });
  });

  it("keeps hand-made gear as a custom item and reports it", () => {
    const actor = exportOf("human-paladin-6");
    actor.items.push({
      type: "loot",
      name: "Grandfather's Pocket Watch",
      system: { quantity: 1 },
    });
    const { doc, report } = importFoundryActor(actor, refData);
    expect(doc.build.gear.some((g) => g.name === "Grandfather's Pocket Watch")).toBe(true);
    expect(report.unmapped).toEqual([
      `Gear "Grandfather's Pocket Watch" not found in reference data; added as a custom item.`,
    ]);
  });
});
