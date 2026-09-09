/**
 * The Build tab's attention badges, extracted out of `BuildNav` so the level-up
 * toast and the mode tab can read the same answer. The counts themselves come
 * from the model functions each section's own header already uses; what is
 * checked here is the badge layer over them — which section gets flagged, in
 * what tone, and where "spend it" sends a player who just levelled.
 */
import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";
import type { CharacterDoc } from "@pf1/schema";

import {
  attentionBadges,
  attentionTotal,
  BUILD_SECTIONS,
  firstAttentionSection,
  visibleBuildSections,
  type AttentionBadges,
} from "../src/model/buildSections.js";
import { addClass, createEmptyDoc, setClassLevel } from "../src/model/doc.js";

const ref = loadRefData();

/** A fighter at `level`, with nothing spent: open feat slots and skill ranks. */
function fighter(level: number): CharacterDoc {
  return setClassLevel(addClass(createEmptyDoc("char-1"), "fighter"), "fighter", level);
}

describe("attentionBadges", () => {
  it("flags nothing on a character with no class levels to spend for", () => {
    const badges = attentionBadges(createEmptyDoc("char-1"), ref);
    expect(attentionTotal(badges)).toBe(0);
  });

  it("flags open feat slots and unspent skill ranks once there are levels", () => {
    const badges = attentionBadges(fighter(4), ref);
    expect(badges["section-feats"]?.count).toBeGreaterThan(0);
    expect(badges["section-feats"]?.tone).toBe("gold");
    expect(badges["section-skills"]?.count).toBeGreaterThan(0);
  });

  it("flags the ability score increase a 4th level brings", () => {
    expect(attentionBadges(fighter(3), ref)["section-abilities"]).toBeUndefined();
    expect(attentionBadges(fighter(4), ref)["section-abilities"]).toEqual({
      count: 1,
      tone: "gold",
      title: "1 ability score increase unassigned",
    });
  });

  it("keys every badge to a real section id", () => {
    const ids = new Set(BUILD_SECTIONS.map((s) => s.id));
    for (const key of Object.keys(attentionBadges(fighter(8), ref))) {
      expect(ids.has(key)).toBe(true);
    }
  });
});

describe("attentionTotal", () => {
  it("sums the badges worth spending and ignores the informational ones", () => {
    const badges: AttentionBadges = {
      "section-feats": { count: 2, tone: "gold", title: "" },
      "section-skills": { count: 3, tone: "warn", title: "" },
      "section-traits": { count: 9, tone: "dim", title: "" },
    };
    expect(attentionTotal(badges)).toBe(5);
  });
});

describe("firstAttentionSection", () => {
  it("picks the topmost flagged section in layout order, not the first key added", () => {
    const badges: AttentionBadges = {
      "section-feats": { count: 1, tone: "gold", title: "" },
      "section-abilities": { count: 1, tone: "gold", title: "" },
    };
    expect(firstAttentionSection(badges)).toBe("section-abilities");
  });

  it("never sends a player to a merely informational badge", () => {
    const badges: AttentionBadges = {
      "section-traits": { count: 1, tone: "dim", title: "" },
    };
    expect(firstAttentionSection(badges)).toBeUndefined();
  });

  it("has nowhere to send a player with nothing outstanding", () => {
    expect(firstAttentionSection({})).toBeUndefined();
  });

  it("lands on a real section for a freshly levelled character", () => {
    const target = firstAttentionSection(attentionBadges(fighter(4), ref));
    expect(BUILD_SECTIONS.some((s) => s.id === target)).toBe(true);
  });
});

describe("visibleBuildSections", () => {
  it("drops the Spells jump target for a character who casts nothing", () => {
    const ids = visibleBuildSections(fighter(4), ref).map((s) => s.id);
    expect(ids).not.toContain("section-spells");
    expect(ids).toContain("section-feats");
  });
});
