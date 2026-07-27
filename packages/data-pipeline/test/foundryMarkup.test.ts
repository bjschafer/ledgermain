import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";
import { resolveFoundryMarkup } from "../src/util/html.js";

const NO_NAMES = () => undefined;
const resolve = (s: string, names: (uuid: string) => string | undefined = NO_NAMES) =>
  resolveFoundryMarkup(s, names);

describe("resolveFoundryMarkup: inline rolls", () => {
  it("reduces a constant roll to its number", () => {
    expect(resolve("+[[1]] Trait bonus to disable traps.")).toBe(
      "+1 Trait bonus to disable traps.",
    );
    expect(resolve("Takes an additional -[[2]] to attack rolls.")).toBe(
      "Takes an additional -2 to attack rolls.",
    );
  });

  it("strips the chat-roll command from a dice roll", () => {
    expect(resolve("roll [[/r 3d6]] fire damage")).toBe("roll 3d6 fire damage");
    expect(resolve("[[/roll d100]]")).toBe("d100");
    expect(resolve("heals [[1d4+1]] hp")).toBe("heals 1d4+1 hp");
  });

  it("leaves an @-path roll alone rather than guessing a number", () => {
    // No character to evaluate against at build time, and "+0 Morale vs Fear"
    // would be a wrong number rather than an unresolved one.
    const note = "+[[1 + max(0, floor((@item.level + 1) / 6))]] Morale vs Fear";
    expect(resolve(note)).toBe(note);
  });

  it("recovers a mistyped closing bracket", () => {
    // Both forms appear in the vendored trait catalog.
    expect(resolve("+[[1] Trait bonus on melee attacks when charging.")).toBe(
      "+1 Trait bonus on melee attacks when charging.",
    );
    expect(resolve("you gain a +[[1[[ Trait bonus on your check")).toBe(
      "you gain a +1 Trait bonus on your check",
    );
  });

  it("leaves a mistyped @-path roll alone too", () => {
    const broken = "+[[if(gte(@item.level, 10), 1)] against curses";
    expect(resolve(broken)).toBe(broken);
  });
});

describe("resolveFoundryMarkup: enrichers", () => {
  it("uses a braced display name", () => {
    expect(resolve("gains @UUID[Compendium.pf1.feats.Item.abc]{Blind-Fight}")).toBe(
      "gains Blind-Fight",
    );
    expect(
      resolve("@Compendium[pf1e-archetypes.pf-prestige-features.LGn9]{Swift Scroll (Ex)}"),
    ).toBe("Swift Scroll (Ex)");
  });

  it("resolves a bare link through the name index, and drops it when unknown", () => {
    const names = (uuid: string) => (uuid === "Compendium.pf1.feats.Item.abc" ? "Rage" : undefined);
    expect(resolve("gains @UUID[Compendium.pf1.feats.Item.abc]", names)).toBe("gains Rage");
    expect(resolve("gains @UUID[Compendium.pf1.feats.Item.zzz]", names)).toBe("gains ");
  });

  it("drops @Embed directives whole, display override included", () => {
    expect(resolve("before @Embed[Compendium.pf1.x.Item.y]{Shattering Strike (Ex)} after")).toBe(
      "before  after",
    );
  });

  it("renders distances and weights with their unit", () => {
    expect(resolve("attacks from at least @Distance[20 ft;dual] below you")).toBe(
      "attacks from at least 20 ft. below you",
    );
    expect(resolve("carrying @Weight[200;dual]")).toBe("carrying 200 lbs.");
  });

  it("renders conditions, toggles, and sources as their plain argument", () => {
    expect(resolve("becomes @Condition[dazzled]")).toBe("becomes dazzled");
    expect(resolve("@Condition[paralyzed;info]")).toBe("paralyzed");
    expect(resolve("@Toggle[Change Shape (Skinwalker, Scent)]")).toBe(
      "Change Shape (Skinwalker, Scent)",
    );
    expect(resolve("@Source[PZO9458;pages=18]")).toBe("PZO9458 p. 18");
    expect(resolve("@Source[APG]")).toBe("APG");
  });

  it("keeps a DC flag, which is the number the player needs", () => {
    expect(resolve("@Save[will;dc=23]")).toBe("will DC 23");
    expect(resolve("@Skill[per;dc=23]")).toBe("per DC 23");
  });

  it("keeps damage and healing expressions", () => {
    expect(resolve("@Damage[2d6;card]")).toBe("2d6");
    expect(resolve("@Heal[4d8+7;dual;card]")).toBe("4d8+7");
  });
});

describe("vendored data carries no unresolved Foundry markup", () => {
  const ref = loadRefData();
  const ENRICHER = /@[A-Z][A-Za-z]*\[/;
  /** Only `@`-path inline rolls survive: they need a character to evaluate. */
  const UNRESOLVED_ROLL = /\[\[(?![^\]]*@)/;

  function offenders(pattern: RegExp): string[] {
    const hits: string[] = [];
    const walk = (value: unknown) => {
      if (typeof value === "string") {
        if (pattern.test(value)) hits.push(value.slice(0, 120));
      } else if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") Object.values(value).forEach(walk);
    };
    walk(ref);
    return hits;
  }

  it("has no @Name[...] enrichers left", () => {
    expect(offenders(ENRICHER)).toEqual([]);
  });

  it("has no inline rolls left except the @-path ones", () => {
    expect(offenders(UNRESOLVED_ROLL)).toEqual([]);
  });
});
