import { describe, expect, it } from "bun:test";

import type { AbilityId } from "@pf1/schema";

import { creatureAbilityRows } from "../src/model/creatureDisplay.js";

function makeAbilities(): Record<AbilityId, { score: number; mod: number }> {
  return {
    str: { score: 16, mod: 3 },
    dex: { score: 17, mod: 3 },
    con: { score: 15, mod: 2 },
    int: { score: 2, mod: -4 },
    wis: { score: 12, mod: 1 },
    cha: { score: 6, mod: -2 },
  };
}

describe("creatureAbilityRows", () => {
  it("orders rows Str/Dex/Con/Int/Wis/Cha with capitalized labels and signed mods", () => {
    const rows = creatureAbilityRows(makeAbilities());
    expect(rows.map((r) => r.id)).toEqual(["str", "dex", "con", "int", "wis", "cha"]);
    expect(rows.map((r) => r.label)).toEqual(["Str", "Dex", "Con", "Int", "Wis", "Cha"]);
    expect(rows[0]).toEqual({ id: "str", label: "Str", score: 16, mod: "+3" });
    expect(rows[3]).toEqual({ id: "int", label: "Int", score: 2, mod: "-4" });
  });
});
