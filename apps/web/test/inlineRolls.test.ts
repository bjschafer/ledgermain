import { describe, expect, it } from "bun:test";
import { loadRefData } from "@pf1/data-pipeline";
import type { RollData } from "@pf1/engine";

import { resolveInlineRolls } from "../src/model/inlineRolls.js";

/** A 7th-level character with Con 14 / Int 16 — the numbers the cases below are computed from. */
const ROLL_DATA: RollData = {
  abilities: {
    con: { total: 14, mod: 2 },
    int: { total: 16, mod: 3 },
  },
  attributes: { hd: { total: 7 }, hp: { max: 52 } },
  item: { level: 9 },
};

describe("resolveInlineRolls", () => {
  it("leaves text with no inline roll untouched", () => {
    const text = "+2 racial bonus on Escape Artist checks.";
    expect(resolveInlineRolls(text, ROLL_DATA)).toBe(text);
  });

  it("substitutes a resolved expression's value", () => {
    // Umbral Unmasking-style SR: 5 + 7 HD.
    expect(resolveInlineRolls("You have SR [[5 + @attributes.hd.total]].", ROLL_DATA)).toBe(
      "You have SR 12.",
    );
  });

  it("resolves several expressions in one string independently", () => {
    expect(
      resolveInlineRolls(
        "[[@abilities.int.mod]] extra hp, up to [[@attributes.hp.max]].",
        ROLL_DATA,
      ),
    ).toBe("3 extra hp, up to 52.");
  });

  it("evaluates functions and nested arithmetic", () => {
    // floor((9 + 2) / 6) * 2 = 2.
    expect(resolveInlineRolls("a -[[floor((@item.level + 2) / 6) * 2]] penalty", ROLL_DATA)).toBe(
      "a -2 penalty",
    );
  });

  it("drops the parenthetical around an unresolvable use counter", () => {
    expect(
      resolveInlineRolls(
        "Once per day, you can reroll a failed save. ([[@resources.tenacious.value]] remaining uses)",
        ROLL_DATA,
      ),
    ).toBe("Once per day, you can reroll a failed save.");
  });

  it("keeps a resolved parenthetical while dropping an unresolvable one", () => {
    expect(
      resolveInlineRolls(
        "add (+[[@abilities.int.mod]]) to the check. ([[@resources.adaptableLuck.value]] remaining uses)",
        ROLL_DATA,
      ),
    ).toBe("add (+3) to the check.");
  });

  it("falls back to an em dash when the unresolvable roll carries the sentence", () => {
    expect(
      resolveInlineRolls("[[@resources.curatorOfMysticSecrets.max]] times per day, …", ROLL_DATA),
    ).toBe("— times per day, …");
  });

  it("does not print a confident zero for a missing path", () => {
    const out = resolveInlineRolls("([[@resources.nope.value]] remaining uses)", ROLL_DATA);
    expect(out).not.toContain("0");
  });

  it("leaves a dice term unresolved rather than guessing a roll", () => {
    expect(resolveInlineRolls("deals [[1d6]] fire damage", ROLL_DATA)).toBe("deals — fire damage");
  });

  it("resolves inside an HTML description without disturbing the markup", () => {
    expect(
      resolveInlineRolls(
        "<p>You gain SR <strong>[[5 + @attributes.hd.total]]</strong>.</p>",
        ROLL_DATA,
      ),
    ).toBe("<p>You gain SR <strong>12</strong>.</p>");
  });
});

describe("resolveInlineRolls over the vendored catalogs", () => {
  const refData = loadRefData();

  /** Every vendored string that still carries inline-roll syntax, with its source label. */
  function vendoredStrings(): { label: string; text: string }[] {
    const out: { label: string; text: string }[] = [];
    const push = (label: string, text: string | undefined) => {
      if (text && text.includes("[[")) out.push({ label, text });
    };
    for (const t of Object.values(refData.traits)) {
      push(t.name, t.description);
      for (const n of t.contextNotes) push(t.name, n.text);
    }
    for (const t of Object.values(refData.racialTraits)) {
      push(t.name, t.description);
      for (const n of t.contextNotes) push(t.name, n.text);
    }
    for (const r of Object.values(refData.races)) {
      for (const n of r.contextNotes) push(r.name, n.text);
    }
    for (const b of Object.values(refData.buffs)) {
      push(b.name, b.description);
      for (const n of b.contextNotes) push(b.name, n.text);
    }
    return out;
  }

  it("finds inline rolls to resolve (guards the fixture against an upstream cleanup)", () => {
    expect(vendoredStrings().length).toBeGreaterThan(100);
  });

  it("leaves no inline-roll syntax or sentinel in any vendored string", () => {
    for (const { label, text } of vendoredStrings()) {
      const resolved = resolveInlineRolls(text, ROLL_DATA);
      expect(`${label}: ${resolved}`).not.toContain("[[");
      expect(`${label}: ${resolved}`).not.toContain("\uFFFC");
    }
  });

  it("never leaves an empty parenthetical behind", () => {
    for (const { label, text } of vendoredStrings()) {
      const resolved = resolveInlineRolls(text, ROLL_DATA);
      expect(`${label}: ${resolved}`).not.toMatch(/\(\s*\)/);
    }
  });
});
