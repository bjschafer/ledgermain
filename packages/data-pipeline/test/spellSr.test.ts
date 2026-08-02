import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";
import { extractSpellSr } from "../src/transform/spellSr.js";

/**
 * Unit coverage for the `::spell{...}` SR-token grammar (spell-SR import),
 * plus end-to-end assertions against the real vendored data so a future "Pf
 * Data 1e" bump can't silently zero the field out.
 */
describe("extractSpellSr", () => {
  it("srY -> yes", () => {
    expect(extractSpellSr(['::spell{id=1 rTouch target="you" srY}'])).toBe("yes");
  });

  it("srN -> no", () => {
    expect(extractSpellSr(['::spell{id=1 rTouch target="you" srN}'])).toBe("no");
  });

  it("srObject -> yes (object), taking priority over the srY it always accompanies", () => {
    expect(extractSpellSr(['::spell{id=1 rFt=30 area="cone" srY srObject}'])).toBe("yes (object)");
  });

  it("a standalone harmless flag appends (harmless) to srY", () => {
    expect(extractSpellSr(['::spell{id=1 rTouch target="you" will srY harmless}'])).toBe(
      "yes (harmless)",
    );
  });

  it("a standalone harmless flag appends (harmless) to srN too", () => {
    expect(extractSpellSr(['::spell{id=1 rTouch target="you" srN harmless}'])).toBe(
      "no (harmless)",
    );
  });

  it('free-text sr="..." passes through verbatim', () => {
    expect(
      extractSpellSr(['::spell{id=1 rTouch target="you" sr="yes (harmless); see text"}']),
    ).toBe("yes (harmless); see text");
  });

  it("no SR token at all -> undefined, never fabricated", () => {
    expect(extractSpellSr(["::spell{id=1 rPers target=you durML=10}"])).toBeUndefined();
  });

  it("no ::spell{} directive at all -> undefined", () => {
    expect(extractSpellSr(["Just some prose, no directive."])).toBeUndefined();
  });

  it("reads only the FIRST ::spell{} directive when an entry nests several (e.g. a multi-tier spell family)", () => {
    expect(
      extractSpellSr([
        "## Example I",
        "",
        '::spell{id=1 rTouch target="you" srY}',
        "",
        "## Example II",
        "",
        '::spell{id=2 rTouch target="you" srN}',
      ]),
    ).toBe("yes");
  });
});

/**
 * End-to-end coverage against the real pinned vendored slice — `sr` is
 * attached by name-match against the "Pf Data 1e" `spells*.json` files, not
 * carried in the Foundry pack itself, so this is the only place these values
 * are exercised against production data.
 */
describe("RefData.spells[].sr", () => {
  const ref = loadRefData();

  function byName(name: string) {
    const found = Object.values(ref.spells).find((s) => s.name === name);
    if (!found) throw new Error(`spell not found: ${name}`);
    return found;
  }

  it("Charm Person: yes", () => {
    expect(byName("Charm Person").sr).toBe("yes");
  });

  it("Fireball: yes", () => {
    expect(byName("Fireball").sr).toBe("yes");
  });

  it("Mage Armor: no", () => {
    expect(byName("Mage Armor").sr).toBe("no");
  });

  it("Stoneskin: yes (harmless)", () => {
    expect(byName("Stoneskin").sr).toBe("yes (harmless)");
  });

  it("Shout: yes (object)", () => {
    expect(byName("Shout").sr).toBe("yes (object)");
  });

  it("Cure Light Wounds: free-text passthrough", () => {
    expect(byName("Cure Light Wounds").sr).toBe("yes (harmless); see text");
  });

  it("a floor on total spells with sr set, so a future refdata bump can't silently zero this out", () => {
    const withSr = Object.values(ref.spells).filter((s) => s.sr !== undefined);
    expect(withSr.length).toBeGreaterThanOrEqual(2000);
  });
});
