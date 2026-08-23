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
  COUNTERPOISED_KEY,
  MOONLIGHT_SUMMONS,
  STARLIGHT_SUMMONS,
  STATBLOCK_TEMPLATES,
  statblockTemplate,
  SUMMON_GOOD_DIEHARD,
  SUMMON_NEUTRAL_WILL,
  SUMMON_TEMPLATE_KEYS,
  templateIneligibility,
  VERSATILE_SM_TEMPLATE_KEYS,
  VERSATILE_SNA_TEMPLATE_KEYS,
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

  it("covers all fourteen authored templates by exact vendored id", () => {
    const keys = STATBLOCK_TEMPLATES.map((t) => t.key).sort();
    expect(keys).toEqual(
      [
        "advanced",
        "aerial",
        "aqueous",
        "celestial",
        "chthonic",
        "counterpoised",
        "dark",
        "entropic",
        "fiendish",
        "fiery",
        "giant",
        "primordial",
        "resolute",
        "young",
      ].sort(),
    );
  });

  it("every template that derives SR from CR lists its CR op first (SR reads the NEW CR)", () => {
    for (const template of STATBLOCK_TEMPLATES) {
      const kinds = template.ops.map((op) => op.kind);
      const sr = kinds.indexOf("srFromCr");
      if (sr < 0) continue;
      const cr = kinds.indexOf("crTiers");
      expect(cr, `"${template.key}" crTiers before srFromCr`).toBeGreaterThanOrEqual(0);
      expect(cr, `"${template.key}" crTiers before srFromCr`).toBeLessThan(sr);
    }
  });
});

describe("Versatile Summon Monster / Nature's Ally pick lists", () => {
  it("match the feat texts: six for summon monster (with dark), five for nature's ally (without)", () => {
    expect([...VERSATILE_SM_TEMPLATE_KEYS].sort()).toEqual(
      ["aerial", "aqueous", "chthonic", "dark", "fiery", "primordial"].sort(),
    );
    expect([...VERSATILE_SNA_TEMPLATE_KEYS].sort()).toEqual(
      ["aerial", "aqueous", "chthonic", "fiery", "primordial"].sort(),
    );
    for (const key of [...VERSATILE_SM_TEMPLATE_KEYS, COUNTERPOISED_KEY]) {
      expect(statblockTemplate(key), `key "${key}"`).toBeDefined();
    }
  });

  it("gates the elemental-plane templates on type/subtype, fiery also on a swim speed, primordial on nothing", () => {
    const outsider = { creatureType: "outsider", subtypes: ["evil", "lawful"] };
    const airAnimal = { creatureType: "animal", subtypes: ["air"] };
    const swimmer = { creatureType: "animal", speed: "swim 80 ft." };
    const plain = { creatureType: "animal", speed: "40 ft." };
    for (const key of ["aerial", "aqueous", "chthonic", "fiery", "dark"]) {
      expect(templateIneligibility(key, outsider), key).not.toBeNull();
      expect(templateIneligibility(key, airAnimal), key).not.toBeNull();
      expect(templateIneligibility(key, plain), key).toBeNull();
    }
    expect(templateIneligibility("fiery", swimmer)).not.toBeNull();
    expect(templateIneligibility("aqueous", swimmer)).toBeNull();
    expect(templateIneligibility("primordial", outsider)).toBeNull();
    expect(templateIneligibility("celestial", outsider)).toBeNull();
  });
});

describe("elemental-plane templates (Monster Summoner's Handbook)", () => {
  it.each([
    ["aerial", "air", "electricity"],
    ["aqueous", "water", "cold"],
    ["chthonic", "earth", "acid"],
  ])(
    "%s grants the %s subtype, resist %s 10/15/20, DR -/3/5, and 1/1d6/2d6 natural-attack damage",
    (key, subtype, energy) => {
      const t = byKey(key);
      expect(findOp(t, "subtypes")?.add).toEqual([subtype]);
      const resist = findOp(t, "resistTiers");
      expect(resist?.energies).toEqual([energy]);
      expect(resist?.tiers.map((x) => x.value)).toEqual([10, 15, 20]);
      expect(findOp(t, "drTiers")?.tiers.map((x) => x.value)).toEqual([null, "3/-", "5/-"]);
      expect(findOp(t, "attackRider")?.tiers.map((x) => x.value)).toEqual([
        `1 ${energy}`,
        `1d6 ${energy}`,
        `2d6 ${energy}`,
      ]);
      expect(findOp(t, "crTiers")?.tiers).toEqual([
        { minHd: 1, value: 0 },
        { minHd: 5, value: 1 },
      ]);
    },
  );

  it("aerial flies at its highest speed, perfect, capped at 10 ft. per HD; aqueous swims at highest +10; chthonic burrows at half", () => {
    expect(findOp(byKey("aerial"), "speedGrant")).toEqual({
      kind: "speedGrant",
      movement: "fly",
      multiplier: 1,
      plus: 0,
      maxPerHd: 10,
      maneuverability: "perfect",
    });
    expect(findOp(byKey("aqueous"), "speedGrant")).toMatchObject({
      movement: "swim",
      multiplier: 1,
      plus: 10,
    });
    expect(findOp(byKey("chthonic"), "speedGrant")).toMatchObject({
      movement: "burrow",
      multiplier: 0.5,
      plus: 0,
    });
  });

  it("fiery has the steeper 1/2d6/3d6 fire ladder, no resistance, and the fire-subtype immunity/vulnerability", () => {
    const t = byKey("fiery");
    expect(findOp(t, "resistTiers")).toBeUndefined();
    expect(findOp(t, "attackRider")?.tiers.map((x) => x.value)).toEqual([
      "1 fire",
      "2d6 fire",
      "3d6 fire",
    ]);
    expect(appendLineFor(t, "immune")?.text).toBe("fire");
    expect(appendLineFor(t, "weaknesses")?.text).toBe("vulnerability to cold");
    expect(findOp(t, "speedGrant")).toBeUndefined();
  });

  it("primordial: SR = new CR + 6, +10 ft. to all speeds, one primary natural weapon up a step, cumulative SLAs", () => {
    const t = byKey("primordial");
    expect(findOp(t, "srFromCr")?.delta).toBe(6);
    expect(findOp(t, "speedShift")?.delta).toBe(10);
    expect(findOp(t, "primaryNaturalDiceStep")?.steps).toBe(1);
    expect(findOp(t, "drTiers")?.tiers.map((x) => x.value)).toEqual([
      null,
      "5/cold iron",
      "10/cold iron",
    ]);
    expect(findOp(t, "slaTiers")?.tiers).toEqual([
      { minHd: 1, value: "dancing lights" },
      { minHd: 5, value: "faerie fire" },
      { minHd: 11, value: "lesser confusion ({dc1})" },
    ]);
  });

  it("dark: darkvision + low-light vision, DR -/5 magic/10 magic, resist cold and electricity 5/10/15, SR = CR + 5", () => {
    const t = byKey("dark");
    expect(appendLineFor(t, "senses")?.text).toBe("darkvision 60 ft.");
    expect(t.ops.some((op) => op.kind === "appendLine" && op.text === "low-light vision")).toBe(
      true,
    );
    expect(findOp(t, "drTiers")?.tiers.map((x) => x.value)).toEqual([null, "5/magic", "10/magic"]);
    const resist = findOp(t, "resistTiers");
    expect(resist?.energies.sort()).toEqual(["cold", "electricity"]);
    expect(resist?.tiers.map((x) => x.value)).toEqual([5, 10, 15]);
    expect(findOp(t, "srFromCr")?.delta).toBe(5);
  });
});

describe("counterpoised creature (Champions of Balance)", () => {
  const t = byKey("counterpoised");

  it("resists cold, electricity, and fire 5/10/15, DR -/5 adamantine/10 adamantine, SR = CR + 5", () => {
    const resist = findOp(t, "resistTiers");
    expect(resist?.energies.sort()).toEqual(["cold", "electricity", "fire"]);
    expect(resist?.tiers.map((x) => x.value)).toEqual([5, 10, 15]);
    expect(findOp(t, "drTiers")?.tiers.map((x) => x.value)).toEqual([
      null,
      "5/adamantine",
      "10/adamantine",
    ]);
    expect(findOp(t, "srFromCr")?.delta).toBe(5);
  });

  it("appends smite bias against the four corner alignments", () => {
    const smite = appendLineFor(t, "specialAttacks");
    expect(smite?.text).toContain("smite bias 1/day");
    expect(smite?.text).toContain("chaotic evil, chaotic good, lawful evil, or lawful good");
    expect(smite?.text).toContain("{chaMod}");
    expect(smite?.text).toContain("{hd}");
  });
});

describe("advanced creature's Int exception", () => {
  it("is conditional logic on the ability op, not a note", () => {
    const ability = findOp(byKey("advanced"), "ability");
    expect(ability?.except).toEqual({ ability: "int", atMost: 2 });
    expect((byKey("advanced").notes ?? []).join(" ")).not.toContain("Int score of 2 or less");
  });
});

describe("summon feat riders", () => {
  it("Moonlight: light, confusion/sleep immunity, silver natural weapons", () => {
    const immune = MOONLIGHT_SUMMONS.ops.filter(
      (op) => op.kind === "appendLine" && op.field === "immune",
    );
    expect(immune.map((op) => (op as { text: string }).text).sort()).toEqual([
      "confusion effects",
      "sleep effects",
    ]);
    expect(appendLineFor(MOONLIGHT_SUMMONS, "sq")?.text).toContain("silver");
  });

  it("Starlight: Blind-Fight, cold iron natural weapons", () => {
    expect(appendLineFor(STARLIGHT_SUMMONS, "feats")?.text).toBe("Blind-Fight");
    expect(appendLineFor(STARLIGHT_SUMMONS, "sq")?.text).toContain("cold iron");
  });

  it("Summon Good Monster grants Diehard; Summon Neutral Monster grants +2 Will only", () => {
    expect(appendLineFor(SUMMON_GOOD_DIEHARD, "feats")?.text).toBe("Diehard");
    expect(findOp(SUMMON_NEUTRAL_WILL, "saveShift")).toEqual({
      kind: "saveShift",
      delta: 2,
      save: "will",
    });
  });

  it("every feat rider resolves through statblockTemplate by key", () => {
    for (const adj of [
      MOONLIGHT_SUMMONS,
      STARLIGHT_SUMMONS,
      SUMMON_GOOD_DIEHARD,
      SUMMON_NEUTRAL_WILL,
    ]) {
      expect(statblockTemplate(adj.key)).toBe(adj);
    }
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
