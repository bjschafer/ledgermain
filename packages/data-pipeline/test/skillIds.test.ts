import { describe, expect, it } from "bun:test";

import { loadRefData } from "../src/index.js";
import { normalizeSkillId, normalizeSkillTarget } from "../src/transform/common.js";

describe("normalizeSkillId", () => {
  it("maps Foundry's full-name keys to the short ids", () => {
    expect(normalizeSkillId("acrobatics")).toBe("acr");
    expect(normalizeSkillId("knowledge.nature")).toBe("kna");
    expect(normalizeSkillId("senseMotive")).toBe("sen");
  });

  it("keeps a subskill suffix", () => {
    expect(normalizeSkillId("craft.alchemy")).toBe("crf.alchemy");
  });

  it("leaves short ids alone", () => {
    expect(normalizeSkillId("kna")).toBe("kna");
    expect(normalizeSkillId("crf.alchemy")).toBe("crf.alchemy");
  });

  it("only rewrites skill targets, and keeps the Knowledge group target", () => {
    expect(normalizeSkillTarget("skill.perception")).toBe("skill.per");
    expect(normalizeSkillTarget("skill.knowledge")).toBe("skill.knowledge");
    expect(normalizeSkillTarget("skills")).toBe("skills");
    expect(normalizeSkillTarget("attack")).toBe("attack");
  });
});

// A skill key upstream renames that the map above doesn't know passes through
// untouched, and the engine then silently never matches it. This sweep turns
// that into a red test.
describe("vendored skill ids", () => {
  const ref = loadRefData();
  const isShort = (id: string) => /^[a-z]{3}(\.|$)/.test(id);

  it("every class and race class-skill id is a short id", () => {
    const lists = [...Object.values(ref.classes), ...Object.values(ref.races)].flatMap(
      (e) => e.classSkills ?? [],
    );
    expect(lists.length).toBeGreaterThan(0);
    expect(lists.filter((id) => !isShort(id))).toEqual([]);
  });

  it("every skill change target is a short id or the Knowledge group", () => {
    const bad = new Set<string>();
    for (const collection of [ref.buffs, ref.classFeatures, ref.items, ref.races, ref.feats]) {
      for (const entry of Object.values(collection)) {
        for (const c of entry.changes ?? []) {
          if (!c.target.startsWith("skill.")) continue;
          const id = c.target.slice(6);
          if (id !== "knowledge" && !isShort(id)) bad.add(c.target);
        }
      }
    }
    expect([...bad]).toEqual([]);
  });
});
