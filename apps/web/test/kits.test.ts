import { describe, expect, it } from "bun:test";

import { loadRefData } from "@pf1/data-pipeline";

import { createEmptyDoc } from "../src/model/doc.js";
import { addKit, isKit, kitContents, listKits } from "../src/model/kits.js";

const ref = loadRefData();

/** "Kit, Wizard's" — the worked example from issue #80. */
const WIZARD_KIT = "CDQCyfYfW9aneX9e";
/** "Kit, Vampire Slayer's" — the only kit packing a non-`items`-pack entry. */
const VAMPIRE_SLAYER_KIT = "PI7uxv6NWE1RX7B8";

function kit(id: string) {
  const item = ref.items[id];
  if (!item || !isKit(item)) throw new Error(`not a kit: ${id}`);
  return item;
}

describe("isKit", () => {
  it("accepts a container that packs items", () => {
    expect(isKit(ref.items[WIZARD_KIT]!)).toBe(true);
  });

  it("rejects an ordinary item", () => {
    // Bedroll — packed *by* kits, but packs nothing itself.
    expect(isKit(ref.items.iegwwsarycqwoezj!)).toBe(false);
  });
});

describe("listKits", () => {
  it("finds every expandable container, name-sorted", () => {
    const kits = listKits(ref);
    expect(kits.length).toBe(40);
    const names = kits.map((k) => k.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    expect(names).toContain("Kit, Wizard's");
  });
});

describe("kitContents", () => {
  it("expands the Wizard's Kit to its 13 packed entries", () => {
    const rows = kitContents(kit(WIZARD_KIT));
    expect(rows.length).toBe(13);
    expect(rows.every((r) => r.equipped)).toBe(true);
  });

  it("keeps a linked entry as a bare itemId so weight/price stay live", () => {
    const rows = kitContents(kit(WIZARD_KIT));
    const bedroll = rows.find((r) => r.itemId === "iegwwsarycqwoezj");
    // No snapshotted weight/price: they resolve off RefData.items at display.
    expect(bedroll).toEqual({ equipped: true, itemId: "iegwwsarycqwoezj" });
  });

  it("carries the kit's own quantity, and omits it when it's the default 1", () => {
    const rows = kitContents(kit(WIZARD_KIT));
    // The Wizard's Kit packs 10 torches and 5 days of rations.
    expect(rows.find((r) => r.itemId === "snfogneawzopfzzl")?.quantity).toBe(10);
    expect(rows.find((r) => r.itemId === "manvtbznrwjmnrua")?.quantity).toBe(5);
    // A single bedroll stores no quantity at all (absent means 1).
    expect(rows.find((r) => r.itemId === "iegwwsarycqwoezj")).not.toHaveProperty("quantity");
  });

  it("packs a nested container as one row, without recursing into it", () => {
    const rows = kitContents(kit(WIZARD_KIT));
    // The Mess Kit is itself a container (plate/bowl/cup/fork/knife/spoon).
    // A player carries "a mess kit", not six pieces of cutlery.
    expect(rows.filter((r) => r.itemId === "Ueae6c2qqJJGpncA").length).toBe(1);
    expect(rows.some((r) => r.name === "Fork")).toBe(false);
  });

  it("snapshots an entry that resolves outside the items pack", () => {
    // The Vampire Slayer's Kit packs a Wooden Stake, which lives in the
    // weapons pack — `itemId` can't point at it, so it lands as mundane gear
    // carrying the pipeline's name/weight snapshot.
    const stake = kitContents(kit(VAMPIRE_SLAYER_KIT)).find((r) => r.name === "Wooden Stake");
    expect(stake).toEqual({ equipped: true, name: "Wooden Stake", weight: 1 });
  });
});

describe("addKit", () => {
  it("appends the contents and not the kit itself (no double-counted weight)", () => {
    const doc = addKit(createEmptyDoc("t"), WIZARD_KIT, ref);
    expect(doc.build.gear.length).toBe(13);
    expect(doc.build.gear.some((g) => g.itemId === WIZARD_KIT)).toBe(false);
  });

  it("appends to existing gear rather than replacing it", () => {
    const withRope = { ...createEmptyDoc("t") };
    withRope.build.gear = [{ equipped: true, name: "Rope" }];
    const doc = addKit(withRope, WIZARD_KIT, ref);
    expect(doc.build.gear.length).toBe(14);
    expect(doc.build.gear[0]!.name).toBe("Rope");
  });

  it("stacks a second copy instead of deduplicating", () => {
    const once = addKit(createEmptyDoc("t"), WIZARD_KIT, ref);
    expect(addKit(once, WIZARD_KIT, ref).build.gear.length).toBe(26);
  });

  it("is a no-op for an unknown id or a non-kit item", () => {
    const base = createEmptyDoc("t");
    expect(addKit(base, "nope", ref)).toBe(base);
    expect(addKit(base, "iegwwsarycqwoezj", ref)).toBe(base);
  });

  it("does not mutate the input doc", () => {
    const base = createEmptyDoc("t");
    addKit(base, WIZARD_KIT, ref);
    expect(base.build.gear.length).toBe(0);
  });
});
