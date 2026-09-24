/**
 * `isSharedCreatureTarget` is what lets an authoring form hide targets a
 * companion creature's sheet would silently drop, so it has to agree with
 * `routeSharedBuffs`' actual branches.
 */
import { describe, expect, it } from "bun:test";

import {
  isSharedCreatureTarget,
  permanentChangesBuff,
  routeSharedBuffs,
  type RoutedSharedBuffs,
} from "../src/index.js";

function landed(routed: RoutedSharedBuffs): boolean {
  return (
    routed.ac.length +
      routed.fort.length +
      routed.ref.length +
      routed.will.length +
      routed.skill.size +
      routed.skillsGlobal.length +
      Object.values(routed.ability).flat().length +
      routed.attack.length +
      routed.damage.length +
      routed.speed.size +
      routed.init.length >
    0
  );
}

const TARGETS = [
  "ac",
  "aac",
  "sac",
  "nac",
  "fort",
  "ref",
  "will",
  "allSavingThrows",
  "skills",
  "skill.ste",
  "str",
  "int",
  "attack",
  "mattack",
  "rattack",
  "damage",
  "wdamage",
  "init",
  "landSpeed",
  "flySpeed",
  "cmb",
  "cmd",
  "spellResist",
  "dr",
  "eres.fire",
  "sensedv",
];

describe("isSharedCreatureTarget", () => {
  for (const target of TARGETS) {
    it(`${target}: agrees with routeSharedBuffs`, () => {
      const routed = routeSharedBuffs(
        [{ instanceId: "x", name: "X", changes: [{ target, type: "untyped", formula: "2" }] }],
        {},
      );
      expect(isSharedCreatureTarget(target)).toBe(landed(routed));
    });
  }
});

describe("permanentChangesBuff", () => {
  it("is empty without changes", () => {
    expect(permanentChangesBuff(undefined)).toEqual([]);
    expect(permanentChangesBuff({})).toEqual([]);
    expect(permanentChangesBuff({ changes: [] })).toEqual([]);
  });

  it("wraps the changes in one synthetic buff", () => {
    const changes = [{ target: "ref", type: "untyped", formula: "4" }];
    const [buff] = permanentChangesBuff({ changes });
    expect(buff?.changes).toEqual(changes);
  });
});
