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
import { AUGMENT_SUMMONING, statblockTemplate } from "../src/model/adjust/templates.js";

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
    expect(result.monster.senses).toBe(
      "low-light vision, scent; Perception +9, darkvision 60 ft.",
    );
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
