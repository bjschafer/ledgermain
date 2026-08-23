/**
 * End-to-end fixtures crossing the authored template definitions with the
 * applier, hand-computed from the published rules against a real vendored
 * monster. Pins the op-order rule that SR derives from the NEW (post-template)
 * CR: a celestial 5 HD creature is CR +1, so SR = (base CR + 1) + 5.
 */
import type { Monster } from "@pf1/schema";
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { applyAdjustments } from "../src/model/adjust/apply.js";
import {
  AUGMENT_SUMMONING,
  MOONLIGHT_SUMMONS,
  STARLIGHT_SUMMONS,
  statblockTemplate,
  SUMMON_GOOD_DIEHARD,
  SUMMON_NEUTRAL_WILL,
} from "../src/model/adjust/templates.js";

const here = dirname(fileURLToPath(import.meta.url));
const monstersPath = join(here, "../../../packages/data-pipeline/data/monsters.json");
const monsters = JSON.parse(readFileSync(monstersPath, "utf8")) as Record<string, Monster>;

const celestial = statblockTemplate("celestial")!;

describe("celestial lion (Bestiary: lion CR 3, 5d8+10, Str 21/Con 15/Cha 6)", () => {
  // 5 HD lands in the template's middle tier: resist 10, DR 5/evil, CR +1.
  const lion = monsters["lion"]!;
  const result = applyAdjustments(lion, [celestial]);

  it("steps CR before deriving SR, so SR = new CR + 5", () => {
    expect(result.monster.cr).toBe("4"); // 3 + 1 (HD 5 or more)
    expect(result.monster.xp).toBe(1200); // XP table row for CR 4
    expect(result.monster.sr).toBe("9"); // new CR 4 + 5
  });

  it("grants the middle-tier defenses at 5 HD", () => {
    expect(result.monster.dr).toBe("5/evil");
    expect(result.monster.resist).toBe("acid 10, cold 10, electricity 10");
  });

  it("appends darkvision and the substituted smite line", () => {
    expect(result.monster.senses).toBe("low-light vision, scent; Perception +9, darkvision 60 ft.");
    // {hd} = 5, {chaMod} = -2 (Cha 6): substituted verbatim, honesty over prettiness.
    expect(result.monster.specialAttacks).toContain(
      "smite evil 1/day (swift action; adds -2 to attack rolls and 5 to damage rolls against evil foes",
    );
  });

  it("leaves ability-driven numbers alone (celestial has no ability deltas)", () => {
    expect(result.monster.hp).toBe(lion.hp);
    expect(result.monster.melee).toBe(lion.melee);
    expect(result.monster.fort).toBe(lion.fort);
    expect(result.monster.cmb).toBe(lion.cmb);
  });
});

describe("celestial lion with Augment Summoning stacked", () => {
  const lion = monsters["lion"]!;
  const result = applyAdjustments(lion, [celestial, AUGMENT_SUMMONING]);

  it("applies +4 Str/+4 Con on top of the template", () => {
    expect(result.monster.abilityScores?.str).toBe(25); // 21 + 4, mod +5 -> +7
    expect(result.monster.abilityScores?.con).toBe(19); // 15 + 4, mod +2 -> +4
    expect(result.monster.hp).toBe(42); // 32 + conModDelta(2) * 5 HD
    expect(result.monster.hd).toBe("5d8+20"); // flat +10 -> +20
    expect(result.monster.fort).toBe("+8"); // +6 + 2
    // bite +7 (1d8+5 plus grab): dmg 5 == Str mod x1 (multi-attack tie-break), new 7.
    expect(result.monster.melee).toBe("bite +9 (1d8+7 plus grab), 2 claws +9 (1d4+7)");
  });

  it("keeps the template halves independent of the feat", () => {
    expect(result.monster.sr).toBe("9");
    expect(result.monster.dr).toBe("5/evil");
  });
});

describe("aerial eagle (Bestiary: eagle, Small animal, 1 HD, 10 ft., fly 80 ft. (average))", () => {
  const result = applyAdjustments(monsters["eagle"]!, [statblockTemplate("aerial")!]);

  it("gains the air subtype, darkvision, resist electricity 10, and 1 electricity on each natural attack", () => {
    expect(result.monster.subtypes).toEqual(["air"]);
    expect(result.monster.senses).toBe("low-light vision; Perception +10, darkvision 60 ft.");
    expect(result.monster.resist).toBe("electricity 10");
    expect(result.monster.melee).toBe(
      "2 talons +3 (1d4 plus 1 electricity), bite +3 (1d4 plus 1 electricity)",
    );
  });

  it("keeps the printed fly speed: the granted one caps at 10 ft. per HD (1 HD -> 10 ft.), below the printed 80", () => {
    expect(result.monster.speed).toBe("10 ft., fly 80 ft. (average)");
    expect(result.notes).toContainEqual({
      text: "Existing fly speed already meets or exceeds the granted 10 ft.; kept as printed.",
      severity: "info",
    });
  });

  it("stays CR 1/2 with no DR at 1 HD", () => {
    expect(result.monster.cr).toBe("1/2");
    expect(result.monster.dr).toBeUndefined();
  });
});

describe("aqueous wolf (Bestiary: wolf, Medium animal, 2 HD, 50 ft.)", () => {
  const result = applyAdjustments(monsters["wolf"]!, [statblockTemplate("aqueous")!]);

  it("swims at highest speed + 10 and adds 1 cold after the existing trip rider", () => {
    expect(result.monster.speed).toBe("50 ft., swim 60 ft.");
    expect(result.monster.melee).toBe("bite +2 (1d6+1 plus trip plus 1 cold)");
    expect(result.monster.subtypes).toEqual(["water"]);
    expect(result.monster.resist).toBe("cold 10");
  });
});

describe("chthonic / fiery / primordial lion (5 HD: the middle tier, CR +1)", () => {
  const lion = monsters["lion"]!;

  it("chthonic: burrow at half speed, DR 3/-, resist acid 15, 1d6 acid on bite and claws, CR 4", () => {
    const r = applyAdjustments(lion, [statblockTemplate("chthonic")!]);
    expect(r.monster.speed).toBe("40 ft., burrow 20 ft.");
    expect(r.monster.dr).toBe("3/-");
    expect(r.monster.resist).toBe("acid 15");
    expect(r.monster.melee).toBe(
      "bite +7 (1d8+5 plus grab plus 1d6 acid), 2 claws +7 (1d4+5 plus 1d6 acid)",
    );
    expect(r.monster.cr).toBe("4");
    expect(r.monster.subtypes).toEqual(["earth"]);
  });

  it("fiery: 2d6 fire at 5 HD, fire immunity, cold vulnerability, no resist line", () => {
    const r = applyAdjustments(lion, [statblockTemplate("fiery")!]);
    expect(r.monster.melee).toBe(
      "bite +7 (1d8+5 plus grab plus 2d6 fire), 2 claws +7 (1d4+5 plus 2d6 fire)",
    );
    expect(r.monster.immune).toBe("fire");
    expect(r.monster.weaknesses).toBe("vulnerability to cold");
    expect(r.monster.resist).toBeUndefined();
    expect(r.monster.dr).toBe("3/-");
  });

  it("primordial: SR = new CR 4 + 6, +10 ft. speed, bite (first on the priority list) steps 1d8 -> 1d10, two SLAs", () => {
    const r = applyAdjustments(lion, [statblockTemplate("primordial")!]);
    expect(r.monster.cr).toBe("4");
    expect(r.monster.sr).toBe("10");
    expect(r.monster.speed).toBe("50 ft.");
    expect(r.monster.melee).toBe("bite +7 (1d10+5 plus grab), 2 claws +7 (1d4+5)");
    expect(r.monster.dr).toBe("5/cold iron");
    expect(r.monster.spellsHtml).toBe(
      "<p><b>Spell-Like Abilities</b> (granted; 1/day each)<br>dancing lights, faerie fire</p>",
    );
  });
});

describe("primordial on manufactured-weapon and multi-natural-attack creatures", () => {
  it("hill giant: the greatclub is left alone and the slam (its only natural attack) steps 1d8 -> 1d10", () => {
    const r = applyAdjustments(monsters["giant_hill_giant"]!, [statblockTemplate("primordial")!]);
    expect(r.monster.melee).toBe("greatclub +14/+9 (2d8+10) or 2 slams +13 (1d10+7)");
    // "40 ft. (30 ft. in armor)": every printed speed moves, the armored one included.
    expect(r.monster.speed).toBe("50 ft. (40 ft. in armor)");
  });

  it("elephant (11 HD): slam outranks gore on the priority list; the third SLA tier prints a computed DC (Cha 7 -> DC 9)", () => {
    const r = applyAdjustments(monsters["elephant"]!, [statblockTemplate("primordial")!]);
    expect(r.monster.melee).toBe("gore +16 (2d8+10), slam +16 (2d8+10)");
    expect(r.monster.dr).toBe("10/cold iron");
    expect(r.monster.spellsHtml).toContain("dancing lights, faerie fire, lesser confusion (DC 9)");
  });
});

describe("dark wolf and counterpoised lion", () => {
  it("dark: darkvision appended, low-light vision already present so not duplicated, resist cold/electricity 5, SR = CR 1 + 5", () => {
    const r = applyAdjustments(monsters["wolf"]!, [statblockTemplate("dark")!]);
    expect(r.monster.senses).toBe("low-light vision, scent; Perception +8, darkvision 60 ft.");
    expect(r.monster.resist).toBe("cold 5, electricity 5");
    expect(r.monster.sr).toBe("6");
    expect(r.monster.dr).toBeUndefined();
  });

  it("counterpoised: the outer-plane shape with adamantine DR and smite bias", () => {
    const r = applyAdjustments(monsters["lion"]!, [statblockTemplate("counterpoised")!]);
    expect(r.monster.dr).toBe("5/adamantine");
    expect(r.monster.resist).toBe("cold 10, electricity 10, fire 10");
    expect(r.monster.sr).toBe("9");
    expect(r.monster.specialAttacks).toContain(
      "smite bias 1/day (swift action; adds -2 to attack rolls and 5 to damage rolls against a chaotic evil, chaotic good, lawful evil, or lawful good foe",
    );
  });
});

describe("advanced wolf (Int 2: the published exception)", () => {
  const wolf = monsters["wolf"]!;
  const r = applyAdjustments(wolf, [statblockTemplate("advanced")!]);

  it("raises five scores by 4 and leaves Int at 2, with an info note", () => {
    expect(r.monster.abilityScores).toEqual({
      str: 17,
      dex: 19,
      con: 19,
      int: 2,
      wis: 16,
      cha: 10,
    });
    expect(r.notes).toContainEqual({
      text: "Intelligence not changed: the base score of 2 falls under the published exception (2 or less).",
      severity: "info",
    });
  });

  it("still ripples the other scores: hp, AC, CMB/CMD, Will, and the bite line", () => {
    expect(r.monster.hp).toBe(17); // 13 + conModDelta(2) * 2 HD
    expect(r.monster.ac).toBe(18); // 14 + 2 natural + 2 Dex
    expect(r.monster.will).toBe("+3");
    expect(r.monster.melee).toBe("bite +4 (1d6+4 plus trip)");
  });
});

describe("summon feat riders on a wolf", () => {
  it("Moonlight + Starlight + Summon Good Monster append immunities, feats, and SQ text", () => {
    const r = applyAdjustments(monsters["wolf"]!, [
      MOONLIGHT_SUMMONS,
      STARLIGHT_SUMMONS,
      SUMMON_GOOD_DIEHARD,
    ]);
    expect(r.monster.immune).toBe("confusion effects, sleep effects");
    expect(r.monster.feats).toBe("Skill Focus (Perception), Blind-Fight, Diehard");
    expect(r.monster.sq).toContain("sheds light as a light spell");
    expect(r.monster.sq).toContain("cold iron");
  });

  it("Summon Neutral Monster moves Will alone", () => {
    const r = applyAdjustments(monsters["lion"]!, [SUMMON_NEUTRAL_WILL]);
    expect(r.monster.will).toBe("+4");
    expect(r.monster.fort).toBe(monsters["lion"]!.fort);
    expect(r.monster.ref).toBe(monsters["lion"]!.ref);
  });
});
