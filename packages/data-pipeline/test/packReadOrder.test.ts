/**
 * Pack reads must be machine-independent. `readdirSync` hands back whatever
 * order the filesystem stored, and pack order decides real content: a
 * container item's `contents` list keeps source order, and name-keyed lookups
 * let the last writer win. Unsorted, a CI regeneration and a laptop
 * regeneration of the same pinned SHA disagree — which is how the vendored
 * `Secret-Keeper` trait went missing and `Brastlewark Businessman (Gnome)`
 * appeared to change id.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import { readPack } from "../src/util/packs.js";

describe("readPack ordering", () => {
  it("reads a pack in a stable order regardless of write order", () => {
    const dir = mkdtempSync(join(tmpdir(), "pack-order-"));
    mkdirSync(join(dir, "sub"));
    // Written back-to-front, and across a subdirectory, so filesystem order
    // has every chance to disagree with the order the walk should produce.
    for (const [rel, id] of [
      ["zulu.yaml", "z"],
      ["sub/mike.yaml", "m"],
      ["alpha.yaml", "a"],
    ] as const) {
      writeFileSync(join(dir, rel), `_id: "${id}"\nname: ${id}\ntype: feat\n`);
    }

    expect(readPack(dir).map((pf) => pf.doc._id)).toEqual(["a", "m", "z"]);
  });
});
