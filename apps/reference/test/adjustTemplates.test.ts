/**
 * Structural tests for the clean-room monster-template definitions in
 * `../src/model/adjust/templates.ts`. These do NOT apply the ops (the
 * applier lives in a sibling module owned by another agent); they only
 * check the definitions are internally consistent, line up with the
 * vendored template catalog, and hold the verified rules numbers.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUGMENT_SUMMONING,
  STATBLOCK_TEMPLATES,
  statblockTemplate,
  SUMMON_TEMPLATE_KEYS,
} from "../src/model/adjust/templates.js";
import type { AdjustOp, StatblockAdjustment } from "../src/model/adjust/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const dataDir = join(appRoot, "../../packages/data-pipeline/data");

interface VendoredTemplate {
  id: string;
  summonable?: boolean;
}

const vendoredTemplates: Record<string, VendoredTemplate> = JSON.parse(
  readFileSync(join(dataDir, "monster-templates.json"), "utf8"),
);

const EM_OR_EN_DASH = /[—–]/;

function findOp<K extends AdjustOp["kind"]>(
  template: StatblockAdjustment,
  kind: K,
): Extract<AdjustOp, { kind: K }> | undefined {
  return template.ops.find((op): op is Extract<AdjustOp, { kind: K }> => op.kind === kind);
}

function byKey(key: string): StatblockAdjustment {
  const template = STATBLOCK_TEMPLATES.find((t) => t.key === key);
  if (!template) throw new Error(`no template authored for key "${key}"`);
  return template;
}

function appendLineFor(
  template: StatblockAdjustment,
  field: string,
): Extract<AdjustOp, { kind: "appendLine" }> | undefined {
  return template.ops.find(
    (op): op is Extract<AdjustOp, { kind: "appendLine" }> =>
      op.kind === "appendLine" && op.field === field,
  );
}

describe("STATBLOCK_TEMPLATES vendored-id alignment", () => {
  it("every template key resolves to an id in monster-templates.json", () => {
    for (const template of STATBLOCK_TEMPLATES) {
      expect(vendoredTemplates[template.key], `key "${template.key}"`).toBeDefined();
      expect(vendoredTemplates[template.key]?.id).toBe(template.key);
    }
  });

  it("AUGMENT_SUMMONING is a feat, not a vendored template, so it has no vendored id counterpart", () => {
    expect(vendoredTemplates[AUGMENT_SUMMONING.key]).toBeUndefined();
  });

  it("covers all seven requested templates by exact vendored id", () => {
    const keys = STATBLOCK_TEMPLATES.map((t) => t.key).sort();
    expect(keys).toEqual(
      ["advanced", "celestial", "entropic", "fiendish", "giant", "resolute", "young"].sort(),
    );
  });
});

describe("SUMMON_TEMPLATE_KEYS vs the vendored summonable flag", () => {
  it("matches the authored templates the vendored data flags summonable", () => {
    // Vendored data flags FIVE templates summonable: celestial, entropic,
    // fiendish, resolute, and also first_world_creature (Bestiary 4). The
    // fifth is out of scope for this module (not one of the seven templates
    // authored here, and it uses a type-grafting rule shape - "counts as
    // both its base type and fey" - this vocabulary can't express), so this
    // pins the discrepancy explicitly rather than silently matching the
    // full vendored set.
    const vendoredSummonable = Object.entries(vendoredTemplates)
      .filter(([, t]) => t.summonable)
      .map(([id]) => id)
      .sort();
    expect(vendoredSummonable).toEqual(
      ["celestial", "entropic", "fiendish", "first_world_creature", "resolute"].sort(),
    );
    expect([...SUMMON_TEMPLATE_KEYS].sort()).toEqual(
      ["celestial", "entropic", "fiendish", "resolute"].sort(),
    );
  });

  it("every summon key is an authored template", () => {
    for (const key of SUMMON_TEMPLATE_KEYS) {
      expect(statblockTemplate(key), `key "${key}"`).toBeDefined();
    }
  });
});

describe("celestial creature (Pathfinder RPG Bestiary)", () => {
  const celestial = byKey("celestial");

  it("resists acid, cold, and electricity 5/10/15 by HD tier", () => {
    const resist = findOp(celestial, "resistTiers");
    expect(resist?.energies.sort()).toEqual(["acid", "cold", "electricity"].sort());
    expect(resist?.tiers).toEqual([
      { minHd: 1, value: 5 },
      { minHd: 5, value: 10 },
      { minHd: 11, value: 15 },
    ]);
  });

  it("has DR 5/evil at HD 5-10 and 10/evil at HD 11+, none below HD 5", () => {
    const dr = findOp(celestial, "drTiers");
    expect(dr?.tiers).toEqual([
      { minHd: 1, value: null },
      { minHd: 5, value: "5/evil" },
      { minHd: 11, value: "10/evil" },
    ]);
  });

  it("gains SR = new CR + 5", () => {
    expect(findOp(celestial, "srFromCr")?.delta).toBe(5);
  });

  it("CR is +0 below HD 5 and +1 at HD 5+", () => {
    expect(findOp(celestial, "crTiers")?.tiers).toEqual([
      { minHd: 1, value: 0 },
      { minHd: 5, value: 1 },
    ]);
  });

  it("appends a smite evil special attack with the {hd}/{chaMod} placeholders", () => {
    const smite = appendLineFor(celestial, "specialAttacks");
    expect(smite?.text).toContain("smite evil");
    expect(smite?.text).toContain("{chaMod}");
    expect(smite?.text).toContain("{hd}");
  });

  it("grants darkvision 60 ft., skipped if already present", () => {
    const senses = appendLineFor(celestial, "senses");
    expect(senses?.text).toBe("darkvision 60 ft.");
    expect(senses?.skipIfPresent?.toLowerCase()).toBe("darkvision");
  });
});

describe("fiendish creature is the cold/fire, good-DR, smite-good mirror of celestial", () => {
  const fiendish = byKey("fiendish");

  it("resists cold and fire, not acid/electricity", () => {
    expect(findOp(fiendish, "resistTiers")?.energies.sort()).toEqual(["cold", "fire"].sort());
  });

  it("has DR bypassed by good, not evil", () => {
    const dr = findOp(fiendish, "drTiers");
    expect(dr?.tiers.map((t) => t.value)).toEqual([null, "5/good", "10/good"]);
  });

  it("smites good, not evil", () => {
    const smite = appendLineFor(fiendish, "specialAttacks");
    expect(smite?.text).toContain("smite good");
    expect(smite?.text).toContain("good foes");
  });
});

describe("entropic creature (Pathfinder RPG Bestiary 2)", () => {
  const entropic = byKey("entropic");

  it("resists acid and fire, DR bypassed by lawful, smites law", () => {
    expect(findOp(entropic, "resistTiers")?.energies.sort()).toEqual(["acid", "fire"].sort());
    expect(findOp(entropic, "drTiers")?.tiers.map((t) => t.value)).toEqual([
      null,
      "5/lawful",
      "10/lawful",
    ]);
    const smite = appendLineFor(entropic, "specialAttacks");
    expect(smite?.text).toContain("smite law");
    expect(smite?.text).toContain("lawful foes");
  });
});

describe("resolute creature (Pathfinder RPG Bestiary 2)", () => {
  const resolute = byKey("resolute");

  it("resists acid, cold, and fire (three energies, not two), DR bypassed by chaotic, smites chaos", () => {
    expect(findOp(resolute, "resistTiers")?.energies.sort()).toEqual(
      ["acid", "cold", "fire"].sort(),
    );
    expect(findOp(resolute, "drTiers")?.tiers.map((t) => t.value)).toEqual([
      null,
      "5/chaotic",
      "10/chaotic",
    ]);
    const smite = appendLineFor(resolute, "specialAttacks");
    expect(smite?.text).toContain("smite chaos");
    expect(smite?.text).toContain("chaotic foes");
  });
});

describe("advanced creature (Pathfinder RPG Bestiary)", () => {
  const advanced = byKey("advanced");

  it("adds +4 to all six ability scores", () => {
    const ability = findOp(advanced, "ability");
    expect(ability?.deltas).toEqual({ str: 4, dex: 4, con: 4, int: 4, wis: 4, cha: 4 });
  });

  it("adds +2 natural armor", () => {
    expect(findOp(advanced, "naturalArmor")?.delta).toBe(2);
  });

  it("is a flat CR +1", () => {
    expect(findOp(advanced, "crTiers")?.tiers).toEqual([{ minHd: 1, value: 1 }]);
  });
});

describe("giant creature (Pathfinder RPG Bestiary)", () => {
  const giant = byKey("giant");

  it("grows one size category", () => {
    expect(findOp(giant, "sizeStep")?.delta).toBe(1);
  });

  it("adds +4 Str, +4 Con, -2 Dex and +3 natural armor", () => {
    expect(findOp(giant, "ability")?.deltas).toEqual({ str: 4, con: 4, dex: -2 });
    expect(findOp(giant, "naturalArmor")?.delta).toBe(3);
  });

  it("is a flat CR +1", () => {
    expect(findOp(giant, "crTiers")?.tiers).toEqual([{ minHd: 1, value: 1 }]);
  });
});

describe("young creature (Pathfinder RPG Bestiary)", () => {
  const young = byKey("young");

  it("shrinks one size category", () => {
    expect(findOp(young, "sizeStep")?.delta).toBe(-1);
  });

  it("subtracts 4 Str, 4 Con, adds 4 Dex, and reduces natural armor by 2", () => {
    expect(findOp(young, "ability")?.deltas).toEqual({ str: -4, con: -4, dex: 4 });
    expect(findOp(young, "naturalArmor")?.delta).toBe(-2);
  });

  it("is a flat CR -1", () => {
    expect(findOp(young, "crTiers")?.tiers).toEqual([{ minHd: 1, value: -1 }]);
  });
});

describe("AUGMENT_SUMMONING (Pathfinder RPG Core Rulebook, pg. 118)", () => {
  it("grants +4 Strength and +4 Constitution and nothing else", () => {
    expect(AUGMENT_SUMMONING.ops).toEqual([{ kind: "ability", deltas: { str: 4, con: 4 } }]);
  });

  it("notes it only applies to conjuration (summoning) spells", () => {
    const notes = (AUGMENT_SUMMONING.notes ?? []).join(" ").toLowerCase();
    expect(notes).toContain("summon");
  });

  it("is reachable via statblockTemplate() despite not being in STATBLOCK_TEMPLATES", () => {
    expect(statblockTemplate("augment-summoning")).toBe(AUGMENT_SUMMONING);
    expect(STATBLOCK_TEMPLATES.find((t) => t.key === "augment-summoning")).toBeUndefined();
  });
});

describe("house style and honesty invariants across every authored adjustment", () => {
  const all = [...STATBLOCK_TEMPLATES, AUGMENT_SUMMONING];

  it("every template has at least one op", () => {
    for (const template of all) {
      expect(template.ops.length, template.key).toBeGreaterThan(0);
    }
  });

  it("every template states in notes what is not adjusted", () => {
    for (const template of all) {
      expect(template.notes?.length ?? 0, template.key).toBeGreaterThan(0);
    }
  });

  it("no label or note contains an em dash or en dash", () => {
    for (const template of all) {
      expect(EM_OR_EN_DASH.test(template.label), `${template.key} label`).toBe(false);
      for (const note of template.notes ?? []) {
        expect(EM_OR_EN_DASH.test(note), `${template.key} note: ${note}`).toBe(false);
      }
    }
  });

  it("no appendLine op text contains an em dash or en dash", () => {
    for (const template of all) {
      for (const op of template.ops) {
        if (op.kind === "appendLine") {
          expect(EM_OR_EN_DASH.test(op.text), `${template.key} appendLine text`).toBe(false);
        }
      }
    }
  });

  it("statblockTemplate() returns undefined for an unknown key", () => {
    expect(statblockTemplate("not-a-real-template")).toBeUndefined();
  });
});
