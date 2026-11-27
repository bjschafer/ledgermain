import { describe, expect, it } from "bun:test";

import type { SituationalNote } from "@pf1/schema";

import { groupSituationalNotes, noteSurfaces } from "../src/model/situationalNotes.js";

function note(target: string, text = "note text", source = "Source"): SituationalNote {
  return { target, text, source };
}

describe("noteSurfaces", () => {
  it("maps the headline stat targets", () => {
    expect(noteSurfaces("ac")).toEqual(["ac"]);
    expect(noteSurfaces("cmd")).toEqual(["cmd"]);
    expect(noteSurfaces("cmb")).toEqual(["cmb"]);
    expect(noteSurfaces("init")).toEqual(["init"]);
  });

  it("fans a general save note out to all three saves", () => {
    expect(noteSurfaces("allSavingThrows")).toEqual(["fort", "ref", "will"]);
    expect(noteSurfaces("fort")).toEqual(["fort"]);
    expect(noteSurfaces("ref")).toEqual(["ref"]);
    expect(noteSurfaces("will")).toEqual(["will"]);
  });

  it("fans a general attack note out to melee and ranged", () => {
    expect(noteSurfaces("attack")).toEqual(["melee", "ranged"]);
    expect(noteSurfaces("meleeWeapon")).toEqual(["melee"]);
    expect(noteSurfaces("rangedWeapon")).toEqual(["ranged"]);
    expect(noteSurfaces("melee")).toEqual(["melee"]);
    expect(noteSurfaces("ranged")).toEqual(["ranged"]);
  });

  it("maps a named skill to its row", () => {
    expect(noteSurfaces("skill.per")).toEqual(["skill:per"]);
    expect(noteSurfaces("skill.crf.alchemy")).toEqual(["skill:crf.alchemy"]);
  });

  it("puts all-skill and skill-family targets on the section header", () => {
    expect(noteSurfaces("skills")).toEqual(["skills"]);
    expect(noteSurfaces("dexSkills")).toEqual(["skills"]);
    expect(noteSurfaces("skill.crf")).toEqual(["skills"]);
    expect(noteSurfaces("skill.prf")).toEqual(["skills"]);
  });

  it("maps maneuver-scoped targets to their seal", () => {
    expect(noteSurfaces("cmb.trip")).toEqual(["cmb"]);
    expect(noteSurfaces("cmd.grapple")).toEqual(["cmd"]);
  });

  it("leaves off-sheet targets unmapped", () => {
    expect(noteSurfaces("spellEffect")).toEqual([]);
    expect(noteSurfaces("allChecks")).toEqual([]);
    expect(noteSurfaces("strChecks")).toEqual([]);
    expect(noteSurfaces("cl")).toEqual([]);
    expect(noteSurfaces("landSpeed")).toEqual([]);
  });
});

describe("groupSituationalNotes", () => {
  it("files one note under every surface it applies to", () => {
    const grouped = groupSituationalNotes([note("allSavingThrows", "+1 vs fear", "Bless")]);
    expect(grouped.get("fort")).toHaveLength(1);
    expect(grouped.get("ref")).toHaveLength(1);
    expect(grouped.get("will")).toHaveLength(1);
    expect(grouped.get("ac")).toBeUndefined();
  });

  it("keeps engine order within a surface and drops unmapped notes", () => {
    const grouped = groupSituationalNotes([
      note("will", "first", "A"),
      note("spellEffect", "off-sheet", "B"),
      note("will", "second", "C"),
    ]);
    expect(grouped.get("will")?.map((n) => n.text)).toEqual(["first", "second"]);
    expect([...grouped.keys()]).toEqual(["will"]);
  });

  it("groups separate skills onto their own rows", () => {
    const grouped = groupSituationalNotes([
      note("skill.per", "perception note", "A"),
      note("skill.ste", "stealth note", "B"),
    ]);
    expect(grouped.get("skill:per")?.[0]?.text).toBe("perception note");
    expect(grouped.get("skill:ste")?.[0]?.text).toBe("stealth note");
  });
});
